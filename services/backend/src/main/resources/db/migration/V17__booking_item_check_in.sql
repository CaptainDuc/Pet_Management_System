ALTER TABLE booking_items
    ADD COLUMN checked_in_at TIMESTAMPTZ,
    ADD COLUMN checked_in_by UUID REFERENCES users(id);
