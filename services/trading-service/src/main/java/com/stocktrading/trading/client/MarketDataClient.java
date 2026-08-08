package com.stocktrading.trading.client;

import com.stocktrading.trading.config.RestClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Reads stock data from the Market-Data service (which owns prices).
 * The Trading service never touches the stocks table directly.
 */
@Service
public class MarketDataClient {

    private final RestTemplate restTemplate = RestClients.withTimeouts();

    @Value("${market.data.url}")
    private String marketDataUrl;

    public record Quote(String symbol, String companyName, BigDecimal price) {}

    /** Current quote for a symbol, or null if Market-Data doesn't know it. */
    @SuppressWarnings("unchecked")
    public Quote getQuote(String symbol) {
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(
                    marketDataUrl + "/api/stocks/" + symbol, Map.class);
            Map<String, Object> body = resp.getBody();
            if (body == null || body.get("currentPrice") == null) return null;
            return new Quote(
                    String.valueOf(body.get("symbol")),
                    body.get("companyName") == null ? symbol : String.valueOf(body.get("companyName")),
                    new BigDecimal(body.get("currentPrice").toString()));
        } catch (Exception e) {
            System.err.println("[MarketDataClient] getQuote failed for " + symbol + ": " + e.getMessage());
            return null;
        }
    }

    /** Authoritative option premium for one contract (priced server-side by Python). */
    @SuppressWarnings("unchecked")
    public BigDecimal getOptionPremium(String symbol, double strike, int days, String type) {
        try {
            String url = String.format("%s/api/options/quote/%s?strike=%s&days=%s&type=%s",
                    marketDataUrl, symbol, strike, days, type);
            ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = resp.getBody();
            if (body == null || body.get("premium") == null) return null;
            return new BigDecimal(body.get("premium").toString());
        } catch (Exception e) {
            System.err.println("[MarketDataClient] getOptionPremium failed for " + symbol + ": " + e.getMessage());
            return null;
        }
    }

    /** Number of stocks in the catalog (for admin stats). */
    @SuppressWarnings("unchecked")
    public int stockCount() {
        try {
            ResponseEntity<java.util.List> resp = restTemplate.getForEntity(
                    marketDataUrl + "/api/stocks", java.util.List.class);
            return resp.getBody() == null ? 0 : resp.getBody().size();
        } catch (Exception e) {
            return 0;
        }
    }
}
