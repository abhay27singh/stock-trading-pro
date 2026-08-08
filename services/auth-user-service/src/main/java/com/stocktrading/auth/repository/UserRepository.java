package com.stocktrading.auth.repository;

import com.stocktrading.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);

    // clearAutomatically: bulk UPDATE bypasses the persistence context, so any
    // User loaded earlier in the transaction would otherwise be read back stale.
    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.balance = u.balance - :amount WHERE u.email = :email AND u.balance >= :amount")
    int debitBalance(@Param("email") String email, @Param("amount") BigDecimal amount);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.balance = u.balance + :amount WHERE u.email = :email")
    int creditBalance(@Param("email") String email, @Param("amount") BigDecimal amount);
}
