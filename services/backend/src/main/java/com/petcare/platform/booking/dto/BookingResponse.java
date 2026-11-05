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
        String status,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
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
            UUID timeSlotId,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            String status,
            BigDecimal unitPrice,
            String notes
    ) {}
}