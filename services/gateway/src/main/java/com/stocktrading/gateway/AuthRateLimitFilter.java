package com.stocktrading.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-client rate limit on sign-in and sign-up.
 *
 * <p>Without it, nothing slows an attacker down: BCrypt makes each guess expensive for
 * the server but not for the attacker, and the login endpoint will happily answer
 * thousands of attempts a minute. Registration is limited too, so one client cannot
 * fill auth_db with junk accounts.
 *
 * <p>Deliberately in-memory and dependency-free. This is a single-instance local
 * deployment, so a shared store (Redis) would add an operational dependency for no gain
 * here. If this is ever run as more than one gateway instance, the limit becomes
 * per-instance and must move to a shared store.
 */
@Component
public class AuthRateLimitFilter implements GlobalFilter, Ordered {

    private final int maxAttempts;
    private final Duration window;

    /** Client key to recent attempt timestamps, oldest first. */
    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(
            @Value("${auth.ratelimit.max-attempts:10}") int maxAttempts,
            @Value("${auth.ratelimit.window-seconds:300}") long windowSeconds) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!isCredentialEndpoint(exchange)) {
            return chain.filter(exchange);
        }

        String client = clientKey(exchange);
        Instant now = Instant.now();

        boolean allowed;
        synchronized (attempts) {
            Deque<Instant> recent = attempts.computeIfAbsent(client, k -> new ArrayDeque<>());
            // Drop anything that has aged out of the window before counting.
            while (!recent.isEmpty() && recent.peekFirst().isBefore(now.minus(window))) {
                recent.pollFirst();
            }
            allowed = recent.size() < maxAttempts;
            if (allowed) {
                recent.addLast(now);
            } else if (recent.isEmpty()) {
                attempts.remove(client);   // keep the map from growing without bound
            }
        }

        if (allowed) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().add("Retry-After", String.valueOf(window.toSeconds()));
        return exchange.getResponse().setComplete();
    }

    /** Only the endpoints that accept credentials; everything else is already authenticated. */
    private boolean isCredentialEndpoint(ServerWebExchange exchange) {
        if (exchange.getRequest().getMethod() != HttpMethod.POST) return false;
        String path = exchange.getRequest().getURI().getPath();
        return path.equals("/api/auth/login") || path.equals("/api/auth/register");
    }

    private String clientKey(ServerWebExchange exchange) {
        InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
        return remote != null && remote.getAddress() != null
                ? remote.getAddress().getHostAddress()
                : "unknown";
    }

    @Override
    public int getOrder() {
        return -2; // before CsrfOriginFilter (0), so throttled requests do no further work
    }
}
