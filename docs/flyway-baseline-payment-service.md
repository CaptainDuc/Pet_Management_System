# Payment migration compatibility for the merge

## Canonical migration chain

The merged source keeps V1, V2 and V3 exactly as published on origin/nguyentam.
V2 extends the V1 schema; V3 adds booking payment events. Later ALTER statements
are normal versioned migrations and do not invalidate V1.

V4__retired_baseline_marker.sql only runs SELECT 1. It reserves version 4 without
creating existing tables again. The old V4 baseline is kept for audit and the
compatibility test under infrastructure/postgres/payment-history; it is outside
Flyway's active classpath locations.

## Database paths

| Existing state | Required action |
|---|---|
| Empty database | Start the updated payment service; V1-V4 run normally. |
| V1 only | Normal migrate applies V2, V3 and the marker. |
| V1-V3 from the other branch | Normal migrate applies only the marker. |
| Known V1 + old V4 on this local machine | Run the guarded adoption tool first. |
| Unknown history/checksum/schema | Stop and inspect; the adoption tool refuses it. |

The previous advice to rename applied V2/V3 to .bak and repair automatically
was incorrect. Repair does not mark pending migrations as executed. Do not use
repair or baseline blindly to hide a mismatch, and do not reset Docker volumes.

## Inspect and adopt the known legacy V4

Stop the payment application during adoption and leave its PostgreSQL container
running. From the project root:

```powershell
python scripts/normalize-payment-history.py
```

The default is read-only. It prints version/checksum metadata, never credentials.
For the known legacy history only:

```powershell
python scripts/normalize-payment-history.py --apply
```

The tool first writes a full pg_dump under ignored .local-backups/. If backup
fails, it does not modify history. The SQL locks the Flyway history table, checks
the exact legacy checksums and required schema objects, then records the already
present V2/V3 features in canonical history. It also restores the four V2 column
settings omitted on some legacy installations: nullable payment_id and defaults
for transaction_type, provider and idempotency_key. Orders, payments, bank
references and transaction payloads stay unchanged. Original history remains
in the full backup. Business row counts are
checked before and after.

Then build/start the updated payment service. Flyway validation stays enabled;
it applies the no-op V4 marker using the normal migration mechanism. Neither
application startup nor the adoption tool automatically runs Flyway repair.

The known checksums are V1=83097785, V2=-1182131905, V3=1911053231 and archived
legacy V4=995927507. Tests obtain canonical checksums from Flyway itself to catch
accidental changes to the immutable migration files.

## Verification

PaymentMigrationTest uses a disposable PostgreSQL database and covers fresh
install, V1 upgrade with retained payment data, V1-V3 upgrade with retained order
data, legacy V1+V4 adoption with retained order/transaction data, repeat adoption,
restoration of legacy V1 column settings for SePay callbacks, and rejection of
unknown checksum or incomplete schema. There are seven integration tests.

From services/backend, using its existing Maven wrapper:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12.1'
.\mvnw.cmd -f ../payment-service/pom.xml test -B
```

The other developer's database history still needs to be inspected on their own
machine; Git does not copy their database or environment secrets. Keep the
backup until both developers have validated the merged branch.
