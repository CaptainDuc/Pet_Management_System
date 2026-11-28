package com.petcare.platform.promotion.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record PromotionValidationRequest(
        @NotBlank(message = "code is required") String code,
        @NotNull(message = "bookingTotal is required")
        @DecimalMin(value = "0", message = "bookingTotal must not be negative") BigDecimal bookingTotal,
        UUID customerId
) {
}
