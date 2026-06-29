package com.stocktrading.backend.logging;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Logs every unhandled exception (with the correlation id + stack trace) so a
 * failure is never silent — then returns the message as the response body, which
 * keeps the existing frontend error display working.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger("ERROR");

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntime(RuntimeException ex, HttpServletRequest req) {
        String msg = ex.getMessage() == null ? "Request failed" : ex.getMessage();
        log.warn("Business error on {} {} [{}]: {}", req.getMethod(), req.getRequestURI(),
                MDC.get("requestId"), msg);
        return ResponseEntity.badRequest().body(msg);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleAll(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception on {} {} [{}]", req.getMethod(), req.getRequestURI(),
                MDC.get("requestId"), ex);   // full stack trace
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Internal error — see server logs (requestId " + MDC.get("requestId") + ")");
    }
}
