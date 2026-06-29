package com.stocktrading.trading.repository;

import com.stocktrading.trading.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserEmailOrderByCreatedAtDesc(String userEmail);
}
