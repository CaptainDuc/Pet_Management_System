ALTER TABLE promotions ADD COLUMN IF NOT EXISTS gift_all_existing BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS promotion_grants (
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (promotion_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_promotion_grants_user ON promotion_grants(user_id);
