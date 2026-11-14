package com.petcare.payment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable reconciliation ledger. A SePay callback is stored even when the
 * transfer reference matches no order ({@code orderId == null}) so finance can
 * investigate it later.
 */
@Entity
@Table(name = "payment_transactions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "transaction_type", nullable = false, length = 30)
    private String transactionType;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_transaction_id", length = 255)
    private String providerTransactionId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 255)
    private String idempotencyKey;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "sepay_transaction_id")
    private Long sepayTransactionId;

    @Column(name = "amount_in", precision = 14, scale = 2)
    private BigDecimal amountIn;

    @Column(columnDefinition = "text")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb")
    private String rawPayload;
}
