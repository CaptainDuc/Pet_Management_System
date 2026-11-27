CREATE TEMP TABLE doctor_days ON COMMIT DROP AS
WITH doctors AS (
    SELECT s.id FROM staff s JOIN users u ON u.id = s.user_id
    WHERE s.is_active AND u.status = 'ACTIVE' AND (u.role = 'VETERINARIAN' OR EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id AND r.name = 'VETERINARIAN'))
), today AS (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day)
SELECT d.id AS staff_id, day + n AS work_date FROM doctors d, today, generate_series(0,6) n
UNION
SELECT s.staff_id, s.work_date FROM schedules s JOIN doctors d ON d.id = s.staff_id, today
WHERE s.work_date >= day;

INSERT INTO schedules (staff_id, work_date, start_time, end_time)
SELECT staff_id, work_date, time '08:00', time '16:30' FROM doctor_days
ON CONFLICT (staff_id, work_date) DO UPDATE
SET start_time = excluded.start_time, end_time = excluded.end_time, updated_at = now(),
    version = schedules.version + 1
WHERE (schedules.start_time, schedules.end_time) <> (excluded.start_time, excluded.end_time);

-- Keep slot IDs referenced by existing appointments.
DELETE FROM time_slots t USING schedules s, doctor_days d
WHERE t.schedule_id = s.id AND (s.staff_id,s.work_date) = (d.staff_id,d.work_date)
  AND (t.start_time < (s.work_date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'
    OR t.end_time > (s.work_date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh')
  AND NOT t.is_booked
  AND NOT EXISTS (SELECT 1 FROM booking_items i WHERE i.time_slot_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM booking_item_slots i WHERE i.time_slot_id = t.id);

INSERT INTO time_slots (schedule_id, start_time, end_time)
SELECT s.id, slot_start, slot_start + interval '30 minutes'
FROM schedules s JOIN doctor_days d USING (staff_id,work_date)
CROSS JOIN LATERAL generate_series(
    (s.work_date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
    (s.work_date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '30 minutes',
    interval '30 minutes') slot_start
WHERE NOT EXISTS (SELECT 1 FROM time_slots t WHERE t.schedule_id = s.id
    AND t.start_time < slot_start + interval '30 minutes' AND t.end_time > slot_start);
