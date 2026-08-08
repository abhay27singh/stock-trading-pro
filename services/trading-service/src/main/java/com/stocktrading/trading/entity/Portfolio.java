package com.stocktrading.trading.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/**
 * A holding. Decoupled from other services: the owner is a plain email (from the
 * JWT) and the stock is a plain symbol — no foreign keys to users or stocks tables.
 */
@Entity
@Table(name = "portfolios",
       uniqueConstraints = @UniqueConstraint(name = "uk_portfolio_user_symbol", columnNames = {"user_email", "symbol"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Portfolio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String symbol;

    @Column(name = "company_name")
    private String companyName;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(name = "avg_buy_price", precision = 10, scale = 2)
    private BigDecimal avgBuyPrice = BigDecimal.ZERO;
}
