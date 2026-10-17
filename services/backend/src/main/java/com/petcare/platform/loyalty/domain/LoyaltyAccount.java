package com.petcare.platform.loyalty.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Maps {@code loyalty_accounts} from Core DB migration V1.
 *
 * <p>Replaces the previous {@code Loyalty} entity, which pointed at a
 * non-existent {@code loyalty} table.
 *
 * <p>Two limitations are documented rather than silently worked around:
 * {@code points} has no {@code CHECK (points >= 0)} yet (migration P-27), and
 * {@code tier} is a plain varchar with no {@code loyalty_tiers} table yet
 * (migration P-26), so it must not be treated as an enum.
 */
@Entity
@Table(name = "loyalty_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyAccount extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "points", nullable = false)
    private Long points;

    @Column(name = "tier", nullable = false)
    private String tier;
}