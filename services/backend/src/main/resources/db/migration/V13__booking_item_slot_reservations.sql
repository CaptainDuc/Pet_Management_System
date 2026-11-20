CREATE TABLE booking_item_slots (
    booking_item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id),
    PRIMARY KEY (booking_item_id, time_slot_id)
);
CREATE INDEX idx_booking_item_slots_time_slot ON booking_item_slots(time_slot_id);

-- Preserve reservations for appointments created before multi-slot booking.
INSERT INTO booking_item_slots (booking_item_id, time_slot_id)
SELECT id, time_slot_id FROM booking_items WHERE time_slot_id IS NOT NULL;
