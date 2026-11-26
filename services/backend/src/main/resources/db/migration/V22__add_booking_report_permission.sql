-- Thêm permission booking:report và cấp cho CUSTOMER
INSERT INTO permissions (code, name, module, description) VALUES
    ('booking:report', 'Trao đổi/Phản hồi', 'booking', 'Gửi tin nhắn trao đổi với phòng khám')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code = 'booking:report'
WHERE r.name = 'CUSTOMER'
ON CONFLICT (role_id, permission_id) DO NOTHING;