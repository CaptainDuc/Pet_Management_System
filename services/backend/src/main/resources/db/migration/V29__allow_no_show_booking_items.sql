ALTER TABLE booking_items DROP CONSTRAINT IF EXISTS ck_booking_items_status;
ALTER TABLE booking_items ADD CONSTRAINT ck_booking_items_status
    CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'));
