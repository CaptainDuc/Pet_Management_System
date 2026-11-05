package com.petcare.platform.staff.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Schema(description = "Create a staff profile for an existing user")
public record CreateStaffRequest(
        @NotNull UUID userId,
        UUID branchId,
        @Size(max = 100) String position,
        String bio
) {}