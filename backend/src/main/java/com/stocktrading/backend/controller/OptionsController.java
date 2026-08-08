package com.stocktrading.backend.controller;

import com.stocktrading.backend.config.RestClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Exposes the Python options engine (Black-Scholes + Binomial + Monte Carlo)
 * through the Market-Data service so the frontend reaches it via the gateway.
 * The maths itself lives in: python/options_pricing.py
 */
@RestController
@RequestMapping("/api/options")
public class OptionsController {

    private final RestTemplate restTemplate = RestClients.withTimeouts();

    @Value("${prediction.service.url}")
    private String pythonUrl;

    /** Options chain for a symbol: strikes around live spot with Call/Put prices. */
    @GetMapping("/chain/{symbol}")
    public ResponseEntity<?> chain(@PathVariable String symbol,
                                   @RequestParam(defaultValue = "30") int expiryDays) {
        String url = pythonUrl + "/options/chain/" + symbol + "?expiryDays=" + expiryDays;
        try {
            return ResponseEntity.ok(restTemplate.getForObject(url, Map.class));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Options service unavailable: " + e.getMessage()));
        }
    }

    /** Authoritative premium for one contract (used by the Trading service on buy/sell). */
    @GetMapping("/quote/{symbol}")
    public ResponseEntity<?> quote(@PathVariable String symbol,
                                   @RequestParam double strike,
                                   @RequestParam(defaultValue = "30") int days,
                                   @RequestParam(defaultValue = "call") String type) {
        String url = String.format("%s/options/quote/%s?strike=%s&days=%s&type=%s",
                pythonUrl, symbol, strike, days, type);
        try {
            return ResponseEntity.ok(restTemplate.getForObject(url, Map.class));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Options service unavailable: " + e.getMessage()));
        }
    }

    /** Price one option every way (Black-Scholes + Binomial + Monte Carlo) + Greeks. */
    @PostMapping("/price")
    public ResponseEntity<?> price(@RequestBody Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    pythonUrl + "/options/price", new HttpEntity<>(body, headers), Map.class);
            return ResponseEntity.ok(resp.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Options service unavailable: " + e.getMessage()));
        }
    }
}
