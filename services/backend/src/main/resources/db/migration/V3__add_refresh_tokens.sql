-- ============================================================
-- Pet Care Platform — Flyway Migration V3
-- Refresh token persistence (API contract P-1)
--
-- auth/domain/RefreshToken.java already maps this table, so /api/v1/auth/refresh
-- and /api/v1/auth/logout cannot work until it exists. Only the SHA-256 hash of
-- the token is stored; the raw token never touches the database.
-- ============================================================

CREATE TABLE refresh_tokens (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID         NOT NULL REFERENCES users(id),
    token_hash           VARCHAR(64)  NOT NULL UNIQUE,
    token_family_id      UUID         NOT NULL,
    replaced_by_token_id UUID         REFERENCES refresh_tokens(id),
    issued_at            TIMESTAMPTZ  NOT NULL,
    expires_at           TIMESTAMPTZ  NOT NULL,
    last_used_at         TIMESTAMPTZ,
    revoked_at           TIMESTAMPTZ,
    revoke_reason        VARCHAR(255),
    device_id            VARCHAR(255),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT ck_refresh_tokens_expiry CHECK (expires_at > issued_at)
);

-- Logout-all and rotation replay detection walk by user / by family.
CREATE INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(token_family_id);
-- Keep only live tokens in the hot lookup path used by AuthService.refreshToken.
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;