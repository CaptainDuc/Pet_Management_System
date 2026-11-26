CREATE TABLE booking_reminder_dispatches (
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_minutes SMALLINT NOT NULL CHECK (reminder_minutes IN (30, 1440)),
    appointment_start TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, reminder_minutes, appointment_start)
);
