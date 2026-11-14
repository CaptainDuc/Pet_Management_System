-- Booking payments and a transactional outbox for payment events.

ALTER TABLE orders ADD COLUMN booking_id UUID;
CREATE INDEX idx_orders_booking ON orders (booking_id) WHERE booking_id IS NOT NULL;

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
