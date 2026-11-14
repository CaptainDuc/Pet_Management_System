package com.petcare.platform.promotion.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "promotion_redemptions")
@Getter
@Setter
@NoArgsConstructor
public class PromotionRedemption extends BaseEntity {

    @Column(name = "promotion_id", nullable = false)
    private UUID promotionId;

    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RedemptionStatus status = RedemptionStatus.RESERVED;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "released_at")
    private Instant releasedAt;
}
