package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    List<Watchlist> findByUserEmail(String userEmail);
    Optional<Watchlist> findByUserEmailAndSymbol(String userEmail, String symbol);
    void deleteByUserEmailAndSymbol(String userEmail, String symbol);
}
