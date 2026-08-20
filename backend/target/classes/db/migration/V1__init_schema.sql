-- ============================================================
-- Pet Care Platform — Flyway Migration V1
-- Initial Schema
-- ============================================================

-- ─── USERS & AUTH ────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    avatar_url  VARCHAR(500),
    role        VARCHAR(50)  NOT NULL DEFAULT 'CUSTOMER',
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

-- ─── BRANCHES ────────────────────────────────────────────────────────────────
CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    address     TEXT         NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    latitude    DECIMAL(10,8),
    longitude   DECIMAL(11,8),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

-- ─── STAFF ───────────────────────────────────────────────────────────────────
CREATE TABLE staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    branch_id   UUID         REFERENCES branches(id),
    position    VARCHAR(100),
    bio         TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

-- ─── SERVICE CATALOG ─────────────────────────────────────────────────────────
CREATE TABLE service_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    icon        VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE services (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID         REFERENCES service_categories(id),
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    base_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
    duration_minutes INT          NOT NULL DEFAULT 60,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE staff_skills (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id          UUID NOT NULL REFERENCES staff(id),
    service_id        UUID NOT NULL REFERENCES services(id),
    proficiency_level VARCHAR(50) DEFAULT 'INTERMEDIATE',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PETS ────────────────────────────────────────────────────────────────────
CREATE TABLE breeds (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    species     VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE pets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID         NOT NULL REFERENCES users(id),
    breed_id      UUID         REFERENCES breeds(id),
    name          VARCHAR(255) NOT NULL,
    species       VARCHAR(100) NOT NULL,
    gender        VARCHAR(20),
    date_of_birth DATE,
    weight        DECIMAL(6,2),
    photo_url     VARCHAR(500),
    notes         TEXT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);

-- ─── MEDICAL ─────────────────────────────────────────────────────────────────
CREATE TABLE medical_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id      UUID         NOT NULL REFERENCES pets(id),
    vet_name    VARCHAR(255),
    diagnosis   TEXT,
    treatment   TEXT,
    notes       TEXT,
    visit_date  DATE         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE vaccinations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id            UUID         NOT NULL REFERENCES pets(id),
    vaccine_name      VARCHAR(255) NOT NULL,
    administered_date DATE         NOT NULL,
    next_due_date     DATE,
    vet_name          VARCHAR(255),
    batch_number      VARCHAR(100),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version           BIGINT       NOT NULL DEFAULT 0
);

-- ─── RESOURCES ───────────────────────────────────────────────────────────────
CREATE TABLE resources (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID         REFERENCES branches(id),
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(100),
    capacity     INT          DEFAULT 1,
    is_available BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version      BIGINT       NOT NULL DEFAULT 0
);

-- ─── SCHEDULING ──────────────────────────────────────────────────────────────
CREATE TABLE schedules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id     UUID         NOT NULL REFERENCES staff(id),
    work_date    DATE         NOT NULL,
    start_time   TIME         NOT NULL,
    end_time     TIME         NOT NULL,
    is_available BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version      BIGINT       NOT NULL DEFAULT 0,
    UNIQUE (staff_id, work_date)
);

CREATE TABLE time_slots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id  UUID         REFERENCES schedules(id),
    resource_id  UUID         REFERENCES resources(id),
    start_time   TIMESTAMPTZ  NOT NULL,
    end_time     TIMESTAMPTZ  NOT NULL,
    is_booked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version      BIGINT       NOT NULL DEFAULT 0
);

