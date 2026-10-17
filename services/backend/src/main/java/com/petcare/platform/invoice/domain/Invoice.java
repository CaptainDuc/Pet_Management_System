package com.petcare.platform.invoice.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Maps {@code invoices} from Core DB migration V1.
 *
 * <p>The table has no status column, no tax column and no
 * {@code payment_id} — the latter was dropped by
 * V2__extract_payment_and_notification.sql because payment state lives in the
 * Payment Service database. Adding those fields here would break
 * {@code spring.jpa.hibernate.ddl-auto: validate}; they arrive with migration
 * P-24.
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice extends BaseEntity {

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "invoice_number", nullable = false, unique = true)
    private String invoiceNumber;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;
}