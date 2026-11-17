package com.petcare.platform.branch.dto;

import com.petcare.platform.common.domain.BaseEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record BranchResponse(
        UUID id,
        String name,
        String address,
        String phone,
        String email,
        BigDecimal latitude,
        BigDecimal longitude,
        Boolean active,
        Instant createdAt,
        Instant updatedAt
) {}