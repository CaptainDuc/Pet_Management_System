package com.petcare.platform.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;
import java.util.UUID;

@Schema(description = "Assign roles payload")
public record AssignRolesRequest(
        @NotEmpty(message = "Role IDs set cannot be empty")
        @Schema(description = "Set of Role UUIDs to assign")
        Set<UUID> roleIds
) {}
