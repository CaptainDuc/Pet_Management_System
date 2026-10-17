package com.petcare.platform.rbac.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Create role payload")
public record CreateRoleRequest(
        @NotBlank(message = "Role name is required")
        @Schema(description = "Role name", example = "VETERINARIAN")
        String name,

        @Schema(description = "Role description")
        String description
) {}
