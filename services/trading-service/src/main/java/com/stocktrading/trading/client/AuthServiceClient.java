package com.stocktrading.trading.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Calls the Auth/User service (which owns the wallet + user records) over the
 * internal service-to-service channel.
 */
@Service
public class AuthServiceClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${auth.service.url}")
    private String authServiceUrl;

    @Value("${internal.api.key}")
    private String internalApiKey;

    private HttpHeaders headers() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("X-Internal-Key", internalApiKey);
        return h;
    }

    public void debit(String email, BigDecimal amount) {
        try {
            restTemplate.exchange(authServiceUrl + "/api/internal/users/" + email + "/debit",
                    HttpMethod.POST, new HttpEntity<>(Map.of("amount", amount), headers()), Map.class);
        } catch (HttpClientErrorException.BadRequest e) {
            throw new RuntimeException("Insufficient balance!");
        } catch (Exception e) {
            throw new RuntimeException("Wallet service unavailable: " + e.getMessage());
        }
    }

    public void credit(String email, BigDecimal amount) {
        try {
            restTemplate.exchange(authServiceUrl + "/api/internal/users/" + email + "/credit",
                    HttpMethod.POST, new HttpEntity<>(Map.of("amount", amount), headers()), Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Wallet service unavailable: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAllUsers() {
        ResponseEntity<List> resp = restTemplate.exchange(authServiceUrl + "/api/internal/admin/users",
                HttpMethod.GET, new HttpEntity<>(headers()), List.class);
        return resp.getBody() == null ? List.of() : resp.getBody();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSummary() {
        ResponseEntity<Map> resp = restTemplate.exchange(authServiceUrl + "/api/internal/admin/summary",
                HttpMethod.GET, new HttpEntity<>(headers()), Map.class);
        return resp.getBody() == null ? Map.of() : resp.getBody();
    }

    public void deleteUser(Long id) {
        restTemplate.exchange(authServiceUrl + "/api/internal/admin/users/" + id,
                HttpMethod.DELETE, new HttpEntity<>(headers()), Map.class);
    }
}
