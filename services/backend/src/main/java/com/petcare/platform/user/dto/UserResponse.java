package com.petcare.platform.user.dto;

import com.petcare.platform.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Builder
@Schema(description = "User details response")
public record UserResponse(
        UUID id,
        String email,
        String fullName,
        String phone,
        String avatarUrl,
        String role,
        String status,
        Set<String> roles,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet())
                : Set.of();

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .status(user.getStatus())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
