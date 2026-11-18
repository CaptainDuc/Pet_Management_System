-- Seed Service Categories, Services, Staff Skills, and 30-Day Schedules

DO $$
DECLARE
    -- Category UUIDs
    cat_kham UUID := '11111111-1111-1111-1111-111111110001';
    cat_tiem UUID := '11111111-1111-1111-1111-111111110002';
    cat_cls  UUID := '11111111-1111-1111-1111-111111110003';
    cat_pt   UUID := '11111111-1111-1111-1111-111111110004';
    cat_spa  UUID := '11111111-1111-1111-1111-111111110005';

    -- Service UUIDs
    srv_kham_tongquát UUID := '22222222-2222-2222-2222-222222220001';
    srv_tai_kham      UUID := '22222222-2222-2222-2222-222222220002';
    srv_tiem_dai      UUID := '22222222-2222-2222-2222-222222220003';
    srv_tiem_7benh    UUID := '22222222-2222-2222-2222-222222220004';
    srv_tiem_4benh    UUID := '22222222-2222-2222-2222-222222220005';
    srv_sieu_am       UUID := '22222222-2222-2222-2222-222222220006';
    srv_xet_nghiem    UUID := '22222222-2222-2222-2222-222222220007';
    srv_triet_san     UUID := '22222222-2222-2222-2222-222222220008';
    srv_spa_tam       UUID := '22222222-2222-2222-2222-222222220009';
    srv_ve_sinh       UUID := '22222222-2222-2222-2222-222222220010';

    -- Staff UUIDs
    vet_staff_id   UUID := '10fda21b-5136-494a-96c8-0f2056c872a9';
    desk_staff_id  UUID := '77429be3-42a8-4ee6-a3ea-bbcef16f44b1';

    curr_date DATE;
    sched_id UUID;
    slot_time TIME;
    slot_start TIMESTAMPTZ;
    slot_end TIMESTAMPTZ;
