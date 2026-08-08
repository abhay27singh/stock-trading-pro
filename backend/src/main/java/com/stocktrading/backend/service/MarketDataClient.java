package com.stocktrading.backend.service;

import com.stocktrading.backend.config.RestClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Thin client over the Python market-data service (yfinance-backed).
 * Keeps all "where does real price data come from" knowledge in one place,
 * so the rest of the backend depends on this abstraction, not on yfinance.
 */
@Service
public class MarketDataClient {

    private final RestTemplate restTemplate = RestClients.withTimeouts();

    @Value("${prediction.service.url}")
    private String baseUrl;

    /** Batch quotes for the given symbols. Returns [] if the service is down. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getQuotes(List<String> symbols) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of("symbols", symbols);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    baseUrl + "/market/quotes", entity, Map.class);

            Map<String, Object> respBody = resp.getBody();
            if (respBody == null) return List.of();
            Object quotes = respBody.get("quotes");
            return quotes instanceof List ? (List<Map<String, Object>>) quotes : List.of();

        } catch (Exception e) {
            System.err.println("[MarketDataClient] getQuotes failed: " + e.getMessage());
            return List.of();
        }
    }

    /** Market open/closed status. Returns a CLOSED fallback if the service is down. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getMarketStatus() {
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(baseUrl + "/market/status", Map.class);
            Map<String, Object> body = resp.getBody();
            if (body != null) return body;
        } catch (Exception e) {
            System.err.println("[MarketDataClient] getMarketStatus failed: " + e.getMessage());
        }
        return Map.of("isOpen", false, "status", "CLOSED");
    }

    /** OHLCV candles for charting. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getHistory(String symbol, String period, String interval) {
        try {
            String url = String.format("%s/market/history/%s?period=%s&interval=%s",
                    baseUrl, symbol, period, interval);
            ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> respBody = resp.getBody();
            if (respBody == null) return List.of();
            Object candles = respBody.get("candles");
            return candles instanceof List ? (List<Map<String, Object>>) candles : List.of();
        } catch (Exception e) {
            System.err.println("[MarketDataClient] getHistory failed for " + symbol + ": " + e.getMessage());
            return List.of();
        }
    }
}
