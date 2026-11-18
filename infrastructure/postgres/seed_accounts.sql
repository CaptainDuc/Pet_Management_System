DO $$
DECLARE
    v_pwd text := '$2a$10$DYGB8pJq4Wj1PBLdTKxtcOEt12bhK5/B16x4L2Xi3f4OBNxBc2Hb.';
    v_branch_id uuid;
    v_owner_id uuid;
    v_admin_id uuid;
    v_vet_id uuid;
    v_vet2_id uuid;
    v_staff_id uuid;
    v_customer_id uuid;
    v_owner_role_id uuid;
    v_admin_role_id uuid;
    v_vet_role_id uuid;
    v_staff_role_id uuid;
    v_customer_role_id uuid;
BEGIN
    -- Lấy role IDs
    SELECT id INTO v_owner_role_id FROM roles WHERE name = 'OWNER';
    SELECT id INTO v_admin_role_id FROM roles WHERE name = 'ADMIN';
    SELECT id INTO v_vet_role_id FROM roles WHERE name = 'VETERINARIAN';
    SELECT id INTO v_staff_role_id FROM roles WHERE name = 'STAFF';
    SELECT id INTO v_customer_role_id FROM roles WHERE name = 'CUSTOMER';

    -- Chi nhánh mặc định nếu chưa có
    SELECT id INTO v_branch_id FROM branches LIMIT 1;
    IF v_branch_id IS NULL THEN
        INSERT INTO branches (name, address, phone, email, is_active)
        VALUES ('PetCare Clinic Tân Thuận', '73 Đường Số 49, P. Tân Thuận, TP.HCM', '0898520760', 'contact@petcare.vn', true)
        RETURNING id INTO v_branch_id;
    END IF;

    -- 1. OWNER
    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('owner@gmail.com', v_pwd, 'Chủ Phòng Khám (Owner)', '0901000001', 'OWNER', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'OWNER', status = 'ACTIVE'
    RETURNING id INTO v_owner_id;

    -- 2. ADMIN
    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('admin@gmail.com', v_pwd, 'Quản Trị Viên (Admin)', '0901000002', 'ADMIN', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN', status = 'ACTIVE'
    RETURNING id INTO v_admin_id;

    -- 3. VETERINARIAN (cả vet@gmail.com và veterinarian@gmail.com)
    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('vet@gmail.com', v_pwd, 'Bác Sĩ Thú Y (Vet)', '0901000003', 'VETERINARIAN', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'VETERINARIAN', status = 'ACTIVE'
    RETURNING id INTO v_vet_id;

    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('veterinarian@gmail.com', v_pwd, 'Bác Sĩ Thú Y (Veterinarian)', '0901000004', 'VETERINARIAN', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'VETERINARIAN', status = 'ACTIVE'
    RETURNING id INTO v_vet2_id;

    -- 4. STAFF
    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('staff@gmail.com', v_pwd, 'Nhân Viên Lễ Tân (Staff)', '0901000005', 'STAFF', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'STAFF', status = 'ACTIVE'
    RETURNING id INTO v_staff_id;

    -- 5. CUSTOMER
    INSERT INTO users (email, password, full_name, phone, role, status)
    VALUES ('customer@gmail.com', v_pwd, 'Khách Hàng (Customer)', '0901000006', 'CUSTOMER', 'ACTIVE')
    ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = 'CUSTOMER', status = 'ACTIVE'
    RETURNING id INTO v_customer_id;

    -- Gán user_roles
    DELETE FROM user_roles WHERE user_id IN (v_owner_id, v_admin_id, v_vet_id, v_vet2_id, v_staff_id, v_customer_id);

    INSERT INTO user_roles (user_id, role_id) VALUES
    (v_owner_id, v_owner_role_id),
    (v_admin_id, v_admin_role_id),
    (v_vet_id, v_vet_role_id),
    (v_vet2_id, v_vet_role_id),
    (v_staff_id, v_staff_role_id),
    (v_customer_id, v_customer_role_id)
    ON CONFLICT DO NOTHING;

    -- Tạo hồ sơ staff nếu chưa có
    INSERT INTO staff (user_id, branch_id, position, bio, is_active)
    SELECT v_vet_id, v_branch_id, 'Bác sĩ thú y chính', 'Chuyên khoa nội và ngoại khoa thú nhỏ', true
    WHERE NOT EXISTS (SELECT 1 FROM staff WHERE user_id = v_vet_id);

    INSERT INTO staff (user_id, branch_id, position, bio, is_active)
    SELECT v_staff_id, v_branch_id, 'Nhân viên lễ tân', 'Chăm sóc và điều phối lịch hẹn', true
    WHERE NOT EXISTS (SELECT 1 FROM staff WHERE user_id = v_staff_id);

END $$;
