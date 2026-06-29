package com.stocktrading.auth.controller;

import com.stocktrading.auth.entity.User;
import com.stocktrading.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * Admin user-management, exposed to the Core service (which owns the Admin UI)
 * over the internal service-to-service channel. The user records live here.
 */
@RestController
@RequestMapping("/api/internal/admin")
@RequiredArgsConstructor
public class InternalAdminController {

    private final UserRepository userRepository;

    @Value("${internal.api.key}")
    private String internalApiKey;

    private boolean unauthorized(String key) {
        return key == null || !key.equals(internalApiKey);
    }

    @GetMapping("/users")
    public ResponseEntity<?> users(@RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : userRepository.findAll()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("balance", u.getBalance());
            m.put("createdAt", u.getCreatedAt());
            out.add(m);
        }
        return ResponseEntity.ok(out);
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(@RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        List<User> users = userRepository.findAll();
        BigDecimal totalBalance = users.stream()
                .map(User::getBalance).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(Map.of(
                "totalUsers", users.size(),
                "totalUserBalance", totalBalance));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id,
                                        @RequestHeader(value = "X-Internal-Key", required = false) String key) {
        if (unauthorized(key)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        if ("ADMIN".equals(user.getRole())) {
            return ResponseEntity.badRequest().body("Cannot delete an admin user");
        }
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "User " + user.getName() + " deleted",
                "email", user.getEmail()));
    }
}
