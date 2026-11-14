package com.petcare.platform.promotion.repository;

import com.petcare.platform.promotion.domain.PromotionRedemption;
import com.petcare.platform.promotion.domain.RedemptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PromotionRedemptionRepository extends JpaRepository<PromotionRedemption, UUID> {

    Optional<PromotionRedemption> findByBookingId(UUID bookingId);

    long countByPromotionIdAndStatus(UUID promotionId, RedemptionStatus status);
}
