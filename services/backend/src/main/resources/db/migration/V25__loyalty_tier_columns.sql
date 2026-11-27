-- Add tier-related columns to loyalty_accounts
ALTER TABLE loyalty_accounts
    ADD COLUMN IF NOT EXISTS lifetime_points BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tier_achieved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS benefits_claimed JSONB DEFAULT '[]'::jsonb;

-- Update existing accounts to have lifetime_points = points (assuming points were never redeemed)
UPDATE loyalty_accounts
SET lifetime_points = GREATEST(lifetime_points, points)
WHERE lifetime_points = 0 AND points > 0;

-- Set tier_achieved_at for existing accounts
UPDATE loyalty_accounts
SET tier_achieved_at = created_at
WHERE tier_achieved_at IS NULL;