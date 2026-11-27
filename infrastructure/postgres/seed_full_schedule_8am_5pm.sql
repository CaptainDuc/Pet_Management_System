-- 1. Ensure all services have duration_minutes = 30
UPDATE services SET duration_minutes = 30, is_active = true;

-- 2. Clear old staff_skills and assign ALL 10 services to BOTH staff members
DELETE FROM staff_skills;

INSERT INTO staff_skills (staff_id, service_id, proficiency_level)
SELECT st.id, s.id, 'EXPERT'
FROM staff st
CROSS JOIN services s;

-- 3. Clear old schedules and time_slots
DELETE FROM time_slots;
DELETE FROM schedules;

-- 4. Generate full continuous schedules and 30-min time slots from 08:00 to 16:30 for the next 60 days
DO $$
DECLARE
    st RECORD;
    curr_date DATE;
    sched_id UUID;
    slot_time TIME;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
BEGIN
    FOR st IN SELECT id FROM staff WHERE is_active = true LOOP
        FOR i IN 0..60 LOOP
            curr_date := CURRENT_DATE + i;
            sched_id := gen_random_uuid();

            INSERT INTO schedules (id, staff_id, work_date, start_time, end_time, is_available)
            VALUES (sched_id, st.id, curr_date, '08:00:00', '16:30:00', true);

            -- Continuous 30-min slots from 08:00 to 16:30 (17 slots per day)
            -- 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00
            FOR slot_h IN 8..16 LOOP
                FOR slot_m IN 0..1 LOOP
                    EXIT WHEN slot_h = 16 AND slot_m = 1;
                    slot_time := make_time(slot_h, slot_m * 30, 0);
                    slot_start := (curr_date + slot_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
                    slot_end := slot_start + INTERVAL '30 minutes';

                    INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
                    VALUES (gen_random_uuid(), sched_id, slot_start, slot_end, false);
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
