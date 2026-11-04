package com.petcare.platform.servicecatalog.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceResponse(
        UUID id,
        UUID categoryId,
        String name,
        String description,
        BigDecimal basePrice,
        int durationMinutes,
        boolean isActive
) {}