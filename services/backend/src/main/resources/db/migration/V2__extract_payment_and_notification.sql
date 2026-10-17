-- Payment and notification are owned by independent services and databases.
-- Cross-service references remain UUID values in events/API contracts, not foreign keys.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM payments) THEN
        RAISE EXCEPTION 'payments contains data; backfill Payment DB before applying V2';
    END IF;
    IF EXISTS (SELECT 1 FROM notifications) THEN
        RAISE EXCEPTION 'notifications contains data; backfill Notification DB before applying V2';
    END IF;
END $$;

ALTER TABLE invoices DROP COLUMN IF EXISTS payment_id;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS notifications;
