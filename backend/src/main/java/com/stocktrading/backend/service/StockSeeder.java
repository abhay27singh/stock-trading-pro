package com.stocktrading.backend.service;

import com.stocktrading.backend.entity.Stock;
import com.stocktrading.backend.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Ensures the real NSE universe exists in the DB on startup. Symbols here MUST
 * match the Python market-data universe (bare NSE symbols, no exchange suffix),
 * so live yfinance quotes can be matched back to these rows.
 */
@Component
@RequiredArgsConstructor
public class StockSeeder implements CommandLineRunner {

    private final StockRepository stockRepository;

    private static final Map<String, String> UNIVERSE = new LinkedHashMap<>() {{
        put("RELIANCE", "Reliance Industries Ltd");
        put("TCS", "Tata Consultancy Services Ltd");
        put("INFY", "Infosys Ltd");
        put("HDFCBANK", "HDFC Bank Ltd");
        put("ICICIBANK", "ICICI Bank Ltd");
        put("SBIN", "State Bank of India");
        put("BHARTIARTL", "Bharti Airtel Ltd");
        put("ITC", "ITC Ltd");
        put("LT", "Larsen & Toubro Ltd");
        put("WIPRO", "Wipro Ltd");
    }};

    @Override
    public void run(String... args) {
        UNIVERSE.forEach((symbol, name) -> {
            if (stockRepository.findBySymbol(symbol).isEmpty()) {
                Stock stock = new Stock();
                stock.setSymbol(symbol);
                stock.setCompanyName(name);
                stock.setCurrentPrice(BigDecimal.ZERO);  // filled on first poll
                stock.setPreviousPrice(BigDecimal.ZERO);
                stock.setChangePercent(BigDecimal.ZERO);
                stockRepository.save(stock);
                System.out.println("[StockSeeder] seeded " + symbol);
            }
        });
    }
}
