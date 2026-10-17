package com.petcare.platform.rbac.dto;

import com.petcare.platform.rbac.domain.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Schema(description = "Role details response")
public record RoleResponse(
        UUID id,
        String name,
        String description,
        Set<PermissionResponse> permissions,
        Instant createdAt
) {
    public static RoleResponse from(Role role) {
        Set<PermissionResponse> permResponses = role.getPermissions() != null
                ? role.getPermissions().stream().map(PermissionResponse::from).collect(Collectors.toSet())
                : Set.of();

        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                permResponses,
                role.getCreatedAt()
        );
    }
}
