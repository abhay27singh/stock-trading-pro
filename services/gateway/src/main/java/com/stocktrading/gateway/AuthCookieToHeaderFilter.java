package com.stocktrading.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Bridges the httpOnly auth cookie to the Authorization header the downstream
 * resource servers expect. The browser holds the JWT in an httpOnly "token"
 * cookie (unreadable by JS, so an XSS payload cannot steal it); this filter
 * copies that value into "Authorization: Bearer ..." for the downstream request,
 * so the individual services need no cookie awareness and stay unchanged.
 */
@Component
public class AuthCookieToHeaderFilter implements GlobalFilter, Ordered {

    static final String TOKEN_COOKIE = "token";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest req = exchange.getRequest();

        // An explicit Authorization header always wins (service-to-service calls, tests).
        if (req.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
            return chain.filter(exchange);
        }

        HttpCookie cookie = req.getCookies().getFirst(TOKEN_COOKIE);
        if (cookie == null || cookie.getValue().isBlank()) {
            return chain.filter(exchange);
        }

        ServerHttpRequest mutated = req.mutate()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + cookie.getValue())
                .build();
        return chain.filter(exchange.mutate().request(mutated).build());
    }

    @Override
    public int getOrder() {
        return 1; // after CsrfOriginFilter (0), so a rejected request never gets a Bearer header
    }
}
