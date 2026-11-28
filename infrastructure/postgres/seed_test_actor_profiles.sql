-- Fictional, consistent profiles for local role testing. Keep .invalid emails and passwords unchanged.
WITH profiles(email, full_name, phone) AS (VALUES
    ('customer.test@petcare.invalid', 'Nguyễn An Nhiên', '0900000101'),
    ('admin.test@petcare.invalid', 'Lê Hoàng Minh', '0900000102'),
    ('owner.test@petcare.invalid', 'Trần Gia Bảo', '0900000103'),
    ('staff.test@petcare.invalid', 'Phạm Thảo Vy', '0900000104'),
    ('vet.test@petcare.invalid', 'Nguyễn Khánh Linh', '0900000105'),
    ('vet.a.test@petcare.invalid', 'Đặng Quốc Huy', '0900000106'),
    ('vet.b.test@petcare.invalid', 'Võ Thanh Hà', '0900000107'),
    ('vet.c.test@petcare.invalid', 'Phan Minh Châu', '0900000108'),
    ('vet.d.test@petcare.invalid', 'Lưu Nhật Nam', '0900000109'),
    ('customer.flow.test@petcare.invalid', 'Võ Mai Anh', '0900000110'),
    ('booking-demo-f526654e2460@petcare.invalid', 'Đỗ Minh Khang', '0900000111')
)
UPDATE users u SET full_name = p.full_name, phone = p.phone, updated_at = NOW()
FROM profiles p WHERE u.email = p.email;

UPDATE staff s SET position = CASE WHEN u.email = 'staff.test@petcare.invalid' THEN 'Lễ tân' ELSE 'Bác sĩ thú y' END,
                   bio = CASE WHEN u.email = 'staff.test@petcare.invalid'
                              THEN 'Tiếp đón khách hàng và hỗ trợ thanh toán tại phòng khám.'
                              ELSE 'Khám sức khỏe và chăm sóc thú cưng tại phòng khám.' END,
                   updated_at = NOW()
FROM users u WHERE s.user_id = u.id AND u.email IN (
    'staff.test@petcare.invalid', 'vet.test@petcare.invalid',
    'vet.a.test@petcare.invalid', 'vet.b.test@petcare.invalid',
    'vet.c.test@petcare.invalid', 'vet.d.test@petcare.invalid');

UPDATE pets p SET name = CASE WHEN u.email = 'customer.test@petcare.invalid' THEN 'Bông' ELSE 'Milo' END,
                  species = 'Chó', updated_at = NOW()
FROM users u WHERE p.owner_id = u.id
    AND ((u.email = 'customer.test@petcare.invalid' AND p.name = 'ss')
      OR (u.email = 'customer.flow.test@petcare.invalid' AND p.name = 'Flow Test Pet'));
