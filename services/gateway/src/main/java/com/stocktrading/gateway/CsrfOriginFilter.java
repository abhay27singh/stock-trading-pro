package com.stocktrading.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Origin allowlist for state-changing requests — the CSRF defence for cookie auth.
 *
 * <p>While the JWT lived in localStorage an attacker page could not forge an
 * authenticated request, because it could not set the Authorization header. Now the
 * browser attaches the auth cookie automatically and {@link AuthCookieToHeaderFilter}
 * turns it into a Bearer header, so any page that can make the browser issue a request
 * to this gateway inherits the victim's session. {@code SameSite=Lax} does not close
 * this: it is site-scoped, and cookies ignore ports, so every {@code localhost:<port>}
 * in dev — and every sibling subdomain in production — counts as same-site.
 *
 * <p>Browsers send {@code Origin} on every state-changing request, including plain HTML
 * form posts (which are CORS "simple requests" and so are never preflighted). Rejecting
 * a non-allowlisted Origin therefore blocks the forged request while leaving the real
 * frontend untouched.
 *
 * <p>A missing Origin is allowed: non-browser clients (curl, service-to-service calls,
 * tests) do not send one, and they are not susceptible to CSRF because there are no
 * ambient cookies to ride on.
 */
@Component
public class CsrfOriginFilter implements GlobalFilter, Ordered {

    /** Methods that cannot change server state, so they need no Origin check. */
    private static final Set<HttpMethod> SAFE = Set.of(HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS);

    private final List<String> allowedOrigins;

    public CsrfOriginFilter(@Value("${cors.allowed-origins:http://localhost:3002}") String origins) {
        this.allowedOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        HttpMethod method = exchange.getRequest().getMethod();
        if (SAFE.contains(method)) {
            return chain.filter(exchange);
        }

        String origin = exchange.getRequest().getHeaders().getFirst(HttpHeaders.ORIGIN);
        if (origin == null) {
            // No Origin => not a browser-initiated cross-site request.
            return chain.filter(exchange);
        }
        if (allowedOrigins.contains(origin) || isSameHost(exchange, origin)) {
            return chain.filter(exchange);
        }

        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        return exchange.getResponse().setComplete();
    }

    /** Allow a request whose Origin is this gateway itself (e.g. Swagger UI, same-origin tools). */
    private boolean isSameHost(ServerWebExchange exchange, String origin) {
        try {
            URI o = URI.create(origin);
            URI self = exchange.getRequest().getURI();
            return o.getHost() != null
                    && o.getHost().equals(self.getHost())
                    && o.getPort() == self.getPort();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Override
    public int getOrder() {
        return 0; // after LoggingGlobalFilter (-1) so rejections are still logged
    }
}
