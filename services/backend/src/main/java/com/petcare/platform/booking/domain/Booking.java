package com.petcare.platform.booking.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
public class Booking extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "pet_id", nullable = false)
    private UUID petId;

    @Column(name = "branch_id")
    private UUID branchId;

    @Column(name = "promotion_id")
    private UUID promotionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "payment_order_code", length = 50)
    private String paymentOrderCode;

    @Column(name = "staff_note", columnDefinition = "text")
    private String staffNote;

    @Column(name = "staff_note_at")
    private Instant staffNoteAt;

    private String notes;
}