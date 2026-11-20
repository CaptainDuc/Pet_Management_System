package com.petcare.platform.booking.domain;

import com.petcare.platform.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.JoinColumn;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "booking_items")
@Getter
@Setter
@NoArgsConstructor
public class BookingItem extends BaseEntity {

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "service_id", nullable = false)
    private UUID serviceId;

    @Column(name = "staff_id")
    private UUID staffId;

    @Column(name = "time_slot_id")
    private UUID timeSlotId;

    @ElementCollection
    @CollectionTable(name = "booking_item_slots", joinColumns = @JoinColumn(name = "booking_item_id"))
    @Column(name = "time_slot_id", nullable = false)
    private Set<UUID> reservedSlotIds = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    // Giá chụp lại tại thời điểm đặt
    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    private String notes;
}
