package com.stocktrading.trading.service;

import com.stocktrading.trading.client.AuthServiceClient;
import com.stocktrading.trading.client.MarketDataClient;
import com.stocktrading.trading.dto.OptionOrderRequest;
import com.stocktrading.trading.entity.OptionPosition;
import com.stocktrading.trading.repository.OptionPositionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(OptionsService.class);

    /** Longest tenor a paper position may be opened for (2 years). */
    static final int MAX_DAYS_TO_EXPIRY = 730;

    private final OptionPositionRepository repository;
    private final MarketDataClient marketDataClient;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public String buy(String email, OptionOrderRequest req) {
        if (req.getSymbol() == null || req.getSymbol().isBlank()) throw new IllegalArgumentException("Symbol is required");
        if (req.getStrike() == null || req.getStrike() <= 0) throw new IllegalArgumentException("Strike must be a positive number");
        int qty = req.getQuantity() == null ? 1 : req.getQuantity();
        if (qty <= 0) throw new IllegalArgumentException("Quantity must be a positive integer");
        int days = req.getDays() == null ? 30 : req.getDays();
        // Must be bounded like every other order field. days <= 0 makes Black-Scholes
        // take its T<=0 branch and return pure intrinsic value — an option with a real
        // payoff priced at zero time value, i.e. free leverage. Negative days would also
        // create a position whose expiryDate is already in the past.
        if (days <= 0) throw new IllegalArgumentException("Days to expiry must be a positive integer");
        if (days > MAX_DAYS_TO_EXPIRY)
            throw new IllegalArgumentException("Days to expiry cannot exceed " + MAX_DAYS_TO_EXPIRY);
        String type = req.getType() == null ? "call" : req.getType().toLowerCase();

        BigDecimal premium = marketDataClient.getOptionPremium(req.getSymbol(), req.getStrike(), days, type);
        if (premium == null) throw new RuntimeException("Could not price this option");
        if (premium.compareTo(BigDecimal.ZERO) <= 0) throw new RuntimeException("Option premium is zero");

        BigDecimal cost = premium.multiply(BigDecimal.valueOf(qty));

        OptionPosition p = new OptionPosition();
        p.setUserEmail(email);
        p.setSymbol(req.getSymbol().toUpperCase());
        p.setOptionType(type.equals("put") ? OptionPosition.OptionType.PUT : OptionPosition.OptionType.CALL);
        p.setStrike(BigDecimal.valueOf(req.getStrike()));
        p.setPremiumPaid(premium);
        p.setQuantity(qty);
        p.setExpiryDate(LocalDate.now().plusDays(days));
        repository.save(p);

        // Debit LAST: a failed debit rolls back the position saved above.
        authServiceClient.debit(email, cost, UUID.randomUUID().toString());
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
        // Lock the row for the life of the transaction. Without this, two concurrent
        // closes (a double-click) both read the position, both mark it deleted, and both
        // issue a wallet credit — the second only fails at flush time, by which point its
        // credit has already committed in auth_db. Mirrors TradeService's FOR UPDATE read.
        OptionPosition p = repository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Position not found"));
        if (!p.getUserEmail().equals(email)) throw new RuntimeException("Not your position");

        int remaining = remainingDays(p);
        BigDecimal current = marketDataClient.getOptionPremium(
                p.getSymbol(), p.getStrike().doubleValue(), remaining,
                p.getOptionType().name().toLowerCase());
        // null means the pricing call FAILED (timeout, service down) — not that the option
        // is worthless. Defaulting to zero here would delete the position and skip the
        // payout while still returning 200. Fail the request instead so nothing is lost.
        if (current == null) throw new RuntimeException("Could not price this option right now — try again");

        BigDecimal proceeds = current.multiply(BigDecimal.valueOf(p.getQuantity()));
        BigDecimal pnl = proceeds.subtract(p.getPremiumPaid().multiply(BigDecimal.valueOf(p.getQuantity())));
        repository.delete(p);

        // Pay the user LAST: if the credit throws, the position delete is rolled back,
        // so a deterministic payout failure won't leave the position both closed and
        // unpaid (or re-closable). Residual dual-write window applies — see TradeService.
        if (proceeds.compareTo(BigDecimal.ZERO) > 0) {
            authServiceClient.credit(email, proceeds, UUID.randomUUID().toString());
        }
        return String.format("Closed %s %s for ₹%s (P&L ₹%s)",
                p.getSymbol(), p.getOptionType(), proceeds, pnl);
    }

    /** Ids of positions whose expiry has passed and which still need settling. */
    public List<Long> expiredPositionIds() {
        return repository.findByExpiryDateBefore(LocalDate.now())
                .stream().map(OptionPosition::getId).toList();
    }

    /**
     * Settles one expired position at intrinsic value and removes it.
     *
     * <p>Without this, {@link #remainingDays} clamps to 0 forever and an expired option
     * keeps being repriced against today's spot — so a cheap 1-day call would behave as
     * a perpetual option with unlimited upside and no carry. At expiry an option is worth
     * exactly its intrinsic value, so that is what we pay.
     *
     * <p>The settlement price is the spot at the time this runs, not at the expiry
     * instant. The sweep runs daily, so the two are at most a day apart — acceptable for
     * paper trading, and noted here because it is a real approximation.
     *
     * <p>Runs in its own transaction per position: one unpriceable symbol must not block
     * settlement of everything else.
     */
    @Transactional
    public void settleExpired(Long id) {
        OptionPosition p = repository.findByIdForUpdate(id).orElse(null);
        if (p == null) return;                                   // closed by the user first
        if (!p.getExpiryDate().isBefore(LocalDate.now())) return; // not actually expired

        MarketDataClient.Quote quote = marketDataClient.getQuote(p.getSymbol());
        if (quote == null || quote.price() == null) {
            // Leave it for the next sweep rather than settling at a made-up price.
            log.warn("Cannot settle expired position {} ({}): no market price", id, p.getSymbol());
            return;
        }

        BigDecimal intrinsic = p.getOptionType() == OptionPosition.OptionType.CALL
                ? quote.price().subtract(p.getStrike())
                : p.getStrike().subtract(quote.price());
        if (intrinsic.compareTo(BigDecimal.ZERO) < 0) intrinsic = BigDecimal.ZERO;

        BigDecimal proceeds = intrinsic.multiply(BigDecimal.valueOf(p.getQuantity()));
        repository.delete(p);
        if (proceeds.compareTo(BigDecimal.ZERO) > 0) {
            authServiceClient.credit(p.getUserEmail(), proceeds, UUID.randomUUID().toString());
        }
        log.info("Settled expired {} {} (id {}) for ₹{}", p.getSymbol(), p.getOptionType(), id, proceeds);
    }

    private int remainingDays(OptionPosition p) {
        long d = ChronoUnit.DAYS.between(LocalDate.now(), p.getExpiryDate());
        return (int) Math.max(0, d);
    }
}
