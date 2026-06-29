package com.stocktrading.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Central activity log. Every request through the gateway is logged with a short
 * correlation id (X-Request-Id) that is forwarded to the downstream service — so
 * you can grep that id across logs/gateway.log + logs/<service>.log to trace one
 * request end-to-end. This is the first place to look when something breaks.
 */
@Component
public class LoggingGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger("GATEWAY");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest req = exchange.getRequest();
        String id = req.getHeaders().getFirst("X-Request-Id");
        if (id == null || id.isBlank()) id = UUID.randomUUID().toString().substring(0, 8);
        final String reqId = id;

        // forward the id downstream so each service tags its logs with the same id
        ServerHttpRequest mutated = req.mutate().header("X-Request-Id", reqId).build();
        long start = System.currentTimeMillis();
        log.info("→ {} {} [{}]", req.getMethod(), req.getURI().getPath(), reqId);

        return chain.filter(exchange.mutate().request(mutated).build()).doFinally(sig -> {
            long ms = System.currentTimeMillis() - start;
            var sc = exchange.getResponse().getStatusCode();
            log.info("← {} {} {} ({}ms) [{}]",
                    sc != null ? sc.value() : "?", req.getMethod(), req.getURI().getPath(), ms, reqId);
        });
    }

    @Override
    public int getOrder() {
        return -1; // run early so we time the whole request
    }
}
