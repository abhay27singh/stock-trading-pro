package com.stocktrading.trading.service;

import com.stocktrading.trading.client.AuthServiceClient;
import com.stocktrading.trading.client.MarketDataClient;
import com.stocktrading.trading.dto.OptionOrderRequest;
import com.stocktrading.trading.entity.OptionPosition;
import com.stocktrading.trading.repository.OptionPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Options trading. Premiums are priced server-side by the Market-Data/Python
 * engine (Black-Scholes); the wallet (Auth service) is debited/credited.
 */
@Service
@RequiredArgsConstructor
public class OptionsService {

    private final OptionPositionRepository repository;
    private final MarketDataClient marketDataClient;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public String buy(String email, OptionOrderRequest req) {
        int qty = req.getQuantity() == null ? 1 : req.getQuantity();
        int days = req.getDays() == null ? 30 : req.getDays();
        String type = req.getType() == null ? "call" : req.getType().toLowerCase();

        BigDecimal premium = marketDataClient.getOptionPremium(req.getSymbol(), req.getStrike(), days, type);
        if (premium == null) throw new RuntimeException("Could not price this option");
        if (premium.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("Option premium is zero");

        BigDecimal cost = premium.multiply(BigDecimal.valueOf(qty));
        authServiceClient.debit(email, cost);   // Auth enforces sufficient balance

        OptionPosition p = new OptionPosition();
        p.setUserEmail(email);
        p.setSymbol(req.getSymbol().toUpperCase());
        p.setOptionType(type.equals("put") ? OptionPosition.OptionType.PUT : OptionPosition.OptionType.CALL);
        p.setStrike(BigDecimal.valueOf(req.getStrike()));
        p.setPremiumPaid(premium);
        p.setQuantity(qty);
        p.setExpiryDate(LocalDate.now().plusDays(days));
        repository.save(p);

        return String.format("Bought %d %s %s @ strike ₹%s for ₹%s premium each",
                qty, req.getSymbol().toUpperCase(), type.toUpperCase(), req.getStrike(), premium);
    }

    /** Positions enriched with the CURRENT premium and live P&L. */
    public List<Map<String, Object>> positions(String email) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (OptionPosition p : repository.findByUserEmail(email)) {
            int remaining = remainingDays(p);
            BigDecimal current = marketDataClient.getOptionPremium(
                    p.getSymbol(), p.getStrike().doubleValue(), remaining,
                    p.getOptionType().name().toLowerCase());
            if (current == null) current = p.getPremiumPaid();

            BigDecimal qty = BigDecimal.valueOf(p.getQuantity());
            BigDecimal invested = p.getPremiumPaid().multiply(qty);
            BigDecimal value = current.multiply(qty);
            BigDecimal pnl = value.subtract(invested);

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("symbol", p.getSymbol());
            m.put("optionType", p.getOptionType().name());
            m.put("strike", p.getStrike());
            m.put("quantity", p.getQuantity());
            m.put("premiumPaid", p.getPremiumPaid());
            m.put("currentPremium", current);
            m.put("invested", invested);
            m.put("currentValue", value);
            m.put("pnl", pnl);
            m.put("expiryDate", p.getExpiryDate());
            m.put("daysToExpiry", remaining);
            out.add(m);
        }
        return out;
    }

    @Transactional
    public String close(String email, Long id) {
        OptionPosition p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Position not found"));
        if (!p.getUserEmail().equals(email)) throw new RuntimeException("Not your position");

        int remaining = remainingDays(p);
        BigDecimal current = marketDataClient.getOptionPremium(
                p.getSymbol(), p.getStrike().doubleValue(), remaining,
                p.getOptionType().name().toLowerCase());
        if (current == null) current = BigDecimal.ZERO;

        BigDecimal proceeds = current.multiply(BigDecimal.valueOf(p.getQuantity()));
        authServiceClient.credit(email, proceeds);
        repository.delete(p);

        BigDecimal pnl = proceeds.subtract(p.getPremiumPaid().multiply(BigDecimal.valueOf(p.getQuantity())));
        return String.format("Closed %s %s for ₹%s (P&L ₹%s)",
                p.getSymbol(), p.getOptionType(), proceeds, pnl);
    }

    private int remainingDays(OptionPosition p) {
        long d = ChronoUnit.DAYS.between(LocalDate.now(), p.getExpiryDate());
        return (int) Math.max(0, d);
    }
}
