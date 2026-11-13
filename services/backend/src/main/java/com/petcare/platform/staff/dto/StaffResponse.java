package com.petcare.platform.staff.dto;

import java.time.Instant;
import java.util.UUID;

public record StaffResponse(
        UUID id,
        UUID userId,
        UUID branchId,
        String position,
        String bio,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}