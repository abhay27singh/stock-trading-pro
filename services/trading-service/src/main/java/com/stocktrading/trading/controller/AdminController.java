package com.stocktrading.trading.controller;

import com.stocktrading.trading.client.AuthServiceClient;
import com.stocktrading.trading.client.MarketDataClient;
import com.stocktrading.trading.entity.Transaction;
import com.stocktrading.trading.repository.PortfolioRepository;
import com.stocktrading.trading.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Admin aggregator (non-stock). Trades are local; user data comes from Auth;
 * the stock count comes from Market-Data. Stock CRUD lives in the Market-Data
 * service at /api/admin/stocks (routed there by the gateway).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final TransactionRepository transactionRepository;
    private final PortfolioRepository portfolioRepository;
    private final AuthServiceClient authServiceClient;
    private final MarketDataClient marketDataClient;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        List<Transaction> txns = transactionRepository.findAll();
        Map<String, Object> userSummary = authServiceClient.getSummary();

        stats.put("totalUsers", userSummary.getOrDefault("totalUsers", 0));
        stats.put("totalUserBalance", userSummary.getOrDefault("totalUserBalance", 0));
        stats.put("totalStocks", marketDataClient.stockCount());
        stats.put("totalTransactions", txns.size());

        stats.put("totalVolume", txns.stream()
                .map(Transaction::getTotal).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        stats.put("buyCount", txns.stream().filter(t -> t.getType() == Transaction.TransactionType.BUY).count());
        stats.put("sellCount", txns.stream().filter(t -> t.getType() == Transaction.TransactionType.SELL).count());

        Map<String, Long> bySymbol = new HashMap<>();
        for (Transaction t : txns) bySymbol.merge(t.getSymbol(), 1L, Long::sum);
        stats.put("mostTradedStock", bySymbol.entrySet().stream()
                .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("N/A"));

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = authServiceClient.getAllUsers();
        for (Map<String, Object> u : users) {
            String email = String.valueOf(u.get("email"));
            u.put("portfolioCount", portfolioRepository.findByUserEmail(email).size());
        }
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        authServiceClient.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @GetMapping("/trades")
    public ResponseEntity<List<Transaction>> getAllTrades() {
        List<Transaction> txns = transactionRepository.findAll();
        txns.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        return ResponseEntity.ok(txns);
    }
}