-- ─── PROMOTIONS ──────────────────────────────────────────────────────────────
CREATE TABLE promotions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(50)  NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    discount_type     VARCHAR(50)  NOT NULL,
    discount_value    DECIMAL(12,2) NOT NULL,
    min_order_amount  DECIMAL(12,2) DEFAULT 0,
    max_uses          INT,
    used_count        INT          NOT NULL DEFAULT 0,
    start_date        DATE,
    end_date          DATE,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version           BIGINT       NOT NULL DEFAULT 0
);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID         NOT NULL REFERENCES users(id),
    pet_id          UUID         NOT NULL REFERENCES pets(id),
    branch_id       UUID         REFERENCES branches(id),
    promotion_id    UUID         REFERENCES promotions(id),
    status          VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE booking_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID         NOT NULL REFERENCES bookings(id),
    service_id   UUID         NOT NULL REFERENCES services(id),
    staff_id     UUID         REFERENCES staff(id),
    time_slot_id UUID         REFERENCES time_slots(id),
    status       VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    unit_price   DECIMAL(12,2) NOT NULL,
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version      BIGINT       NOT NULL DEFAULT 0
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id       UUID         NOT NULL REFERENCES bookings(id),
    amount           DECIMAL(12,2) NOT NULL,
    method           VARCHAR(50)  NOT NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    transaction_id   VARCHAR(255),
    idempotency_key  VARCHAR(255) UNIQUE,
    gateway_response JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0
);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID         NOT NULL REFERENCES bookings(id),
    payment_id     UUID         REFERENCES payments(id),
    invoice_number VARCHAR(50)  NOT NULL UNIQUE,
    total_amount   DECIMAL(12,2) NOT NULL,
    issued_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version        BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE invoice_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID         NOT NULL REFERENCES invoices(id),
    description VARCHAR(500) NOT NULL,
    quantity    INT          NOT NULL DEFAULT 1,
    unit_price  DECIMAL(12,2) NOT NULL,
    subtotal    DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── LOYALTY ─────────────────────────────────────────────────────────────────
CREATE TABLE loyalty_accounts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL UNIQUE REFERENCES users(id),
    points     BIGINT      NOT NULL DEFAULT 0,
    tier       VARCHAR(50) NOT NULL DEFAULT 'BRONZE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version    BIGINT      NOT NULL DEFAULT 0
);

CREATE TABLE loyalty_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID        NOT NULL REFERENCES loyalty_accounts(id),
    booking_id  UUID        REFERENCES bookings(id),
    type        VARCHAR(50) NOT NULL,
    points      BIGINT      NOT NULL,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INVENTORY ───────────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id    UUID         REFERENCES branches(id),
    name         VARCHAR(255) NOT NULL,
    sku          VARCHAR(100) NOT NULL UNIQUE,
    quantity     DECIMAL(12,3) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(12,3) NOT NULL DEFAULT 5,
    unit         VARCHAR(50),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version      BIGINT       NOT NULL DEFAULT 0
);

CREATE TABLE stock_movements (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id    UUID         NOT NULL REFERENCES inventory_items(id),
    type       VARCHAR(50)  NOT NULL,
    quantity   DECIMAL(12,3) NOT NULL,
    notes      TEXT,
    created_by UUID         REFERENCES users(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id),
    title          VARCHAR(255) NOT NULL,
    body           TEXT         NOT NULL,
    type           VARCHAR(100),
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_id   UUID,
    reference_type VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID        NOT NULL REFERENCES bookings(id),
    customer_id  UUID        NOT NULL REFERENCES users(id),
    rating       INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    is_published BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version      BIGINT      NOT NULL DEFAULT 0
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── AI ──────────────────────────────────────────────────────────────────────
CREATE TABLE ai_conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id),
    title      VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES ai_conversations(id),
    role            VARCHAR(20) NOT NULL,
    content         TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename   VARCHAR(500) NOT NULL,
    content    TEXT         NOT NULL,
    embedding  vector(1536),
    metadata   JSONB,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_pets_owner_id      ON pets(owner_id);
CREATE INDEX idx_bookings_customer  ON bookings(customer_id);
CREATE INDEX idx_bookings_status    ON bookings(status);
CREATE INDEX idx_bookings_pet_id    ON bookings(pet_id);
CREATE INDEX idx_payments_booking   ON payments(booking_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_staff_user_id      ON staff(user_id);
CREATE INDEX idx_inventory_sku      ON inventory_items(sku);
CREATE INDEX idx_reviews_booking    ON reviews(booking_id);
