package com.stocktrading.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.util.*;

@Service
public class PredictionService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${prediction.service.url}")
    private String baseUrl;

    public Map<String, Object> getPrediction(String symbol, List<Double> prices, Double buyPrice) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("symbol", symbol);
            requestBody.put("prices", prices);
            requestBody.put("buyPrice", buyPrice);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    baseUrl + "/predict", entity, Map.class
            );

            return response.getBody();

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Prediction service unavailable: " + e.getMessage());
            return error;
        }
    }
}