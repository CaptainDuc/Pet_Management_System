package com.petcare.platform.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Update user profile payload")
public record UpdateUserRequest(
        @Schema(description = "User full name") String fullName,
        @Schema(description = "User phone number") String phone,
        @Schema(description = "User avatar URL") String avatarUrl
) {}
