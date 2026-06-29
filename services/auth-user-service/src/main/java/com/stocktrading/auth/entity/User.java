package com.stocktrading.auth.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * The canonical user, owned entirely by this service (auth_db).
 * No JPA relationships to trades/portfolio — those live in the Core service
 * and reference the user only by email (from the JWT). That's the decoupling.
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    private String password;

    @Column(nullable = false)
    private String role = "USER";

    private BigDecimal balance = BigDecimal.valueOf(100000);

    private LocalDateTime createdAt = LocalDateTime.now();
}
