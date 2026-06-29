package com.stocktrading.auth.controller;

import com.stocktrading.auth.entity.User;
import com.stocktrading.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> debit(@PathVariable String email,
                                   @RequestBody Map<String, Double> body,
                                   @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        BigDecimal amount = BigDecimal.valueOf(body.getOrDefault("amount", 0.0));

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (user.getBalance().compareTo(amount) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Insufficient balance"));
        }
        user.setBalance(user.getBalance().subtract(amount));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("balance", user.getBalance()));
    }

    @PostMapping("/{email}/credit")
    public ResponseEntity<?> credit(@PathVariable String email,
                                    @RequestBody Map<String, Double> body,
                                    @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        BigDecimal amount = BigDecimal.valueOf(body.getOrDefault("amount", 0.0));

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        user.setBalance(user.getBalance().add(amount));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("balance", user.getBalance()));
    }
}
