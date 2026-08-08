package com.stocktrading.auth.controller;

import com.stocktrading.auth.entity.User;
import com.stocktrading.auth.entity.WalletOperation;
import com.stocktrading.auth.repository.UserRepository;
import com.stocktrading.auth.repository.WalletOperationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Service-to-service wallet operations, called by the Core service when a trade
 * executes (the wallet lives here, in auth_db). Protected by a shared internal
 * key rather than a user JWT, since the caller is another service, not a user.
 */
@RestController
@RequestMapping("/api/internal/users")
@RequiredArgsConstructor
public class InternalWalletController {

    private final UserRepository userRepository;
    private final WalletOperationRepository operationRepository;

    @Value("${internal.api.key}")
    private String internalApiKey;

    private boolean unauthorized(String key) {
        return key == null || !key.equals(internalApiKey);
    }

    @GetMapping("/{email}/balance")
    public ResponseEntity<?> getBalance(@PathVariable String email,
                                        @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return userRepository.findByEmail(email)
                .map(u -> ResponseEntity.ok(Map.of("balance", u.getBalance())))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{email}/debit")
    @Transactional
    public ResponseEntity<?> debit(@PathVariable String email,
                                   @RequestBody Map<String, Object> body,
                                   @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        BigDecimal amount = amountOf(body);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
        }

        String operationId = operationIdOf(body);
        if (operationId != null && operationRepository.existsById(operationId)) {
            return ResponseEntity.ok(Map.of("balance", balanceOf(email), "duplicate", true));
        }

        // Bulk UPDATE returns 0 both when the user is missing and when the balance is
        // too low, so disambiguate only on failure — the happy path stays at one write.
        int updated = userRepository.debitBalance(email, amount);
        if (updated == 0) {
            return Boolean.TRUE.equals(userRepository.existsByEmail(email))
                    ? ResponseEntity.badRequest().body(Map.of("error", "Insufficient balance"))
                    : ResponseEntity.notFound().build();
        }
        recordOperation(operationId, email, amount, "DEBIT");
        return ResponseEntity.ok(Map.of("balance", balanceOf(email)));
    }

    @PostMapping("/{email}/credit")
    @Transactional
    public ResponseEntity<?> credit(@PathVariable String email,
                                    @RequestBody Map<String, Object> body,
                                    @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        BigDecimal amount = amountOf(body);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Amount must be positive"));
        }

        String operationId = operationIdOf(body);
        if (operationId != null && operationRepository.existsById(operationId)) {
            return ResponseEntity.ok(Map.of("balance", balanceOf(email), "duplicate", true));
        }

        int updated = userRepository.creditBalance(email, amount);
        if (updated == 0) return ResponseEntity.notFound().build();
        recordOperation(operationId, email, amount, "CREDIT");
        return ResponseEntity.ok(Map.of("balance", balanceOf(email)));
    }

    /**
     * Writes the idempotency record in the same transaction as the balance change, and
     * flushes so a concurrent replay of the same operation id loses the primary-key race
     * here (rolling its balance change back) instead of applying the money twice.
     */
    private void recordOperation(String operationId, String email, BigDecimal amount, String direction) {
        if (operationId == null) return;   // caller opted out of idempotency
        WalletOperation op = new WalletOperation();
        op.setOperationId(operationId);
        op.setEmail(email);
        op.setAmount(amount);
        op.setDirection(direction);
        operationRepository.saveAndFlush(op);
    }

    private BigDecimal balanceOf(String email) {
        return userRepository.findByEmail(email).map(User::getBalance).orElse(BigDecimal.ZERO);
    }

    private static BigDecimal amountOf(Map<String, Object> body) {
        Object raw = body.get("amount");
        return raw instanceof Number n ? BigDecimal.valueOf(n.doubleValue()) : BigDecimal.ZERO;
    }

    private static String operationIdOf(Map<String, Object> body) {
        Object raw = body.get("operationId");
        return raw instanceof String s && !s.isBlank() ? s : null;
    }
}
