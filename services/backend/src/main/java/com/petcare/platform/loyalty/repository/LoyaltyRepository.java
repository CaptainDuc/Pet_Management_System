package com.petcare.platform.loyalty.repository;

import com.petcare.platform.loyalty.domain.Loyalty;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface LoyaltyRepository extends JpaRepository<Loyalty, UUID> {
    Optional<Loyalty> findByCustomerId(UUID customerId);
}
