package com.stocktrading.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Adds the standard protective response headers to everything the gateway returns.
 *
 * <p>Set here rather than in each service so the whole API answers consistently and a
 * new service cannot forget them.
 *
 * <p>Headers are added only if absent, so a downstream service that sets its own wins
 * and the browser never sees a duplicate (which it would treat as a conflict).
 */
@Component
public class SecurityHeadersFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        exchange.getResponse().beforeCommit(() -> {
            HttpHeaders h = exchange.getResponse().getHeaders();

            // Stop the browser second-guessing Content-Type: a JSON body that sniffs as
            // HTML would otherwise be a script-execution vector.
            h.putIfAbsent("X-Content-Type-Options", java.util.List.of("nosniff"));

            // The API is never meant to be framed, so refuse clickjacking outright.
            h.putIfAbsent("X-Frame-Options", java.util.List.of("DENY"));

            // Do not leak the path (which can carry ids) to third-party sites.
            h.putIfAbsent("Referrer-Policy", java.util.List.of("no-referrer"));

            // These are API responses, not documents: nothing should load or be loaded.
            h.putIfAbsent("Content-Security-Policy",
                    java.util.List.of("default-src 'none'; frame-ancestors 'none'"));

            // No reason for the API to be reachable from the page's device APIs.
            h.putIfAbsent("Permissions-Policy",
                    java.util.List.of("geolocation=(), microphone=(), camera=()"));

            // NOTE: Strict-Transport-Security is deliberately omitted. The stack is served
            // over plain HTTP on localhost, and sending HSTS would pin the browser to HTTPS
            // for all of localhost, breaking other local dev servers. Add it when this is
            // served over HTTPS behind a real domain.
            return Mono.empty();
        });
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
