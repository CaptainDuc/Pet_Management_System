package com.petcare.platform.booking.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BookingItemRequest(
        @NotNull UUID serviceId,
        @NotNull UUID timeSlotId,
        UUID staffId,
        String notes
) {}