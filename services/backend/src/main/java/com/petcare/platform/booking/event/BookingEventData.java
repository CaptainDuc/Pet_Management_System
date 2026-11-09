package com.petcare.platform.booking.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record BookingEventData(
        UUID bookingId,
        UUID customerId,
        UUID petId,
        String status,
        BigDecimal totalAmount,
        OffsetDateTime startTime,
        List<String> serviceNames,
        String reason
) {}