-- SePay / VietQR payment orders.
-- The order is the "payable" aggregate matched against a bank transfer reference.
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
    CONSTRAINT uq_orders_order_code UNIQUE (order_code)
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_invoice ON orders (invoice_id) WHERE invoice_id IS NOT NULL;

-- Extend the existing reconciliation ledger so a SePay callback can be stored
-- even when no order matches (null order_id), while keeping the original
-- payment gateway columns for future providers.
ALTER TABLE payment_transactions ALTER COLUMN payment_id DROP NOT NULL;
ALTER TABLE payment_transactions
    ADD COLUMN order_id UUID REFERENCES orders (id) ON DELETE SET NULL;
ALTER TABLE payment_transactions ADD COLUMN sepay_transaction_id BIGINT;
ALTER TABLE payment_transactions ADD COLUMN amount_in NUMERIC(14, 2);
ALTER TABLE payment_transactions ADD COLUMN content TEXT;
ALTER TABLE payment_transactions ADD COLUMN raw_payload JSONB;

-- SePay sends a numeric transaction id; it is our idempotency key.
CREATE UNIQUE INDEX uq_payment_transactions_sepay_id
    ON payment_transactions (sepay_transaction_id)
    WHERE sepay_transaction_id IS NOT NULL;
CREATE INDEX idx_payment_transactions_order ON payment_transactions (order_id)
    WHERE order_id IS NOT NULL;

-- Row defaults let a SePay callback be persisted without a full gateway attempt.
ALTER TABLE payment_transactions ALTER COLUMN transaction_type SET DEFAULT 'PAYMENT';
ALTER TABLE payment_transactions ALTER COLUMN provider SET DEFAULT 'SEPAY';
ALTER TABLE payment_transactions ALTER COLUMN idempotency_key
    SET DEFAULT (gen_random_uuid()::text);
