package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.OptionPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OptionPositionRepository extends JpaRepository<OptionPosition, Long> {
    List<OptionPosition> findByUserEmail(String userEmail);
}
