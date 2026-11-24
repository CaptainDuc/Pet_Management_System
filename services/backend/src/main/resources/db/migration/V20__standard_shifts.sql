-- Tạo ca làm việc chuẩn cho tất cả bác sĩ hoạt động
-- Sáng: 08:00-12:00, Chiều: 13:00-17:00, Tối: 17:00-21:00
-- Chạy script này sau khi deploy để đảm bảo tất cả bác sĩ đều có ca chuẩn

DO $$
DECLARE
    doctor_record RECORD;
    shift_times TIME[] := ARRAY[
        '08:00'::time, '12:00'::time,  -- Sáng
        '13:00'::time, '17:00'::time,  -- Chiều
        '17:00'::time, '21:00'::time   -- Tối
    ];
    work_date DATE := CURRENT_DATE;
    i INT;
BEGIN
    -- Lặp qua tất cả bác sĩ đang hoạt động
    FOR doctor_record IN
        SELECT s.id as staff_id
        FROM staff s
        JOIN "user" u ON u.id = s.user_id
        WHERE s.active = true
          AND u.status = 'ACTIVE'
          AND (u.role = 'VETERINARIAN' OR EXISTS (
              SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id AND r.name = 'VETERINARIAN'
          ))
    LOOP
        -- Tạo 3 ca cho hôm nay và 7 ngày tới
        FOR i IN 0..6 LOOP
            work_date := CURRENT_DATE + i;

            -- Ca sáng
            IF NOT EXISTS (
                SELECT 1 FROM schedules
                WHERE staff_id = doctor_record.staff_id
                  AND work_date = work_date
                  AND start_time = '08:00'::time
                  AND end_time = '12:00'::time
            ) THEN
                INSERT INTO schedules (staff_id, work_date, start_time, end_time, is_available, created_at, updated_at, version)
                VALUES (doctor_record.staff_id, work_date, '08:00'::time, '12:00'::time, true, NOW(), NOW(), 0);
            END IF;

            -- Ca chiều
            IF NOT EXISTS (
                SELECT 1 FROM schedules
                WHERE staff_id = doctor_record.staff_id
                  AND work_date = work_date
                  AND start_time = '13:00'::time
                  AND end_time = '17:00'::time
            ) THEN
                INSERT INTO schedules (staff_id, work_date, start_time, end_time, is_available, created_at, updated_at, version)
                VALUES (doctor_record.staff_id, work_date, '13:00'::time, '17:00'::time, true, NOW(), NOW(), 0);
            END IF;

            -- Ca tối
            IF NOT EXISTS (
                SELECT 1 FROM schedules
                WHERE staff_id = doctor_record.staff_id
                  AND work_date = work_date
                  AND start_time = '17:00'::time
                  AND end_time = '21:00'::time
            ) THEN
                INSERT INTO schedules (staff_id, work_date, start_time, end_time, is_available, created_at, updated_at, version)
                VALUES (doctor_record.staff_id, work_date, '17:00'::time, '21:00'::time, true, NOW(), NOW(), 0);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Tạo time slots (30 phút/slot) cho các ca mới tạo chưa có slots
DO $$
DECLARE
    sched_record RECORD;
    slot_start TIMESTAMP WITH TIME ZONE;
    slot_end TIMESTAMP WITH TIME ZONE;
    shift_end TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR sched_record IN
        SELECT s.id, s.work_date, s.start_time, s.end_time
        FROM schedules s
        LEFT JOIN time_slots ts ON ts.schedule_id = s.id
        WHERE ts.id IS NULL
          AND s.is_available = true
    LOOP
        slot_start := sched_record.work_date + sched_record.start_time AT TIME ZONE 'Asia/Ho_Chi_Minh';
        shift_end := sched_record.work_date + sched_record.end_time AT TIME ZONE 'Asia/Ho_Chi_Minh';

        WHILE slot_start + INTERVAL '30 minutes' <= shift_end LOOP
            slot_end := slot_start + INTERVAL '30 minutes';
            INSERT INTO time_slots (schedule_id, start_time, end_time, is_booked, created_at, updated_at, version)
            VALUES (sched_record.id, slot_start, slot_end, false, NOW(), NOW(), 0);
            slot_start := slot_end;
        END LOOP;
    END LOOP;
END $$;