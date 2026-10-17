package com.petcare.platform.audit.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Maps {@code audit_logs} from Core DB migration V1.
 *
 * <p>The previous entity used {@code username}, {@code details} and
 * {@code timestamp}, none of which exist in the table; the real columns are
 * {@code user_id}, {@code entity_type}/{@code entity_id} and
 * {@code old_value}/{@code new_value} JSONB pairs.
 *
 * <p>Append-only: the table has no {@code updated_at} and no {@code version}, so
 * this entity deliberately does not extend {@code BaseEntity} and is never
 * updated or deleted.
 */
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_value", columnDefinition = "jsonb")
    private String oldValue;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_value", columnDefinition = "jsonb")
    private String newValue;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}