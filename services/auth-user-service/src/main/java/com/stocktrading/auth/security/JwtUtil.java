package com.stocktrading.auth.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/**
 * Issues JWTs. The Core service validates these with the same shared secret.
 * The role is embedded as a claim so resource servers can authorize without a DB.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email)
                .claims(Map.of("role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                // pin HS256 explicitly so the resource-server decoder matches
                // (otherwise JJWT picks HS384 for a 48+ byte key)
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }
}
