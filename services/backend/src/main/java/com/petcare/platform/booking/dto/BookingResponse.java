package com.petcare.platform.booking.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
        UUID id,
        UUID customerId,
        UUID petId,
        UUID branchId,
        UUID promotionId,
        String promotionCode,
        String status,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        String paymentStatus,
        String paymentMethod,
        Instant paidAt,
        String staffNote,
        String notes,
        List<ItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
    public record ItemResponse(
            UUID id,
            UUID serviceId,
            String serviceName,
            UUID staffId,
            String staffName,
            UUID preferredStaffId,
            String preferredStaffName,
            UUID scheduleId,
            UUID timeSlotId,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            String status,
            BigDecimal unitPrice,
            String notes
    ) {}
}
