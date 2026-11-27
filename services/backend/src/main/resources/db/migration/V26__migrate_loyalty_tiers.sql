-- Migrate old English tier names to new Vietnamese tier names
-- Mapping based on minPoints threshold:
-- BRONZE (0) -> CHƯA CÓ HẠNG (0)
-- SILVER (500) -> ĐỒNG (50)
-- GOLD (1500) -> BẠC (100)
-- DIAMOND (3000) -> VÀNG (200) or higher based on points

-- First, update tier names based on points for existing accounts
UPDATE loyalty_accounts
SET tier = CASE
    WHEN points >= 500 THEN 'KIM CƯƠNG'
    WHEN points >= 300 THEN 'BẠCH KIM'
    WHEN points >= 200 THEN 'VÀNG'
    WHEN points >= 100 THEN 'BẠC'
    WHEN points >= 50 THEN 'ĐỒNG'
    ELSE 'CHƯA CÓ HẠNG'
END
WHERE tier IN ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');

-- Also update benefits_claimed tier names for consistency
UPDATE loyalty_accounts
SET benefits_claimed = REPLACE(benefits_claimed::text, '"BRONZE"', '"CHƯA CÓ HẠNG"')::jsonb
WHERE benefits_claimed::text LIKE '%"BRONZE"%';

UPDATE loyalty_accounts
SET benefits_claimed = REPLACE(benefits_claimed::text, '"SILVER"', '"ĐỒNG"')::jsonb
WHERE benefits_claimed::text LIKE '%"SILVER"%';

UPDATE loyalty_accounts
SET benefits_claimed = REPLACE(benefits_claimed::text, '"GOLD"', '"BẠC"')::jsonb
WHERE benefits_claimed::text LIKE '%"GOLD"%';

UPDATE loyalty_accounts
SET benefits_claimed = REPLACE(benefits_claimed::text, '"DIAMOND"', '"KIM CƯƠNG"')::jsonb
WHERE benefits_claimed::text LIKE '%"DIAMOND"%';