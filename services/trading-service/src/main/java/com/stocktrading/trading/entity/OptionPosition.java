package com.stocktrading.trading.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * An open option position (a bought Call or Put). Decoupled like the rest of
 * trading: owner = email, underlying = symbol. Premium is what was PAID per unit;
 * quantity = number of contracts (1 contract = 1 unit here, kept simple).
 */
@Entity
@Table(name = "option_positions",
       indexes = @Index(name = "idx_option_user", columnList = "user_email"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptionPosition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false)
    private OptionType optionType;

    @Column(precision = 10, scale = 2)
    private BigDecimal strike;

    @Column(name = "premium_paid", precision = 10, scale = 2)
    private BigDecimal premiumPaid;          // per-unit premium at purchase

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum OptionType { CALL, PUT }
}
