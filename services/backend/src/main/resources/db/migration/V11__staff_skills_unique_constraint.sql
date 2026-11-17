-- ============================================================
-- Pet Care Platform — Flyway Migration V11
-- Add Unique Constraint on staff_skills(staff_id, service_id)
-- ============================================================

-- A staff member can have at most one skill entry per service
-- This prevents duplicate proficiency records for the same service
ALTER TABLE staff_skills
    ADD CONSTRAINT uq_staff_skills_staff_service UNIQUE (staff_id, service_id);