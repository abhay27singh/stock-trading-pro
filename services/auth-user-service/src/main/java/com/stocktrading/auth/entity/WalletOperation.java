package com.stocktrading.auth.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ledger of wallet movements that have already been applied, keyed by the caller's
 * operation id.
 *
 * <p>The wallet lives in auth_db while trades live in trading_db, so a trade is a
 * dual write across two databases with no shared transaction. If the debit commits
 * here but the caller never sees the response (read timeout, dropped connection),
 * the caller must be able to retry without moving the money twice. The operation id
 * is the primary key, so a replayed request either finds an existing row (already
 * applied — return the balance, change nothing) or loses the insert race and rolls
 * back. Exactly-once, without a distributed transaction.
 */
@Entity
@Table(name = "wallet_operations")
@Data
public class WalletOperation {

    /** Caller-supplied id, stable across retries of the same logical operation. */
    @Id
    @Column(length = 64)
    private String operationId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 8)
    private String direction; // DEBIT | CREDIT

    @Column(nullable = false)
    private LocalDateTime appliedAt = LocalDateTime.now();
}
