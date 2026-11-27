-- Local test accounts only. Add skills and missing schedules; keep all existing
-- bookings, schedules, staff data and skill proficiency levels unchanged.
DO $$
DECLARE
    test_staff UUID;
    work_day DATE;
    first_day DATE := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    new_schedule UUID;
    slot_start TIMESTAMPTZ;
BEGIN
    SELECT st.id INTO test_staff
    FROM staff st JOIN users u ON u.id = st.user_id
    WHERE u.email = 'staff.test@petcare.invalid' AND st.is_active = true
      AND u.status = 'ACTIVE';
    IF test_staff IS NULL THEN
        RAISE EXCEPTION 'Active staff.test@petcare.invalid staff profile is required';
    END IF;

    INSERT INTO staff_skills (staff_id, service_id, proficiency_level)
    SELECT test_staff, id, 'INTERMEDIATE' FROM services
    WHERE category_id IN ('ca4e0000-0000-4000-8000-000000000001', 'ca4e0000-0000-4000-8000-000000000002')
      AND is_active = true
    ON CONFLICT (staff_id, service_id) DO NOTHING;

    FOR day_offset IN 1..14 LOOP
        work_day := first_day + day_offset;
        IF EXISTS (SELECT 1 FROM schedules WHERE staff_id = test_staff AND work_date = work_day) THEN
            CONTINUE;
        END IF;
        new_schedule := gen_random_uuid();
        INSERT INTO schedules (id, staff_id, work_date, start_time, end_time, is_available)
        VALUES (new_schedule, test_staff, work_day, '08:00:00', '16:30:00', true);
        FOR slot_index IN 0..16 LOOP
            slot_start := ((work_day + TIME '08:00:00') AT TIME ZONE 'Asia/Ho_Chi_Minh')
                          + make_interval(mins => slot_index * 30);
            INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
            VALUES (gen_random_uuid(), new_schedule, slot_start, slot_start + INTERVAL '30 minutes', false);
        END LOOP;
    END LOOP;
END $$;
