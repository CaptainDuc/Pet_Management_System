-- ============================================================
-- Pet Care Platform — Flyway Migration V10
-- MVP Core Tables: Veterinarians, Species, Memberships, Outbox
-- ============================================================

-- ─── Enable btree_gist for exclusion constraints ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 1. PET SPECIES (Normalize species) ──────────────────────────────────────────
CREATE TABLE pet_species (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

-- Migrate existing species from breeds
INSERT INTO pet_species (name)
SELECT DISTINCT species FROM breeds
WHERE species IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add species_id to breeds
ALTER TABLE breeds ADD COLUMN species_id UUID REFERENCES pet_species(id);

-- Backfill breeds.species_id from pet_species
UPDATE breeds b
SET species_id = s.id
FROM pet_species s
WHERE b.species = s.name;

-- ─── 2. VETERINARIANS (Separate from staff) ──────────────────────────────────────
CREATE TABLE veterinarians (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id),
    license_number      VARCHAR(100) NOT NULL UNIQUE,
    specialization      VARCHAR(255),
    years_experience    INT,
    bio                 TEXT,
    consultation_fee    DECIMAL(12,2),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_veterinarians_user_id ON veterinarians(user_id);

-- ─── 3. VETERINARIAN SCHEDULES (with exclusion constraint) ───────────────────────
CREATE TABLE veterinarian_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veterinarian_id UUID NOT NULL REFERENCES veterinarians(id),
    work_date       DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);

-- Exclusion constraint: no overlapping schedules for same veterinarian on same day
-- Use timestamp (without time zone) for tsrange, then cast back
ALTER TABLE veterinarian_schedules
    ADD CONSTRAINT uq_veterinarian_schedule_no_overlap
    EXCLUDE USING gist (
        veterinarian_id WITH =,
        tsrange(
            (work_date + start_time)::timestamp,
            (work_date + end_time)::timestamp,
            '[)'
        ) WITH &&
    )
    WHERE (is_available);

CREATE INDEX idx_veterinarian_schedules_vet_date ON veterinarian_schedules(veterinarian_id, work_date);
CREATE INDEX idx_veterinarian_schedules_available ON veterinarian_schedules(is_available) WHERE is_available;

-- ─── 4. APPOINTMENT SERVICES (Extend booking_items for appointment context) ──────
-- booking_items already exists; add appointment-specific columns
ALTER TABLE booking_items
    ADD COLUMN IF NOT EXISTS appointment_id UUID,
    ADD COLUMN IF NOT EXISTS service_duration_minutes INT,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ─── 5. APPOINTMENT STATUS HISTORY (Rename booking_status_history concept) ───────
-- booking_status_history exists; ensure it covers appointment-level status
-- Already created in V6, verify and extend if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'booking_status_history' AND column_name = 'appointment_id') THEN
        ALTER TABLE booking_status_history ADD COLUMN appointment_id UUID REFERENCES bookings(id);
    END IF;
END $$;

-- ─── 6. NOTIFICATION OUTBOX (Separate from outbox_events for notification service) ───
CREATE TABLE notification_outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    UUID NOT NULL,
    event_type      VARCHAR(150) NOT NULL,
    event_version   INT NOT NULL DEFAULT 1 CHECK (event_version > 0),
    payload         JSONB NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    retry_count     INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error      TEXT
);

CREATE INDEX idx_notification_outbox_unpublished
    ON notification_outbox(occurred_at)
    WHERE published_at IS NULL;

-- ─── 7. MEMBERSHIP SYSTEM (Separate from loyalty) ─────────────────────────────────
CREATE TABLE membership_tiers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(50) NOT NULL UNIQUE,
    display_name            VARCHAR(100) NOT NULL,
    description             TEXT,
    min_points              BIGINT NOT NULL DEFAULT 0,
    discount_percentage     DECIMAL(5,2) NOT NULL DEFAULT 0,
    free_shipping           BOOLEAN NOT NULL DEFAULT FALSE,
    priority_support        BOOLEAN NOT NULL DEFAULT FALSE,
    max_active_bookings     INT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE user_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id),
    tier_id         UUID NOT NULL REFERENCES membership_tiers(id),
    points          BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_tier ON user_memberships(tier_id);

CREATE TABLE membership_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id       UUID NOT NULL REFERENCES user_memberships(id),
    booking_id          UUID REFERENCES bookings(id),
    type                VARCHAR(30) NOT NULL
        CHECK (type IN ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE', 'TIER_UPGRADE', 'TIER_DOWNGRADE')),
    points              BIGINT NOT NULL,
    description         TEXT,
    reference_id        UUID,
    reference_type      VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_membership_transactions_membership ON membership_transactions(membership_id);
CREATE INDEX idx_membership_transactions_booking ON membership_transactions(booking_id) WHERE booking_id IS NOT NULL;

-- Seed default membership tiers
INSERT INTO membership_tiers (name, display_name, description, min_points, discount_percentage, free_shipping, priority_support, max_active_bookings)
VALUES
    ('BRONZE', 'Đồng', 'Thành viên mới', 0, 0.00, FALSE, FALSE, 3),
    ('SILVER', 'Bạc', 'Thành viên trung thành', 1000, 5.00, FALSE, FALSE, 5),
    ('GOLD', 'Vàng', 'Thành viên VIP', 5000, 10.00, TRUE, TRUE, 10),
    ('PLATINUM', 'Kim cương', 'Thành viên đặc quyền', 20000, 15.00, TRUE, TRUE, NULL)
ON CONFLICT (name) DO NOTHING;

-- ─── 8. APPOINTMENT COLLISION EXCLUSION CONSTRAINT ────────────────────────────────
-- Prevent overlapping appointments for same veterinarian
-- Requires: appointments have veterinarian_id, appointment_date, start_time, end_time
-- Note: bookings table links to staff, not directly to veterinarians yet
-- This will be enforced when appointments are linked to veterinarians

-- ─── 9. DROP INVENTORY TABLES (Remove from MVP per assessment) ────────────────────
-- Drop in correct order due to FK
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS inventory_items;

-- ─── 10. INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_breeds_species_id ON breeds(species_id);
CREATE INDEX idx_veterinarians_license ON veterinarians(license_number);