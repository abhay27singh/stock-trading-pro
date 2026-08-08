package com.stocktrading.trading.service;

import com.stocktrading.trading.client.AuthServiceClient;
import com.stocktrading.trading.client.MarketDataClient;
import com.stocktrading.trading.dto.TradeRequest;
import com.stocktrading.trading.entity.Portfolio;
import com.stocktrading.trading.entity.Transaction;
import com.stocktrading.trading.repository.PortfolioRepository;
import com.stocktrading.trading.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Orders are keyed by user email (JWT). Prices come from the Market-Data service,
 * the wallet from the Auth service — this service owns only the trading data.
 */
@Service
@RequiredArgsConstructor
public class TradeService {

    private final PortfolioRepository portfolioRepository;
    private final TransactionRepository transactionRepository;
    private final MarketDataClient marketDataClient;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public String executeTrade(String email, TradeRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be a positive integer");
        }

        MarketDataClient.Quote quote = marketDataClient.getQuote(request.getSymbol());
        if (quote == null) throw new RuntimeException("Stock not found");

        if (request.getType().equalsIgnoreCase("BUY")) {
            return buyStock(email, quote, request.getQuantity());
        } else if (request.getType().equalsIgnoreCase("SELL")) {
            return sellStock(email, quote, request.getQuantity());
        }
        throw new RuntimeException("Invalid trade type");
    }

    private String buyStock(String email, MarketDataClient.Quote q, Integer quantity) {
        BigDecimal totalCost = q.price().multiply(BigDecimal.valueOf(quantity));

        // row-locked read: concurrent trades on the same holding serialize here
        Portfolio p = portfolioRepository.findByUserEmailAndSymbolForUpdate(email, q.symbol())
                .orElse(new Portfolio());
        if (p.getId() == null) {
            p.setUserEmail(email);
            p.setSymbol(q.symbol());
            p.setCompanyName(q.companyName());
            p.setQuantity(0);
            p.setAvgBuyPrice(BigDecimal.ZERO);
        }
        BigDecimal existing = p.getAvgBuyPrice().multiply(BigDecimal.valueOf(p.getQuantity()));
        int newQty = p.getQuantity() + quantity;
        p.setAvgBuyPrice(existing.add(totalCost).divide(BigDecimal.valueOf(newQty), 2, RoundingMode.HALF_UP));
        p.setQuantity(newQty);
        portfolioRepository.save(p);
        saveTxn(email, q, Transaction.TransactionType.BUY, quantity, totalCost);

        // Money leaves the wallet LAST. If this remote debit throws (insufficient funds,
        // or wallet service down), the surrounding @Transactional rolls back the portfolio
        // + transaction rows above. The operation id makes the call idempotent, so a lost
        // response is retried rather than left ambiguous — see AuthServiceClient#post.
        authServiceClient.debit(email, totalCost, operationId()); // Auth enforces sufficient balance
        return "Successfully bought " + quantity + " shares of " + q.symbol();
    }

    private String sellStock(String email, MarketDataClient.Quote q, Integer quantity) {
        // row-locked read: concurrent trades on the same holding serialize here
        Portfolio p = portfolioRepository.findByUserEmailAndSymbolForUpdate(email, q.symbol())
                .orElseThrow(() -> new RuntimeException("You don't own this stock!"));
        if (p.getQuantity() < quantity) throw new RuntimeException("Insufficient shares!");

        BigDecimal proceeds = q.price().multiply(BigDecimal.valueOf(quantity));
        p.setQuantity(p.getQuantity() - quantity);
        if (p.getQuantity() == 0) portfolioRepository.delete(p);
        else portfolioRepository.save(p);
        saveTxn(email, q, Transaction.TransactionType.SELL, quantity, proceeds);

        // Pay the user LAST. If this remote credit throws, the share reduction +
        // transaction row above are rolled back, so a deterministic payout failure
        // won't reduce holdings without paying. Idempotent, as in buyStock.
        authServiceClient.credit(email, proceeds, operationId());
        return "Successfully sold " + quantity + " shares of " + q.symbol();
    }

    /**
     * One id per logical money movement, generated fresh per trade. It is deliberately
     * NOT derived from the trade contents: two identical trades a second apart are
     * distinct operations and must both apply. Its job is to make a RETRY of one call
     * safe, not to deduplicate user intent — concurrent double-submits are handled by
     * the pessimistic row lock above.
     */
    private static String operationId() {
        return UUID.randomUUID().toString();
    }

    private void saveTxn(String email, MarketDataClient.Quote q, Transaction.TransactionType type,
                         Integer quantity, BigDecimal total) {
        Transaction t = new Transaction();
        t.setUserEmail(email);
        t.setSymbol(q.symbol());
        t.setCompanyName(q.companyName());
        t.setType(type);
        t.setQuantity(quantity);
        t.setPrice(q.price());
        t.setTotal(total);
        transactionRepository.save(t);
    }

    public List<Portfolio> getPortfolio(String email) {
        return portfolioRepository.findByUserEmail(email);
    }

    public List<Transaction> getTransactionHistory(String email) {
        return transactionRepository.findByUserEmailOrderByCreatedAtDesc(email);
    }
}
