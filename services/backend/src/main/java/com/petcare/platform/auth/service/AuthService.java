package com.petcare.platform.auth.service;

import com.petcare.platform.auth.domain.RefreshToken;
import com.petcare.platform.auth.dto.*;
import com.petcare.platform.auth.repository.RefreshTokenRepository;
import com.petcare.platform.common.exception.BusinessException;
import com.petcare.platform.common.security.JwtService;
import com.petcare.platform.common.security.UserPrincipal;
import com.petcare.platform.rbac.domain.Role;
import com.petcare.platform.rbac.repository.RoleRepository;
import com.petcare.platform.user.domain.User;
import com.petcare.platform.user.dto.UserResponse;
import com.petcare.platform.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${app.jwt.expiration:900000}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email is already registered");
        }
        if (request.phone() != null && !request.phone().isBlank() && userRepository.existsByPhone(request.phone())) {
            throw new BusinessException("Phone number is already registered");
        }

        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .phone(request.phone())
                .role("CUSTOMER")
                .status("ACTIVE")
                .build();

        // Assign default CUSTOMER role if present in RBAC table
        roleRepository.findByName("CUSTOMER").ifPresent(role -> user.setRoles(Set.of(role)));

        User savedUser = userRepository.save(user);

        return createAuthSession(savedUser, UUID.randomUUID());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BusinessException("User not found"));

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("Account is inactive or locked");
        }

        return createAuthSession(user, UUID.randomUUID());
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String rawToken = request.refreshToken();
        String tokenHash = hashToken(rawToken);

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BusinessException("Invalid refresh token"));

        if (refreshToken.isRevoked() || refreshToken.isExpired()) {
            // Replay detection: revoke entire token family
            if (refreshToken.getTokenFamilyId() != null) {
                refreshTokenRepository.revokeFamily(refreshToken.getTokenFamilyId(), Instant.now(), "Revoked due to token replay/reuse");
            }
            throw new BusinessException("Refresh token is expired or revoked. Please login again.");
        }

        User user = refreshToken.getUser();
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("User account is inactive");
        }

        // Revoke current token and create replacement in same family
        refreshToken.setRevokedAt(Instant.now());
        refreshToken.setRevokeReason("Rotated");
        refreshTokenRepository.save(refreshToken);

        return createAuthSession(user, refreshToken.getTokenFamilyId());
    }

    @Transactional
    public void logout(UUID currentUserId, LogoutRequest request) {
        if (request.logoutAll()) {
            refreshTokenRepository.revokeAllForUser(currentUserId, Instant.now(), "User requested logout all devices");
        } else if (request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String tokenHash = hashToken(request.refreshToken());
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevokedAt(Instant.now());
                token.setRevokeReason("User logout");
                refreshTokenRepository.save(token);
            });
        }
    }

    private AuthResponse createAuthSession(User user, UUID familyId) {
        UserPrincipal principal = UserPrincipal.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .status(user.getStatus())
                .build();

        Map<String, Object> extraClaims = Map.of(
                "typ", "access",
                "userId", user.getId().toString(),
                "role", user.getRole()
        );

        String accessToken = jwtService.generateToken(extraClaims, principal);

        Map<String, Object> refreshClaims = Map.of(
                "typ", "refresh",
                "familyId", familyId.toString()
        );
        String rawRefreshToken = jwtService.generateRefreshToken(principal);

        // Save hashed refresh token
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(rawRefreshToken))
                .tokenFamilyId(familyId)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpirationMs / 1000)
                .user(UserResponse.from(user))
                .build();
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
