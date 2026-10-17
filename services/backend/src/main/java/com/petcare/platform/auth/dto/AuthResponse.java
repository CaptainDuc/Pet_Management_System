package com.petcare.platform.auth.dto;

import com.petcare.platform.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Authentication response payload")
public record AuthResponse(
        @Schema(description = "JWT Access Token") String accessToken,
        @Schema(description = "JWT Refresh Token") String refreshToken,
        @Schema(description = "Token type", example = "Bearer") String tokenType,
        @Schema(description = "Expiration in seconds", example = "900") long expiresIn,
        @Schema(description = "Authenticated user profile") UserResponse user
) {}
