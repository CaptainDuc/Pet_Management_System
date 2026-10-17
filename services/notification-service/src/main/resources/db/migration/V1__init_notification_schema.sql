CREATE TABLE notification_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(100) NOT NULL,
    version       INTEGER      NOT NULL CHECK (version > 0),
    channel       VARCHAR(20)  NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP')),
    subject       VARCHAR(255),
    body_template TEXT         NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_template_version UNIQUE (code, version, channel)
);

CREATE TABLE notifications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID,
    appointment_id        UUID,
    invoice_id            UUID,
    payment_id            UUID,
    template_code         VARCHAR(100),
    template_version      INTEGER,
    type                  VARCHAR(100) NOT NULL,
    title                 VARCHAR(255) NOT NULL,
    body                  TEXT         NOT NULL,
    data                  JSONB,
    status                VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'PARTIALLY_SENT', 'FAILED', 'CANCELLED')),
    is_read               BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at               TIMESTAMPTZ,
    scheduled_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_notification_read_at CHECK (NOT is_read OR read_at IS NOT NULL)
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_pending ON notifications(scheduled_at, created_at)
    WHERE status = 'PENDING';

CREATE TABLE notification_deliveries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id       UUID         NOT NULL REFERENCES notifications(id),
    channel               VARCHAR(20)  NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP')),
    recipient             VARCHAR(500) NOT NULL,
    provider              VARCHAR(100),
    provider_message_id   VARCHAR(255),
    status                VARCHAR(30)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTERED')),
    attempt_count         INTEGER      NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at       TIMESTAMPTZ,
    sent_at               TIMESTAMPTZ,
    last_error            TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_notification_provider_message
    ON notification_deliveries(provider, provider_message_id)
    WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_notification_deliveries_retry
    ON notification_deliveries(next_attempt_at)
    WHERE status = 'FAILED';

CREATE TABLE inbox_events (
    event_id       UUID PRIMARY KEY,
    event_type     VARCHAR(150) NOT NULL,
    payload        JSONB        NOT NULL,
    received_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE TABLE outbox_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID         NOT NULL,
    event_type     VARCHAR(150) NOT NULL,
    event_version  INTEGER      NOT NULL DEFAULT 1 CHECK (event_version > 0),
    payload        JSONB        NOT NULL,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ,
    retry_count    INTEGER      NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error     TEXT
);

CREATE INDEX idx_notification_outbox_unpublished
    ON outbox_events(occurred_at)
    WHERE published_at IS NULL;
