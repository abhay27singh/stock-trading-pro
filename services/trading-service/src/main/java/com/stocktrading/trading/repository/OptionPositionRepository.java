package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.OptionPosition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OptionPositionRepository extends JpaRepository<OptionPosition, Long> {
    List<OptionPosition> findByUserEmail(String userEmail);

    /** Positions whose expiry has passed and which therefore still need settling. */
    List<OptionPosition> findByExpiryDateBefore(LocalDate date);

    /** Row-locking read used by close() so two concurrent closes cannot double-credit. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OptionPosition p WHERE p.id = :id")
    Optional<OptionPosition> findByIdForUpdate(@Param("id") Long id);
}
