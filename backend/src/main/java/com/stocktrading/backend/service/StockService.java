package com.stocktrading.backend.service;

import com.stocktrading.backend.entity.Stock;
import com.stocktrading.backend.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockRepository stockRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final MarketDataClient marketDataClient;

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    public List<Stock> getAllStocks() {
        return stockRepository.findAll();
    }

    public Optional<Stock> getStockBySymbol(String symbol) {
        return stockRepository.findBySymbol(symbol);
    }

    /**
     * Pulls REAL quotes from the Python market-data service (yfinance) and
     * updates each stock, then broadcasts the change over WebSocket.
     * Replaces the previous random-walk simulation.
     */
    @Scheduled(fixedRateString = "${market.poll.rate}")
    public void updateStockPrices() {
        List<Stock> stocks = stockRepository.findAll();
        if (stocks.isEmpty()) return;

        List<String> symbols = stocks.stream().map(Stock::getSymbol).toList();
        List<Map<String, Object>> quotes = marketDataClient.getQuotes(symbols);
        if (quotes.isEmpty()) return; // service down or market closed — keep last prices

        boolean anyUpdated = false;

        // index quotes by symbol for quick lookup
        var bySymbol = quotes.stream()
                .filter(q -> q.get("symbol") != null)
                .collect(java.util.stream.Collectors.toMap(
                        q -> q.get("symbol").toString().toUpperCase(),
                        q -> q,
                        (a, b) -> a));

        for (Stock stock : stocks) {
            Map<String, Object> quote = bySymbol.get(stock.getSymbol().toUpperCase());
            if (quote == null) continue;

            try {
                BigDecimal newPrice = toBigDecimal(quote.get("currentPrice"));
                if (newPrice == null) continue;

                BigDecimal prevPrice = toBigDecimal(quote.get("previousPrice"));
                BigDecimal changePct = toBigDecimal(quote.get("changePercent"));

                stock.setPreviousPrice(prevPrice != null ? prevPrice : stock.getCurrentPrice());
                stock.setCurrentPrice(newPrice.setScale(2, RoundingMode.HALF_UP));
                stock.setChangePercent(changePct != null
                        ? changePct.setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
                stock.setUpdatedAt(LocalDateTime.now(IST));

                stockRepository.save(stock);
                anyUpdated = true;

                // per-symbol topic (for detail views)
                messagingTemplate.convertAndSend(
                        "/topic/stocks/" + stock.getSymbol(), stock);

            } catch (Exception e) {
                System.err.println("Failed to update: " + stock.getSymbol()
                        + " — " + e.getMessage());
            }
        }

        // single batch topic so the markets list can subscribe just once
        if (anyUpdated) {
            messagingTemplate.convertAndSend("/topic/stocks", stocks);
        }
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
