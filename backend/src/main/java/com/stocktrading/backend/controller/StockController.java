package com.stocktrading.backend.controller;

import com.stocktrading.backend.entity.Stock;
import com.stocktrading.backend.service.MarketDataClient;
import com.stocktrading.backend.service.StockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
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