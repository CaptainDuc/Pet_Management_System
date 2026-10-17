package com.petcare.platform.loyalty.repository;

import com.petcare.platform.loyalty.domain.LoyaltyTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, UUID> {

    Page<LoyaltyTransaction> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);
}
