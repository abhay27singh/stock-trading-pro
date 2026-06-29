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
        authServiceClient.debit(email, totalCost); // Auth enforces sufficient balance

        Portfolio p = portfolioRepository.findByUserEmailAndSymbol(email, q.symbol())
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
        return "Successfully bought " + quantity + " shares of " + q.symbol();
    }

    private String sellStock(String email, MarketDataClient.Quote q, Integer quantity) {
        Portfolio p = portfolioRepository.findByUserEmailAndSymbol(email, q.symbol())
                .orElseThrow(() -> new RuntimeException("You don't own this stock!"));
        if (p.getQuantity() < quantity) throw new RuntimeException("Insufficient shares!");

        BigDecimal proceeds = q.price().multiply(BigDecimal.valueOf(quantity));
        p.setQuantity(p.getQuantity() - quantity);
        if (p.getQuantity() == 0) portfolioRepository.delete(p);
        else portfolioRepository.save(p);

        authServiceClient.credit(email, proceeds);
        saveTxn(email, q, Transaction.TransactionType.SELL, quantity, proceeds);
        return "Successfully sold " + quantity + " shares of " + q.symbol();
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
