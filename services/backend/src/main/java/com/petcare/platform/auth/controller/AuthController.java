package com.petcare.platform.auth.controller;

import com.petcare.platform.auth.dto.*;
import com.petcare.platform.auth.service.AuthService;
import com.petcare.platform.auth.service.EmailCodeService;
import com.petcare.platform.common.dto.ApiResponse;
import com.petcare.platform.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user registration, login, refresh tokens, and logout")
public class AuthController {

    private final AuthService authService;
    private final EmailCodeService emailCodes;

    @PostMapping("/register")
    @Operation(summary = "Send email code; account is created only after verification")
    public ResponseEntity<ApiResponse<EmailChallengeResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.accepted().body(ApiResponse.ok(authService.register(request)));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyRegistration(@Valid @RequestBody VerifyEmailRequest request) {
        AuthResponse response = authService.verifyRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PostMapping("/register/resend")
    public ResponseEntity<ApiResponse<EmailChallengeResponse>> resend(@Valid @RequestBody EmailRequest request) {
        return ResponseEntity.accepted().body(ApiResponse.ok(emailCodes.resendRegistration(request.email())));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<ApiResponse<EmailChallengeResponse>> forgotPassword(@Valid @RequestBody EmailRequest request) {
        return ResponseEntity.accepted().body(ApiResponse.ok(authService.requestPasswordReset(request)));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user credentials and return JWT access/refresh token pair")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and get a new access + refresh token pair")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user and revoke refresh token or session family")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) LogoutRequest request
    ) {
        LogoutRequest logoutReq = request != null ? request : new LogoutRequest(null, false);
        authService.logout(principal != null ? principal.getId() : null, logoutReq);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
