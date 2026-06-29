package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    List<Portfolio> findByUserEmail(String userEmail);
    Optional<Portfolio> findByUserEmailAndSymbol(String userEmail, String symbol);
}
