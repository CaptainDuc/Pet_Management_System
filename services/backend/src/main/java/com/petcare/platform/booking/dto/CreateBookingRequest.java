package com.petcare.platform.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

@Schema(description = "Create a booking; each item takes exactly one time slot")
public record CreateBookingRequest(
        @NotNull UUID petId,
        UUID branchId,
        String notes,
        @NotEmpty @Valid List<BookingItemRequest> items
) {}