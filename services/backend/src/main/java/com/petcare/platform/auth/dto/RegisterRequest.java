package com.petcare.platform.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Registration request payload")
public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Schema(description = "User full name", example = "Nguyễn Minh Anh")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Schema(description = "User email address", example = "customer@petcare.vn")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        @Schema(description = "User password", example = "SecureP@ss1")
        String password,

        @Schema(description = "User phone number", example = "0901234567")
        String phone
) {}
