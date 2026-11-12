package com.stocktrading.auth.logging;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Logs every unhandled exception with the correlation id; returns the message. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger("ERROR");

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntime(RuntimeException ex, HttpServletRequest req) {
        // Only intentional business errors (bare RuntimeException / IllegalArgumentException)
        // are echoed to the client. Other runtime types (NPE, ClassCastException, third-party
        // errors) may embed internal detail, so those get a generic message.
        boolean clientSafe = ex.getClass() == RuntimeException.class
                || ex instanceof IllegalArgumentException;
        String msg = (clientSafe && ex.getMessage() != null) ? ex.getMessage() : "Request failed";
        log.warn("Business error on {} {} [{}]: {}", req.getMethod(), req.getRequestURI(),
                MDC.get("requestId"), ex.getMessage());
        return ResponseEntity.badRequest().body(msg);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<String> handleConflict(Exception ex, HttpServletRequest req) {
        // users.email is the only unique constraint in this service, so a violation
        // here means a duplicate registration raced past the existsByEmail check.
        log.warn("Constraint conflict on {} {} [{}]: {}", req.getMethod(), req.getRequestURI(),
                MDC.get("requestId"), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body("Email already exists!");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAll(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception on {} {} [{}]", req.getMethod(), req.getRequestURI(),
                MDC.get("requestId"), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Internal error: see server logs (requestId " + MDC.get("requestId") + ")");
    }
}
