package com.stocktrading.trading.client;

import com.stocktrading.trading.config.RestClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
    /** One contract to price, as sent to the batch endpoint. */
    public record ContractKey(String symbol, double strike, int days, String type) {}

    /**
     * Premiums for many contracts in one round trip.
     *
     * <p>Rendering the positions list used to call {@link #getOptionPremium} once per
     * position, so ten positions meant ten sequential HTTP calls to Market-Data and ten
     * more from there to the pricing engine. This sends the whole list at once.
     *
     * <p>Returns a list positionally matching {@code contracts}; an entry is null when
     * that contract could not be priced. On a transport failure every entry is null, so
     * callers degrade exactly as they did when a single call failed.
     */
    @SuppressWarnings("unchecked")
    public List<BigDecimal> getOptionPremiums(List<ContractKey> contracts) {
        if (contracts.isEmpty()) return List.of();

        List<Map<String, Object>> payload = new ArrayList<>(contracts.size());
        for (ContractKey c : contracts) {
            payload.add(Map.of("symbol", c.symbol(), "strike", c.strike(),
                    "days", c.days(), "type", c.type()));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    marketDataUrl + "/api/options/quote-batch",
                    new HttpEntity<>(Map.of("contracts", payload), headers), Map.class);

            Map<String, Object> body = resp.getBody();
            Object raw = body == null ? null : body.get("results");
            if (!(raw instanceof List<?> results) || results.size() != contracts.size()) {
                return nulls(contracts.size());
            }

            List<BigDecimal> out = new ArrayList<>(contracts.size());
            for (Object item : results) {
                Object premium = item instanceof Map<?, ?> m ? m.get("premium") : null;
                out.add(premium == null ? null : new BigDecimal(premium.toString()));
            }
            return out;
        } catch (Exception e) {
            System.err.println("[MarketDataClient] getOptionPremiums failed: " + e.getMessage());
            return nulls(contracts.size());
        }
    }

    private static List<BigDecimal> nulls(int size) {
        return new ArrayList<>(Collections.nCopies(size, null));
    }

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
