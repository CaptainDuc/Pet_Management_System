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
    private final RefreshTokenRevocationService revocationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailCodeService emailCodes;

    @Value("${app.jwt.expiration:900000}")
    private long jwtExpirationMs;

    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    @Transactional
    public EmailChallengeResponse register(RegisterRequest request) {
        String email = EmailCodeService.normalize(request.email());
        checkRegistrationAvailable(email, request.phone());
        validatePassword(request.password());
        return emailCodes.issue(email, "REGISTER", new EmailCodeService.Draft(
                request.fullName().strip(), passwordEncoder.encode(request.password()), cleanPhone(request.phone())));
    }

    private void checkRegistrationAvailable(String email, String phone) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("Email is already registered");
        }
        if (phone != null && !phone.isBlank() && userRepository.existsByPhone(phone.strip())) {
            throw new BusinessException("Phone number is already registered");
        }
    }

    private String cleanPhone(String phone) { return phone == null || phone.isBlank() ? null : phone.strip(); }

    private void validatePassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException("Mật khẩu quá dài. Vui lòng dùng tối đa 72 byte UTF-8.");
        }
    }

    @Transactional(noRollbackFor = InvalidEmailCodeException.class)
    public AuthResponse verifyRegistration(VerifyEmailRequest request) {
        String email = EmailCodeService.normalize(request.email());
        EmailCodeService.Draft draft = emailCodes.consume(email, "REGISTER", request.challengeId(), request.code());
        checkRegistrationAvailable(email, draft.phone());

        User user = User.builder()
                .fullName(draft.fullName())
                .email(email)
                .password(draft.passwordHash())
                .phone(draft.phone())
                .role("CUSTOMER")
                .status("ACTIVE")
                .build();

        // Assign default CUSTOMER role if present in RBAC table
        roleRepository.findByName("CUSTOMER").ifPresent(role -> user.setRoles(Set.of(role)));

        User savedUser = userRepository.save(user);

        return createAuthSession(savedUser, UUID.randomUUID());
    }

    @Transactional
    public EmailChallengeResponse requestPasswordReset(EmailRequest request) {
        String email = EmailCodeService.normalize(request.email());
        User user = userRepository.findByEmailIgnoreCase(email).filter(u -> "ACTIVE".equals(u.getStatus())).orElse(null);
        return emailCodes.issue(email, "RESET", user == null ? null
                : new EmailCodeService.Draft(null, user.getPassword(), null));
    }

    @Transactional(noRollbackFor = InvalidEmailCodeException.class)
    public void resetPassword(ResetPasswordRequest request) {
        validatePassword(request.newPassword());
        String email = EmailCodeService.normalize(request.email());
        EmailCodeService.Draft draft = emailCodes.consume(email, "RESET", request.challengeId(), request.code());
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(InvalidEmailCodeException::new);
        if (!"ACTIVE".equals(user.getStatus()) || !user.getPassword().equals(draft.passwordHash())) {
            throw new InvalidEmailCodeException();
        }
        replacePassword(user, request.newPassword(), "Password reset");
    }

    @Transactional
    public AuthResponse changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new BusinessException("User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BusinessException("Mật khẩu hiện tại không chính xác.");
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new BusinessException("Mật khẩu xác nhận không khớp với mật khẩu mới.");
        }
        validatePassword(request.newPassword());
        replacePassword(user, request.newPassword(), "Password changed");
        // Re-authentication keeps this browser signed in; older sessions are revoked.
        return createAuthSession(user, UUID.randomUUID());
    }

    private void replacePassword(User user, String password, String reason) {
        user.setPassword(passwordEncoder.encode(password));
        user.setCredentialVersion(user.getCredentialVersion() + 1);
        userRepository.saveAndFlush(user);
        refreshTokenRepository.revokeAllForUser(user.getId(), Instant.now(), reason);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(EmailCodeService.normalize(request.email()), request.password())
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
            // Replay detection. Must commit even though this method then throws and
            // rolls back, otherwise the family stays usable.
            revocationService.revokeFamily(refreshToken.getTokenFamilyId(), "Revoked due to token replay/reuse");
            throw new BusinessException("Refresh token is expired or revoked. Please login again.");
        }

        User user = refreshToken.getUser();
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BusinessException("User account is inactive");
        }

        // Revoke current token and create replacement in same family.
        // last_used_at records that this token really was redeemed, which is what
        // distinguishes a legitimate rotation from a replay.
        refreshToken.setRevokedAt(Instant.now());
        refreshToken.setRevokeReason("Rotated");
        refreshToken.setLastUsedAt(Instant.now());
        refreshTokenRepository.save(refreshToken);

        return createAuthSession(user, refreshToken.getTokenFamilyId());
    }

    @Transactional
    public void logout(UUID currentUserId, LogoutRequest request) {
        if (request.logoutAll()) {
            revocationService.revokeAllForUser(currentUserId, "User requested logout all devices");
        } else if (request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String tokenHash = hashToken(request.refreshToken());
            refreshTokenRepository.findByTokenHash(tokenHash)
                    .ifPresent(token -> revocationService.revoke(token.getId(), "User logout"));
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
                "role", user.getRole(),
                "ver", user.getCredentialVersion()
        );

        String accessToken = jwtService.generateToken(extraClaims, principal);

        // familyId ties every token in a rotation chain together so that reuse of an
        // already-rotated token can revoke the whole family.
        Map<String, Object> refreshClaims = Map.of("familyId", familyId.toString());
        String rawRefreshToken = jwtService.generateRefreshToken(principal, refreshClaims);

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