BEGIN
    -- 1. Insert Categories
    INSERT INTO service_categories (id, name, description, icon)
    VALUES
        (cat_kham, 'Khám & Điều trị bệnh', 'Khám lâm sàng, chẩn đoán và phác đồ điều trị chuyên sâu', 'Stethoscope'),
        (cat_tiem, 'Tiêm chủng & Vaccine', 'Vaccine phòng dại và các bệnh truyền nhiễm nguy hiểm', 'ShieldCheck'),
        (cat_cls,  'Cận lâm sàng & Xét nghiệm', 'Siêu âm, X-quang, xét nghiệm máu và sinh hóa', 'Activity'),
        (cat_pt,   'Phẫu thuật & Ngoại khoa', 'Phẫu thuật triệt sản, mổ đẻ và điều trị ngoại khoa', 'Scissors'),
        (cat_spa,  'Spa & Làm đẹp thú cưng', 'Tắm sấy dưỡng lông, cắt tỉa tạo kiểu và vệ sinh toàn diện', 'Sparkles')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon;

    -- 2. Insert Services
    INSERT INTO services (id, category_id, name, description, base_price, duration_minutes, is_active)
    VALUES
        (srv_kham_tongquát, cat_kham, 'Khám lâm sàng tổng quát', 'Khám sức khỏe tổng thể, kiểm tra tim phổi, nhiệt độ và thể trạng', 150000, 30, true),
        (srv_tai_kham,      cat_kham, 'Tái khám định kỳ theo phác đồ', 'Kiểm tra tiến triển sau điều trị hoặc sau tiêm', 100000, 20, true),
        (srv_tiem_dai,      cat_tiem, 'Tiêm phòng vaccine dại Rabisin', 'Vaccine dại tiêu chuẩn quốc tế bảo vệ 1 năm cho chó mèo', 120000, 15, true),
        (srv_tiem_7benh,    cat_tiem, 'Tiêm vaccine 7 bệnh cho Chó (Vanguard Plus)', 'Phòng Parvo, Care, Viêm gan truyền nhiễm, Ho cũi chó...', 280000, 20, true),
        (srv_tiem_4benh,    cat_tiem, 'Tiêm vaccine 4 bệnh cho Mèo (PureVax)', 'Phòng Giảm bạch cầu, Viêm mũi khí quản, Calicivirus và Chlamydia', 260000, 20, true),
        (srv_sieu_am,       cat_cls,  'Siêu âm ổ bụng tổng quát', 'Khảo sát nội tạng gan, thận, bàng quang và kiểm tra thai kỳ', 250000, 30, true),
        (srv_xet_nghiem,    cat_cls,  'Xét nghiệm máu tổng quát (18 chỉ số)', 'Đánh giá công thức máu, chức năng gan thận và tình trạng viêm', 350000, 30, true),
        (srv_triet_san,     cat_pt,   'Triệt sản Mèo/Chó đực an toàn', 'Phẫu thuật triệt sản ít xâm lấn, gây mê an toàn, hồi phục nhanh', 450000, 60, true),
        (srv_spa_tam,       cat_spa,  'Gói Spa Tắm sấy & Cắt tỉa lông tạo kiểu', 'Tắm gội thảo mộc dưỡng lông, sấy tạo phồng, cắt tỉa theo yêu cầu', 200000, 60, true),
        (srv_ve_sinh,       cat_spa,  'Vệ sinh tai, cắt móng & vắt tuyến hôi', 'Chăm sóc vệ sinh định kỳ giúp thú cưng sạch sẽ và thơm tho', 80000, 20, true)
    ON CONFLICT (id) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        base_price = EXCLUDED.base_price,
        duration_minutes = EXCLUDED.duration_minutes,
        is_active = EXCLUDED.is_active;

    -- 3. Staff Skills
    -- Assign medical/surgical/lab skills to Dr. Veterinarian
    INSERT INTO staff_skills (staff_id, service_id, proficiency_level)
    SELECT vet_staff_id, s.id, 'EXPERT'
    FROM services s
    ON CONFLICT DO NOTHING;

    -- Assign general & spa skills to Front Desk staff
    INSERT INTO staff_skills (staff_id, service_id, proficiency_level)
    SELECT desk_staff_id, s.id, 'INTERMEDIATE'
    FROM services s
    WHERE s.category_id IN (cat_tiem, cat_spa, cat_kham)
    ON CONFLICT DO NOTHING;

    -- 4. Generate Schedules & Time Slots for the next 30 days
    FOR i IN 0..30 LOOP
        curr_date := CURRENT_DATE + i;

        -- Schedule for Vet
        IF NOT EXISTS (SELECT 1 FROM schedules WHERE staff_id = vet_staff_id AND work_date = curr_date) THEN
            sched_id := gen_random_uuid();
            INSERT INTO schedules (id, staff_id, work_date, start_time, end_time, is_available)
            VALUES (sched_id, vet_staff_id, curr_date, '08:00:00', '18:00:00', true);

            -- Morning slots: 08:00 to 11:30 (every 30 mins)
            FOR slot_h IN 8..11 LOOP
                FOR slot_m IN 0..1 LOOP
                    slot_time := make_time(slot_h, slot_m * 30, 0);
                    slot_start := (curr_date + slot_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
                    slot_end := slot_start + INTERVAL '30 minutes';
                    INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
                    VALUES (gen_random_uuid(), sched_id, slot_start, slot_end, false);
                END LOOP;
            END LOOP;

            -- Afternoon slots: 13:30 to 17:30 (every 30 mins)
            FOR slot_h IN 13..17 LOOP
                FOR slot_m IN 0..1 LOOP
                    IF NOT (slot_h = 13 AND slot_m = 0) THEN
                        slot_time := make_time(slot_h, slot_m * 30, 0);
                        slot_start := (curr_date + slot_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
                        slot_end := slot_start + INTERVAL '30 minutes';
                        INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
                        VALUES (gen_random_uuid(), sched_id, slot_start, slot_end, false);
                    END IF;
                END LOOP;
            END LOOP;
        END IF;

        -- Schedule for Staff
        IF NOT EXISTS (SELECT 1 FROM schedules WHERE staff_id = desk_staff_id AND work_date = curr_date) THEN
            sched_id := gen_random_uuid();
            INSERT INTO schedules (id, staff_id, work_date, start_time, end_time, is_available)
            VALUES (sched_id, desk_staff_id, curr_date, '08:30:00', '17:30:00', true);

            FOR slot_h IN 9..11 LOOP
                FOR slot_m IN 0..1 LOOP
                    slot_time := make_time(slot_h, slot_m * 30, 0);
                    slot_start := (curr_date + slot_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
                    slot_end := slot_start + INTERVAL '30 minutes';
                    INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
                    VALUES (gen_random_uuid(), sched_id, slot_start, slot_end, false);
                END LOOP;
            END LOOP;

            FOR slot_h IN 14..16 LOOP
                FOR slot_m IN 0..1 LOOP
                    slot_time := make_time(slot_h, slot_m * 30, 0);
                    slot_start := (curr_date + slot_time) AT TIME ZONE 'Asia/Ho_Chi_Minh';
                    slot_end := slot_start + INTERVAL '30 minutes';
                    INSERT INTO time_slots (id, schedule_id, start_time, end_time, is_booked)
                    VALUES (gen_random_uuid(), sched_id, slot_start, slot_end, false);
                END LOOP;
            END LOOP;
        END IF;

    END LOOP;
END $$;
