-- Run through scripts/normalize-payment-history.py, which backs up the database.
-- This adopts the known legacy V1+V4 schema into the canonical V1-V3 history.
-- Restore missing V2 column settings; no business rows or order codes are modified.
BEGIN;
LOCK TABLE flyway_schema_history IN EXCLUSIVE MODE;
DO $$
DECLARE
    object_name TEXT;
BEGIN
    IF (SELECT count(*) FROM flyway_schema_history WHERE success AND
        ((version='1' AND checksum=83097785) OR
         (version='2' AND checksum=-1182131905) OR
         (version='3' AND checksum=1911053231))) = 3 THEN
        IF EXISTS (SELECT 1 FROM flyway_schema_history WHERE version='4' AND checksum=995927507) THEN
            RAISE EXCEPTION 'Ambiguous canonical and legacy history; manual review required';
        END IF;
        RAISE NOTICE 'Canonical V1-V3 history already present; no adoption needed';
        RETURN;
    END IF;

    IF (SELECT count(*) FROM flyway_schema_history) <> 2 OR
       NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version='1' AND checksum=83097785 AND success) OR
       NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version='4' AND checksum=995927507 AND success) THEN
        RAISE EXCEPTION 'Unsupported payment migration history; no changes made';
    END IF;

    FOREACH object_name IN ARRAY ARRAY['payments','orders','payment_transactions','inbox_events','outbox_events','payment_events'] LOOP
        IF to_regclass(format('%I.%I', current_schema(), object_name)) IS NULL THEN
            RAISE EXCEPTION 'Missing expected legacy table: %', object_name;
        END IF;
    END LOOP;
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND
        ((table_name='orders' AND column_name='booking_id') OR
         (table_name='payment_transactions' AND column_name IN ('order_id','sepay_transaction_id','raw_payload','amount_in','content')))) <> 6 THEN
        RAISE EXCEPTION 'Legacy payment schema is incomplete; no history changes made';
    END IF;

    -- Some legacy installations retained these V1 settings despite recording V4.
    -- These are the exact V2 alterations, safe for both known legacy variants.
    ALTER TABLE payment_transactions ALTER COLUMN payment_id DROP NOT NULL;
    ALTER TABLE payment_transactions ALTER COLUMN transaction_type SET DEFAULT 'PAYMENT';
    ALTER TABLE payment_transactions ALTER COLUMN provider SET DEFAULT 'SEPAY';
    ALTER TABLE payment_transactions ALTER COLUMN idempotency_key SET DEFAULT (gen_random_uuid()::text);

    DELETE FROM flyway_schema_history WHERE version='4' AND checksum=995927507;
    INSERT INTO flyway_schema_history
        (installed_rank,version,description,type,script,checksum,installed_by,execution_time,success)
    VALUES ((SELECT coalesce(max(installed_rank),0)+1 FROM flyway_schema_history),
        '2','sepay orders and webhook','SQL','V2__sepay_orders_and_webhook.sql',-1182131905,current_user,0,true);
    INSERT INTO flyway_schema_history
        (installed_rank,version,description,type,script,checksum,installed_by,execution_time,success)
    VALUES ((SELECT coalesce(max(installed_rank),0)+1 FROM flyway_schema_history),
        '3','booking orders and event outbox','SQL','V3__booking_orders_and_event_outbox.sql',1911053231,current_user,0,true);
END $$;
COMMIT;
