package com.petcare.platform.rbac.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Create permission payload")
public record CreatePermissionRequest(
        @NotBlank(message = "Permission code is required")
        @Schema(description = "Permission code", example = "medical:create")
        String code,

        @NotBlank(message = "Permission name is required")
        @Schema(description = "Permission display name", example = "Tạo hồ sơ bệnh án")
        String name,

        @Schema(description = "Module name", example = "medical")
        String module,

        @Schema(description = "Permission description")
        String description
) {}
