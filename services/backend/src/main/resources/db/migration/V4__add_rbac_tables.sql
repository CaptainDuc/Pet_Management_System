-- ============================================================
-- Pet Care Platform — Flyway Migration V4
-- RBAC tables (API contract P-2)
--
-- rbac/domain/Role.java, rbac/domain/Permission.java and the user/role mapping on
-- user/domain/User.java already reference these tables, so /api/v1/rbac/** and
-- POST /api/v1/users/{id}/roles cannot work until they exist.
--
-- users.role stays as the single primary role that CustomUserDetailsService turns
-- into ROLE_<name>; roles + user_roles add the many-to-many assignment and
-- per-role permissions.
-- ============================================================

CREATE TABLE roles (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE permissions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    module      VARCHAR(100),
    description VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

-- Managed by @ManyToMany on rbac/domain/Role.
CREATE TABLE role_permissions (
    role_id       UUID        NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID        NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Managed by @ManyToMany on user/domain/User.
CREATE TABLE user_roles (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID        NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Roles referenced by architecture.md and enforced by @PreAuthorize / SecurityConfig.
-- ON CONFLICT keeps this migration re-runnable against a pre-seeded environment.
INSERT INTO roles (name, description) VALUES
    ('CUSTOMER',     'Khách hàng — hồ sơ, thú cưng, đặt lịch, thanh toán, đánh giá'),
    ('STAFF',        'Lễ tân / nhân viên — lịch hẹn, hóa đơn, thanh toán'),
    ('VETERINARIAN', 'Bác sĩ thú y — hồ sơ bệnh án, chẩn đoán, kê đơn'),
    ('OWNER',        'Chủ phòng khám — quản lý, báo cáo doanh thu, nhân sự, khuyến mãi'),
    ('ADMIN',        'Quản trị hệ thống — cấu hình, RBAC, tài liệu tri thức RAG')
ON CONFLICT (name) DO NOTHING;