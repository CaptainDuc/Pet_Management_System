package com.petcare.platform.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Login request payload")
public record LoginRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Schema(description = "User email", example = "customer@petcare.vn")
        String email,

        @NotBlank(message = "Password is required")
        @Schema(description = "User password", example = "SecureP@ss1")
        String password
) {}
