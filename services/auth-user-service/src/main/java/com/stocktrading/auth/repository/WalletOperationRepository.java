package com.stocktrading.auth.repository;

import com.stocktrading.auth.entity.WalletOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WalletOperationRepository extends JpaRepository<WalletOperation, String> {
}
