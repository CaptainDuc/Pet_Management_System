-- ============================================================
-- Pet Care Platform — Flyway Migration V5
-- RBAC permission catalogue and default role grants
--
-- CustomUserDetailsService turns every permission attached to a role into a
-- GrantedAuthority, so @PreAuthorize("hasAuthority('module:action')") could never
-- pass: the roles seeded in V4 had no permissions at all.
--
-- Codes follow the module:action convention used across docs/api-contracts.md.
-- Re-running is safe: every insert is ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO permissions (code, name, module, description) VALUES
    -- User & account management
    ('user:read',        'Xem người dùng',        'user',        'Xem danh sách và hồ sơ người dùng'),
    ('user:update',      'Cập nhật người dùng',  'user',        'Cập nhật hồ sơ người dùng'),
    ('user:set-status',  'Đổi trạng thái user',  'user',        'Kích hoạt / vô hiệu hoá / khoá tài khoản'),
    ('user:set-roles',   'Gán role cho user',    'user',        'Gán và gỡ role cho người dùng'),

    -- RBAC administration
    ('rbac:read',        'Xem role và quyền',    'rbac',        'Xem danh sách role và permission'),
    ('rbac:write',       'Quản lý role/quyền',  'rbac',        'Tạo, sửa, xoá role và phân quyền'),

    -- Pet profiles
    ('pet:read',         'Xem thú cưng',         'pet',         'Xem hồ sơ thú cưng'),
    ('pet:write',        'Quản lý thú cưng',    'pet',         'Tạo, cập nhật, xoá thú cưng'),

    -- Staff
    ('staff:read',       'Xem nhân viên',        'staff',       'Xem hồ sơ nhân viên và kỹ năng'),
    ('staff:write',      'Quản lý nhân viên',   'staff',       'Tạo, cập nhật, phân công chi nhánh và kỹ năng'),

    -- Branch & service catalog
    ('branch:read',      'Xem chi nhánh',        'branch',      'Xem danh sách chi nhánh'),
    ('branch:write',     'Quản lý chi nhánh',   'branch',      'Tạo, cập nhật, bật/tắt chi nhánh'),
    ('service:read',     'Xem dịch vụ',          'service',     'Xem danh mục và giá dịch vụ'),
    ('service:write',    'Quản lý dịch vụ',     'service',     'Tạo, cập nhật, bật/tắt dịch vụ'),

    -- Scheduling
    ('schedule:read',    'Xem lịch làm việc',    'schedule',    'Xem lịch và slot trống'),
    ('schedule:write',   'Quản lý lịch làm việc','schedule',    'Tạo, cập nhật, xoá ca làm việc'),

    -- Bookings
    ('booking:read',     'Xem lịch hẹn',         'booking',     'Xem danh sách và chi tiết lịch hẹn'),
    ('booking:create',   'Tạo lịch hẹn',        'booking',     'Đặt lịch hẹn'),
    ('booking:update',   'Cập nhật lịch hẹn',    'booking',     'Xác nhận, bắt đầu, hoàn thành lịch hẹn'),
    ('booking:cancel',   'Huỷ lịch hẹn',        'booking',     'Huỷ lịch hẹn và giải phóng slot'),

    -- Invoice
    ('invoice:read',     'Xem hoá đơn',          'invoice',     'Xem hoá đơn và chi tiết hoá đơn'),
    ('invoice:write',    'Quản lý hoá đơn',      'invoice',     'Phát hành và huỷ hoá đơn'),

    -- Promotion
    ('promotion:read',   'Xem khuyến mãi',       'promotion',   'Xem danh sách và điều kiện khuyến mãi'),
    ('promotion:write',  'Quản lý khuyến mãi',   'promotion',   'Tạo, sửa, bật/tắt và redeem khuyến mãi'),

    -- Medical
    ('medical:read',     'Xem hồ sơ bệnh án',    'medical',     'Xem hồ sơ khám và lịch tiêm'),
    ('medical:create',   'Tạo hồ sơ bệnh án',   'medical',     'Ghi hồ sơ khám bệnh'),
    ('medical:update',   'Cập nhật hồ sơ',      'medical',     'Cập nhật chẩn đoán và điều trị'),

    -- Loyalty
    ('loyalty:read',     'Xem điểm tích luỹ',    'loyalty',     'Xem tài khoản và lịch sử điểm'),
    ('loyalty:adjust',   'Điều chỉnh điểm',     'loyalty',     'Cộng/trừ điểm thủ công'),

    -- Review
    ('review:create',    'Đánh giá',             'review',      'Tạo đánh giá cho lịch hẹn đã hoàn thành'),
    ('review:read',      'Xem đánh giá',         'review',      'Xem đánh giá đã công bố'),
    ('review:moderate',  'Duyệt đánh giá',       'review',      'Publish / unpublish đánh giá'),

    -- AI
    ('ai:chat',          'Dùng trợ lý AI',       'ai',          'Gửi tin nhắn tới AI và RAG'),
    ('ai:manage-docs',   'Quản lý tài liệu RAG', 'ai',          'Upload và xoá tài liệu tri thức'),

    -- Audit
    ('audit:read',       'Xem nhật ký thao tác', 'audit',       'Tra cứu audit log')
ON CONFLICT (code) DO NOTHING;

-- ─── Default role grants ───────────────────────────────────────────────────
-- ADMIN: full access. Everything, including RBAC administration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- OWNER: clinic operations and reporting, but RBAC administration stays ADMIN-only.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
    'user:read', 'user:update', 'user:set-status',
    'pet:read', 'pet:write',
    'staff:read', 'staff:write',
    'branch:read', 'branch:write',
    'service:read', 'service:write',
    'schedule:read', 'schedule:write',
    'booking:read', 'booking:create', 'booking:update', 'booking:cancel',
    'invoice:read', 'invoice:write',
    'promotion:read', 'promotion:write',
    'medical:read', 'medical:create', 'medical:update',
    'loyalty:read', 'loyalty:adjust',
    'review:read', 'review:moderate',
    'ai:chat', 'ai:manage-docs',
    'audit:read')
WHERE r.name = 'OWNER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- VETERINARIAN: clinical work plus the appointments they are responsible for.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
    'user:read',
    'pet:read', 'pet:write',
    'schedule:read',
    'booking:read', 'booking:create', 'booking:update',
    'invoice:read',
    'medical:read', 'medical:create', 'medical:update',
    'ai:chat')
WHERE r.name = 'VETERINARIAN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STAFF: front desk — bookings, invoicing, client onboarding.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
    'user:read',
    'pet:read', 'pet:write',
    'staff:read',
    'branch:read',
    'service:read',
    'schedule:read',
    'booking:read', 'booking:create', 'booking:update', 'booking:cancel',
    'invoice:read', 'invoice:write',
    'promotion:read',
    'ai:chat')
WHERE r.name = 'STAFF'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CUSTOMER: own pets, own bookings, own review, AI assistant.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
    'pet:read', 'pet:write',
    'service:read',
    'booking:read', 'booking:create', 'booking:cancel',
    'invoice:read',
    'medical:read',
    'loyalty:read',
    'review:create',
    'ai:chat')
WHERE r.name = 'CUSTOMER'
ON CONFLICT (role_id, permission_id) DO NOTHING;