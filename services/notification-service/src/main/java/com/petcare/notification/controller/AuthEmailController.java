package com.petcare.notification.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthEmailController {
    private final JavaMailSender mailSender;
    @Value("${app.internal.api-key:petcare_internal_dev_key}") private String internalKey;
    @Value("${app.mail.from:no-reply@petcare.local}") private String from;

    public record AuthEmail(@NotBlank @Email @Size(max=255) String email,
                            @NotBlank @Pattern(regexp="REGISTER|RESET") String purpose,
                            @NotBlank @Pattern(regexp="[0-9]{6}") String code,
                            @Min(60) @Max(3600) int expiresInSeconds) {}

    @PostMapping("/internal/auth-email")
    public Map<String, Boolean> send(@RequestHeader(value="X-Internal-Key", required=false) String key,
                                     @Valid @RequestBody AuthEmail request) {
        if (key == null || !MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8), internalKey.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal API key");
        }
        boolean registering = "REGISTER".equals(request.purpose());
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(request.email());
        message.setSubject(registering ? "Pet Service - Mã xác nhận đăng ký" : "Pet Service - Mã đặt lại mật khẩu");
        message.setText("Xin chào,\n\nMã xác nhận " + (registering ? "đăng ký tài khoản" : "đặt lại mật khẩu")
                + " của bạn là: " + request.code() + "\n\nMã có hiệu lực trong " + request.expiresInSeconds()/60
                + " phút và chỉ dùng một lần. Không chia sẻ mã này với bất kỳ ai.\n"
                + "Nếu không yêu cầu thao tác này, bạn có thể bỏ qua email.\n\nPet Service");
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery unavailable");
        }
        return Map.of("success", true);
    }
}
