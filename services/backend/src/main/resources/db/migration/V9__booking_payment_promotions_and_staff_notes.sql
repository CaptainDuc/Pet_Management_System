-- Payment state for bookings, promotion reservations, and staff feedback.

ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID';
ALTER TABLE bookings ADD CONSTRAINT ck_bookings_payment_status
    CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED'));

ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(20);
ALTER TABLE bookings ADD CONSTRAINT ck_bookings_payment_method
    CHECK (payment_method IN ('ONLINE', 'CASH'));

ALTER TABLE bookings ADD COLUMN paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN payment_order_code VARCHAR(50);
ALTER TABLE bookings ADD COLUMN staff_note TEXT;
ALTER TABLE bookings ADD COLUMN staff_note_at TIMESTAMPTZ;

CREATE INDEX idx_bookings_payment_status ON bookings (payment_status);

-- A promotion usage is reserved when a booking is created and only counted
-- against max_uses once the booking is actually paid. Cancelling an unpaid
-- booking releases the reservation instead of leaking a usage.
CREATE TABLE promotion_redemptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID        NOT NULL REFERENCES promotions (id),
    booking_id   UUID        NOT NULL REFERENCES bookings (id),
    status       VARCHAR(20) NOT NULL DEFAULT 'RESERVED'
        CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED')),
    consumed_at  TIMESTAMPTZ,
    released_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version      BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT uq_promotion_redemptions_booking UNIQUE (booking_id)
);

CREATE INDEX idx_promotion_redemptions_promotion
    ON promotion_redemptions (promotion_id, status);

-- Demo promotions so the flow can be exercised immediately after migration.
INSERT INTO promotions (code, name, discount_type, discount_value, min_order_amount,
                        max_uses, used_count, start_date, end_date, is_active)
VALUES
    ('WELCOME10', 'Chào mừng khách mới', 'PERCENTAGE', 10.00, 0.00, 1000, 0, '2026-01-01', '2027-12-31', TRUE),
    ('SAVE50K', 'Giảm 50.000đ', 'FIXED_AMOUNT', 50000.00, 200000.00, 500, 0, '2026-01-01', '2027-12-31', TRUE),
    ('SUMMER20', 'Ưu đãi mùa hè', 'PERCENTAGE', 20.00, 300000.00, 300, 0, '2026-01-01', '2027-12-31', TRUE)
ON CONFLICT (code) DO NOTHING;
