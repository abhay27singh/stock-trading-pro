package com.stocktrading.backend.controller;

import com.stocktrading.backend.entity.PriceHistory;
import com.stocktrading.backend.entity.Stock;
import com.stocktrading.backend.repository.PriceHistoryRepository;
import com.stocktrading.backend.service.MarketDataClient;
import com.stocktrading.backend.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneOffset;
import java.util.*;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final PriceHistoryRepository priceHistoryRepository;
    private final MarketDataClient marketDataClient;

    @GetMapping
    public ResponseEntity<List<Stock>> getAllStocks() {
        return ResponseEntity.ok(stockService.getAllStocks());
    }

    @GetMapping("/market-status")
    public ResponseEntity<Map<String, Object>> getMarketStatus() {
        return ResponseEntity.ok(marketDataClient.getMarketStatus());
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<Stock> getStock(@PathVariable String symbol) {
        return stockService.getStockBySymbol(symbol)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ✅ FIXED FOR CHART
    @GetMapping("/{symbol}/history")
    public ResponseEntity<List<Map<String, Object>>> getPriceHistory(
            @PathVariable String symbol) {

        List<PriceHistory> history = priceHistoryRepository
                .findByStockSymbolOrderByRecordedAtAsc(symbol);

        List<Map<String, Object>> response = history.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();

            long epoch = p.getRecordedAt().toEpochSecond(ZoneOffset.UTC);

            map.put("time", epoch);
            map.put("price", p.getPrice());

            return map;
        }).toList();

        return ResponseEntity.ok(response);
    }

    // Real intraday OHLCV candles proxied from Python/yfinance
    @GetMapping("/{symbol}/ohlcv")
    public ResponseEntity<List<Map<String, Object>>> getOhlcv(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String period,
            @RequestParam(defaultValue = "5m") String interval) {
        List<Map<String, Object>> candles = marketDataClient.getHistory(symbol, period, interval);
        return ResponseEntity.ok(candles);
    }
}