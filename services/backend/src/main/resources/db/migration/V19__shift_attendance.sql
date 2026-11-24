ALTER TABLE schedules
    ADD COLUMN clocked_in_at timestamptz,
    ADD COLUMN clocked_out_at timestamptz,
    ADD CONSTRAINT valid_attendance CHECK (clocked_out_at IS NULL OR
        (clocked_in_at IS NOT NULL AND clocked_out_at >= clocked_in_at));
