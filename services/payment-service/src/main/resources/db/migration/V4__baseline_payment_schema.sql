-- Baseline Payment Schema (Combines V1 + V2)
-- This migration replaces V1__init_payment_schema.sql and V2__sepay_orders_and_webhook.sql
-- for fresh database deployments. Existing databases should use `flyway repair`.

-- ─── 1. SePay / VietQR Payment Orders ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_code_seq START WITH 1024;

CREATE TABLE orders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code     VARCHAR(50)    NOT NULL,
    invoice_id     UUID,
    invoice_code   VARCHAR(100),
    description    TEXT,
    total_amount   NUMERIC(14, 2) NOT NULL CHECK (total_amount > 0),
    status         VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED', 'EXPIRED', 'UNMATCHED')),
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    version        BIGINT         NOT NULL DEFAULT 0,
    booking_id     UUID,
    CONSTRAINT uq_orders_order_code UNIQUE (order_code)
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_invoice ON orders (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_orders_booking ON orders (booking_id) WHERE booking_id IS NOT NULL;

-- ─── 2. Payments ──────────────────────────────────────────────────────────────
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

-- ─── 3. Payment Transactions (Final State - Includes V2 Extensions) ───────────
CREATE TABLE payment_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id              UUID REFERENCES payments(id) ON DELETE SET NULL,
    order_id                UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type        VARCHAR(30)    NOT NULL DEFAULT 'PAYMENT'
        CHECK (transaction_type IN ('AUTHORIZE', 'CAPTURE', 'PAYMENT', 'REFUND', 'VOID', 'FAILURE')),
    provider                VARCHAR(50)    NOT NULL DEFAULT 'SEPAY',
    provider_transaction_id VARCHAR(255),
    provider_event_id       VARCHAR(255),
    sepay_transaction_id    BIGINT,
    idempotency_key         VARCHAR(255)   NOT NULL DEFAULT (gen_random_uuid()::text),
    amount                  NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    amount_in               NUMERIC(14, 2),
    currency                CHAR(3)        NOT NULL DEFAULT 'VND',
    status                  VARCHAR(30)    NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    content                 TEXT,
    request_payload         JSONB,
    response_payload        JSONB,
    raw_payload             JSONB,
    failure_code            VARCHAR(100),
    failure_message         TEXT,
    processed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Unique indexes for idempotency
CREATE UNIQUE INDEX uq_payment_transactions_idempotency
    ON payment_transactions (idempotency_key);

CREATE UNIQUE INDEX uq_payment_transactions_provider_tx
    ON payment_transactions(provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX uq_payment_transactions_provider_event
    ON payment_transactions(provider, provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- SePay specific: numeric transaction ID as idempotency key
CREATE UNIQUE INDEX uq_payment_transactions_sepay_id
    ON payment_transactions (sepay_transaction_id)
    WHERE sepay_transaction_id IS NOT NULL;

-- Indexes for common queries
CREATE INDEX idx_payment_transactions_payment_created
    ON payment_transactions(payment_id, created_at DESC);

CREATE INDEX idx_payment_transactions_order
    ON payment_transactions (order_id)
    WHERE order_id IS NOT NULL;

-- ─── 4. Inbox Events (Idempotent Consumption) ────────────────────────────────
CREATE TABLE inbox_events (
    event_id       UUID PRIMARY KEY,
    event_type     VARCHAR(150) NOT NULL,
    payload        JSONB        NOT NULL,
    received_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMPTZ,
    failure_reason TEXT
);

-- ─── 5. Outbox Events (Transactional Outbox Pattern) ─────────────────────────
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

-- ─── 6. Payment Events (Event-Driven Notifications) ────────────────────────────
CREATE TABLE payment_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id   UUID         NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    exchange_name  VARCHAR(150) NOT NULL,
    routing_key    VARCHAR(150) NOT NULL,
    payload        JSONB        NOT NULL,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ
);

CREATE INDEX idx_payment_events_pending
    ON payment_events (occurred_at)
    WHERE published_at IS NULL;