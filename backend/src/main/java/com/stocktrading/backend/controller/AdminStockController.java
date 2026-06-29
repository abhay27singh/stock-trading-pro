package com.stocktrading.backend.controller;

import com.stocktrading.backend.entity.Stock;
import com.stocktrading.backend.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Admin stock management — lives in the Market-Data service (which owns stocks).
 * Reached via the gateway route /api/admin/stocks/** (ADMIN role required).
 */
@RestController
@RequestMapping("/api/admin/stocks")
@RequiredArgsConstructor
public class AdminStockController {

    private final StockRepository stockRepository;

    @GetMapping
    public ResponseEntity<List<Stock>> getAllStocks() {
        return ResponseEntity.ok(stockRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> addStock(@RequestBody Map<String, Object> body) {
        String symbol = (String) body.get("symbol");
        String companyName = (String) body.get("companyName");
        double price = ((Number) body.get("currentPrice")).doubleValue();

        if (symbol == null || companyName == null || price <= 0) {
            return ResponseEntity.badRequest().body("Missing required fields");
        }
        if (stockRepository.findBySymbol(symbol).isPresent()) {
            return ResponseEntity.badRequest().body("Stock symbol already exists");
        }

        Stock stock = new Stock();
        stock.setSymbol(symbol);
        stock.setCompanyName(companyName);
        stock.setCurrentPrice(BigDecimal.valueOf(price));
        stock.setPreviousPrice(BigDecimal.valueOf(price));
        stock.setChangePercent(BigDecimal.ZERO);
        stockRepository.save(stock);
        return ResponseEntity.ok(stock);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateStock(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Stock stock = stockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock not found"));
        if (body.containsKey("companyName")) stock.setCompanyName((String) body.get("companyName"));
        if (body.containsKey("currentPrice")) {
            double price = ((Number) body.get("currentPrice")).doubleValue();
            stock.setPreviousPrice(stock.getCurrentPrice());
            stock.setCurrentPrice(BigDecimal.valueOf(price));
        }
        stockRepository.save(stock);
        return ResponseEntity.ok(stock);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStock(@PathVariable Long id) {
        if (!stockRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Stock not found");
        }
        stockRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Stock deleted successfully"));
    }
}
