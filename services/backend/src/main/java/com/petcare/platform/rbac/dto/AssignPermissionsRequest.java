package com.petcare.platform.rbac.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;
import java.util.UUID;

@Schema(description = "Assign permissions payload")
public record AssignPermissionsRequest(
        @NotEmpty(message = "Permission IDs set cannot be empty")
        @Schema(description = "Set of Permission UUIDs to assign to role")
        Set<UUID> permissionIds
) {}
