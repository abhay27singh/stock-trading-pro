package com.stocktrading.trading.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "watchlist")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Watchlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String symbol;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "added_at")
    private LocalDateTime addedAt = LocalDateTime.now();
}
