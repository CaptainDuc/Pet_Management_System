ALTER TABLE booking_items ADD COLUMN preferred_staff_id UUID REFERENCES staff(id);
