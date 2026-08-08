package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.Portfolio;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findByUserEmail(String userEmail);
    Optional<Portfolio> findByUserEmailAndSymbol(String userEmail, String symbol);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Portfolio p WHERE p.userEmail = :email AND p.symbol = :symbol")
    Optional<Portfolio> findByUserEmailAndSymbolForUpdate(@Param("email") String email, @Param("symbol") String symbol);
}
