package com.petcare.platform.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Logout request payload")
public record LogoutRequest(
        @Schema(description = "Refresh token to revoke")
        String refreshToken,

        @Schema(description = "Revoke all sessions for this user across devices", example = "false")
        boolean logoutAll
) {}
