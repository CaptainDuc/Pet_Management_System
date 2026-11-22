package com.petcare.platform.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Update user profile payload")
public record UpdateUserRequest(
        @Schema(description = "User full name") @Size(max=255) String fullName,
        @Schema(description = "User phone number") @Size(max=30) String phone,
        @Schema(description = "HTTP/HTTPS avatar URL or bounded JPEG thumbnail")
        @Size(max=350000, message="Ảnh đại diện quá lớn")
        @Pattern(regexp="^(https?://[^\\s]{1,493}|data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2})?$",
                message="Ảnh đại diện phải là đường dẫn HTTP/HTTPS hoặc ảnh JPEG hợp lệ") String avatarUrl
) {}
