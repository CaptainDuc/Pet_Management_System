package com.petcare.platform.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "User status update payload")
public record UserStatusUpdateRequest(
        @NotBlank(message = "Status is required")
        @Schema(description = "Account status (ACTIVE, INACTIVE, LOCKED)", example = "ACTIVE")
        String status
) {}
