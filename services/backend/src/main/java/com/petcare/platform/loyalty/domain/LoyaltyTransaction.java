package com.petcare.platform.loyalty.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Maps {@code loyalty_transactions} from Core DB migration V1.
 *
 * <p>Append-only ledger: no {@code updated_at} and no {@code version}, so this
 * entity deliberately does not extend {@code BaseEntity} and exposes no setters
 * for the recorded values.
 *
 * <p>{@code points} is signed — REDEEM rows are negative so that the sum matches
 * {@code loyalty_accounts.points}. {@code type} has no CHECK constraint yet
 * (migration P-27).
 */
@Entity
@Table(name = "loyalty_transactions")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "points", nullable = false)
    private Long points;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}