package com.petcare.platform.auth.service;

import com.petcare.platform.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Refresh-token revocation that must survive a rollback.
 *
 * <p>Replay detection revokes the whole token family and then throws, which rolls
 * back the enclosing transaction. Doing the revoke here in {@code REQUIRES_NEW}
 * makes it commit independently, so an attacker replaying an already-rotated
 * token really does lock the family out instead of silently failing to.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenRevocationService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(UUID familyId, String reason) {
        if (familyId != null) {
            refreshTokenRepository.revokeFamily(familyId, Instant.now(), reason);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForUser(UUID userId, String reason) {
        if (userId != null) {
            refreshTokenRepository.revokeAllForUser(userId, Instant.now(), reason);
        }
    }

    /**
     * Revokes a single token by id.
     *
     * <p>Bulk update on purpose: the entity may already be loaded in the caller's
     * persistence context, and saving it from this second context would flush with a
     * stale {@code version} and raise StaleStateException.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean revoke(UUID tokenId, String reason) {
        return tokenId != null && refreshTokenRepository.revokeById(tokenId, Instant.now(), reason) > 0;
    }
}