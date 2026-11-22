package com.petcare.platform.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank @Size(max=72) String currentPassword,
        @NotBlank @Size(min=6,max=72,message="Mật khẩu mới phải có từ 6 đến 72 ký tự") String newPassword,
        @NotBlank @Size(min=6,max=72) String confirmPassword
) {}
