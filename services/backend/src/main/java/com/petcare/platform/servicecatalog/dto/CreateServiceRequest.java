package com.petcare.platform.servicecatalog.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "Create or update a service")
public record CreateServiceRequest(
        @NotBlank String name,
        UUID categoryId,
        String description,
        @NotNull @DecimalMin(value = "0", message = "basePrice must not be negative") BigDecimal basePrice,
        @NotNull @Min(value = 5, message = "durationMinutes must be at least 5") Integer durationMinutes
) {}