ALTER TABLE users ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0;

-- Pending registration is deliberately separate from users: no account or session
-- exists until its email code is verified. Passwords and codes are stored hashed.
CREATE TABLE auth_email_codes (
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(16) NOT NULL CHECK (purpose IN ('REGISTER', 'RESET')),
    challenge_id UUID NOT NULL,
    code_hash VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL,
    send_count INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    full_name VARCHAR(255),
    password_hash VARCHAR(100),
    phone VARCHAR(20),
    PRIMARY KEY (email, purpose)
);
CREATE INDEX idx_auth_email_codes_cleanup ON auth_email_codes(sent_at);
