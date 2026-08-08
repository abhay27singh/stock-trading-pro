package com.stocktrading.backend.controller;

import com.stocktrading.backend.service.PredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/predict")
public class PredictionController {

    @Autowired
    private PredictionService predictionService;

    @PostMapping("/{symbol}")
    public ResponseEntity<?> predict(
            @PathVariable String symbol,
            @RequestBody Map<String, Object> body) {

        Object raw = body.get("prices");
        if (!(raw instanceof List) || ((List<?>) raw).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "prices (non-empty array) is required"));
        }
        List<Double> prices = ((List<?>) raw).stream()
                .filter(p -> p instanceof Number)
                .map(p -> ((Number) p).doubleValue())
                .toList();
        if (prices.size() < 3) {
            return ResponseEntity.badRequest().body(Map.of("error", "Need at least 3 numeric price points"));
        }
        Double buyPrice = body.get("buyPrice") instanceof Number n ? n.doubleValue() : prices.get(0);

        Map<String, Object> result = predictionService.getPrediction(symbol, prices, buyPrice);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> test() {
        List<Double> testPrices = Arrays.asList(3200.0, 3220.0, 3195.0, 3240.0, 3260.0, 3245.0, 3270.0);
        Map<String, Object> result = predictionService.getPrediction("TCS.BSE", testPrices, 3200.0);
        return ResponseEntity.ok(result);
    }
}
