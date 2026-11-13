-- Chống đặt trùng khung giờ và ghi nhật ký trạng thái lịch hẹn

ALTER TABLE bookings ADD CONSTRAINT ck_bookings_status
    CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'));

ALTER TABLE booking_items ADD CONSTRAINT ck_booking_items_status
    CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'));

-- Một khung giờ chỉ thuộc về tối đa một lịch hẹn còn hiệu lực
CREATE UNIQUE INDEX uq_booking_items_active_slot
    ON booking_items(time_slot_id)
    WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';

CREATE UNIQUE INDEX uq_booking_items_staff_slot
    ON booking_items(staff_id, time_slot_id)
    WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';

CREATE TABLE booking_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    from_status VARCHAR(50),
    to_status   VARCHAR(50) NOT NULL,
    changed_by  UUID NOT NULL REFERENCES users(id),
    reason      TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);