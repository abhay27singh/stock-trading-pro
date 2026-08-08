package com.stocktrading.trading.client;

import com.stocktrading.trading.config.RestClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
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

    private static final Logger log = LoggerFactory.getLogger(AuthServiceClient.class);

    private final RestTemplate restTemplate = RestClients.withTimeouts();

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

    /**
     * @param operationId stable id for this logical money movement. It is what makes the
     *                    retry below safe: the wallet applies a given id at most once, so
     *                    a retry after an ambiguous timeout either completes the original
     *                    operation or is recognised as a duplicate and changes nothing.
     */
    public void debit(String email, BigDecimal amount, String operationId) {
        try {
            post(email, "debit", amount, operationId);
        } catch (HttpClientErrorException.BadRequest e) {
            throw new RuntimeException("Insufficient balance!");
        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Wallet rejected debit: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Wallet debit failed for {} (op {})", email, operationId, e);
            throw walletUnavailable();
        }
    }

    public void credit(String email, BigDecimal amount, String operationId) {
        try {
            post(email, "credit", amount, operationId);
        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Wallet rejected credit: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Wallet credit failed for {} (op {})", email, operationId, e);
            throw walletUnavailable();
        }
    }

    /**
     * Posts the wallet operation, retrying ONCE on a transport failure.
     *
     * <p>A read timeout is ambiguous — the debit may well have committed and only the
     * response was lost. Without a retry that window ends with the money moved and the
     * trade rolled back. With the operation id, retrying is free of double-spend risk:
     * the wallet either applies it (first attempt never landed) or reports it as a
     * duplicate. Only if BOTH attempts fail do we surface an error, and the logged
     * operation id then identifies exactly what to reconcile.
     */
    private void post(String email, String action, BigDecimal amount, String operationId) {
        String url = authServiceUrl + "/api/internal/users/" + email + "/" + action;
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                Map.of("amount", amount, "operationId", operationId), headers());
        try {
            restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
        } catch (ResourceAccessException transportFailure) {
            log.warn("Wallet {} timed out for {} (op {}) — retrying once", action, email, operationId);
            restTemplate.exchange(url, HttpMethod.POST, request, Map.class);
        }
    }

    /**
     * Deliberately opaque. GlobalExceptionHandler treats a bare RuntimeException as
     * client-safe and echoes its message to the browser, and a transport failure's
     * message embeds the internal service URL and the user's email.
     */
    private static RuntimeException walletUnavailable() {
        return new RuntimeException("Wallet service unavailable — please try again");
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
