package com.petcare.platform.auth.repository;

import com.petcare.platform.auth.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Bulk revocations.
     *
     * <p>They run with {@code flushAutomatically}/{@code clearAutomatically} because
     * they are often issued from a separate transaction while the caller's
     * persistence context still holds the row; without clearing it, a later flush
     * would try to update an already-revoked row with a stale {@code version}.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now, r.revokeReason = :reason WHERE r.id = :id AND r.revokedAt IS NULL")
    int revokeById(@Param("id") UUID id, @Param("now") Instant now, @Param("reason") String reason);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now, r.revokeReason = :reason WHERE r.tokenFamilyId = :familyId AND r.revokedAt IS NULL")
    int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now, @Param("reason") String reason);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now, r.revokeReason = :reason WHERE r.user.id = :userId AND r.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now, @Param("reason") String reason);
}