package com.stocktrading.trading.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/** Logs every request + response, tagged with the gateway correlation id (MDC). */
@Component
@Order(1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("REQUEST");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = req.getHeader("X-Request-Id");
        if (id == null || id.isBlank()) id = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", id);

        // Tag the line with who made the request, so one user's problem can be traced
        // across services by grepping their email. Spring Security's chain runs ahead of
        // this filter (order -100), so the authentication is already resolved here.
        // Falls back to "anon" for the endpoints that are reachable without a session.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String user = (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
        MDC.put("user", (user == null || "anonymousUser".equals(user)) ? "anon" : user);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            long ms = System.currentTimeMillis() - start;
            log.info("{} {} -> {} ({}ms)", req.getMethod(), req.getRequestURI(), res.getStatus(), ms);
            MDC.clear();
        }
    }
}
