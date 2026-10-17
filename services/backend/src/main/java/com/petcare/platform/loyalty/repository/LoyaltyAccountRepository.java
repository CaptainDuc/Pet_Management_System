package com.petcare.platform.loyalty.repository;

import com.petcare.platform.loyalty.domain.LoyaltyAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, UUID> {

    Optional<LoyaltyAccount> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
}
