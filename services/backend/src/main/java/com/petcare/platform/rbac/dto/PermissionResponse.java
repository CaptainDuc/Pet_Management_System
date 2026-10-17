package com.petcare.platform.rbac.dto;

import com.petcare.platform.rbac.domain.Permission;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Permission details response")
public record PermissionResponse(
        UUID id,
        String code,
        String name,
        String module,
        String description,
        Instant createdAt
) {
    public static PermissionResponse from(Permission permission) {
        return new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getName(),
                permission.getModule(),
                permission.getDescription(),
                permission.getCreatedAt()
        );
    }
}
