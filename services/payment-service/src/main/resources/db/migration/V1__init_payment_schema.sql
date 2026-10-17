CREATE TABLE payments (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id             UUID           NOT NULL,
    owner_id               UUID           NOT NULL,
    appointment_id         UUID,
    invoice_code           VARCHAR(100)   NOT NULL,
    expected_amount        NUMERIC(14, 2) NOT NULL CHECK (expected_amount > 0),
    received_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
    refunded_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
    currency               CHAR(3)        NOT NULL DEFAULT 'VND',
    provider               VARCHAR(50),
    method                 VARCHAR(50)    NOT NULL,
    status                 VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED')),
    paid_at                TIMESTAMPTZ,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version                BIGINT         NOT NULL DEFAULT 0,
    CONSTRAINT uq_payments_invoice UNIQUE (invoice_id),
    CONSTRAINT ck_payments_refund_amount CHECK (refunded_amount <= received_amount)
);

CREATE TABLE payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id              UUID           NOT NULL REFERENCES payments(id),
    transaction_type        VARCHAR(30)    NOT NULL
        CHECK (transaction_type IN ('AUTHORIZE', 'CAPTURE', 'PAYMENT', 'REFUND', 'VOID', 'FAILURE')),
    provider                VARCHAR(50)    NOT NULL,
    provider_transaction_id VARCHAR(255),
    provider_event_id       VARCHAR(255),
    idempotency_key         VARCHAR(255)   NOT NULL UNIQUE,
    amount                  NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency                CHAR(3)        NOT NULL DEFAULT 'VND',
    status                  VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    request_payload         JSONB,
    response_payload        JSONB,
    failure_code            VARCHAR(100),
    failure_message         TEXT,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_payment_transactions_provider_tx
    ON payment_transactions(provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_transactions_provider_event
    ON payment_transactions(provider, provider_event_id)
    WHERE provider_event_id IS NOT NULL;
CREATE INDEX idx_payment_transactions_payment_created
    ON payment_transactions(payment_id, created_at DESC);

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

CREATE INDEX idx_payment_outbox_unpublished
    ON outbox_events(occurred_at)
    WHERE published_at IS NULL;
