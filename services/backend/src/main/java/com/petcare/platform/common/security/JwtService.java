package com.petcare.platform.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Slf4j
@Service
public class JwtService {

    @Value("${app.jwt.secret:dGhpc2lzYW5leGFtcGxlc2VjcmV0a2V5dGhhdGlzbG9uZ2Vub3VnaGZvcmhzMjU2Yml0c2FmZXR5}")
    private String secretKey;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    @Value("${app.jwt.refresh-expiration:604800000}")
    private long refreshExpiration;

    /** Tolerance for clock drift between this service and the token issuer. */
    @Value("${app.jwt.clock-skew-seconds:30}")
    private long clockSkewSeconds;

    // ─── Token creation ────────────────────────────────────────────────────

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("typ", "access");
        return generateToken(claims, userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.putIfAbsent("typ", "access");
        return buildToken(claims, userDetails, jwtExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("typ", "refresh");
        return buildToken(claims, userDetails, refreshExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    // ─── Token inspection ──────────────────────────────────────────────────

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("typ", String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    public boolean isAccessToken(String token) {
        return "access".equalsIgnoreCase(extractTokenType(token));
    }

    public boolean isRefreshToken(String token) {
        return "refresh".equalsIgnoreCase(extractTokenType(token));
    }

    /**
     * Signature, expiry and subject must all check out. The caller is still
     * responsible for {@link UserDetails#isEnabled()} / {@code isAccountNonLocked()},
     * because a still-valid JWT does not imply the account is still usable.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String username = extractUsername(token);
            return username != null
                    && username.equals(userDetails.getUsername())
                    && !isTokenExpired(token);
        } catch (Exception ex) {
            log.debug("Token rejected: {}", ex.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .clockSkewSeconds(clockSkewSeconds)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ─── Signing key ───────────────────────────────────────────────────────

    private SecretKey getSignInKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (Exception ex) {
            log.warn("app.jwt.secret is not valid Base64; falling back to raw UTF-8 bytes. "
                    + "Generate one with: openssl rand -base64 64");
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }
        // HMAC-SHA256 requires at least a 256-bit key.
        if (keyBytes.length < 32) {
            log.warn("app.jwt.secret is shorter than 256 bits; it will be zero-padded to 32 bytes. "
                    + "This is not suitable for production.");
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}