package com.petcare.platform.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @jakarta.validation.constraints.NotNull java.util.UUID challengeId,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "[0-9]{6}", message = "Mã xác nhận phải có 6 chữ số") String code,
        @NotBlank @Size(min = 6, max = 72, message = "Mật khẩu phải có từ 6 đến 72 ký tự") String newPassword
) {}
