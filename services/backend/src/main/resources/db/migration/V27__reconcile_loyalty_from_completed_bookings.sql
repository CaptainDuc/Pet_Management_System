-- Only completed and paid appointments count toward loyalty membership.
WITH earned AS (
    SELECT a.id,
           COALESCE(SUM(FLOOR(b.total_amount / 10000)), 0)::bigint AS points
    FROM loyalty_accounts a
    LEFT JOIN bookings b ON b.customer_id = a.user_id
        AND b.status = 'COMPLETED' AND b.payment_status = 'PAID'
    GROUP BY a.id
), qualified AS (
    SELECT id, points,
           CASE WHEN points >= 500 THEN 'KIM CƯƠNG'
                WHEN points >= 300 THEN 'BẠCH KIM'
                WHEN points >= 200 THEN 'VÀNG'
                WHEN points >= 100 THEN 'BẠC'
                WHEN points >= 50 THEN 'ĐỒNG'
                ELSE 'CHƯA CÓ HẠNG' END AS tier
    FROM earned
)
UPDATE loyalty_accounts a
SET points = q.points,
    lifetime_points = q.points,
    tier = q.tier,
    tier_achieved_at = CASE WHEN a.tier IS DISTINCT FROM q.tier THEN NOW() ELSE a.tier_achieved_at END,
    benefits_claimed = CASE WHEN a.tier IS DISTINCT FROM q.tier THEN '[]'::jsonb ELSE a.benefits_claimed END,
    updated_at = NOW()
FROM qualified q
WHERE a.id = q.id
  AND (a.points IS DISTINCT FROM q.points OR a.lifetime_points IS DISTINCT FROM q.points OR a.tier IS DISTINCT FROM q.tier);
