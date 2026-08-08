package com.stocktrading.auth.controller;

import com.stocktrading.auth.dto.AuthRequest;
import com.stocktrading.auth.dto.AuthResponse;
import com.stocktrading.auth.dto.RegisterRequest;
import com.stocktrading.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    public static final String TOKEN_COOKIE = "token";

    private final AuthService authService;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return withAuthCookie(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        return withAuthCookie(authService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie cleared = ResponseCookie.from(TOKEN_COOKIE, "")
                .httpOnly(true).path("/").sameSite("Lax").maxAge(0).build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cleared.toString())
                .build();
    }

    /**
     * Puts the JWT in an httpOnly cookie (so browser JavaScript — and therefore any
     * XSS payload — cannot read it) and strips it from the JSON body. The remaining
     * body fields (email/name/role/balance) are non-sensitive and drive the UI.
     * Note: add {@code .secure(true)} once the stack is served over HTTPS.
     */
    private ResponseEntity<AuthResponse> withAuthCookie(AuthResponse resp) {
        ResponseCookie cookie = ResponseCookie.from(TOKEN_COOKIE, resp.getToken())
                .httpOnly(true).path("/").sameSite("Lax")
                .maxAge(Duration.ofMillis(jwtExpirationMs))
                .build();
        resp.setToken(null); // never expose the raw token to JavaScript
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(resp);
    }
}
