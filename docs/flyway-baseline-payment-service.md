# Flyway Baseline Migration — Payment Service

## Problem

The payment-service had a migration history that violated Flyway's **immutable migration principle**:

```
V1__init_payment_schema.sql       → Created `payments` table with `owner_id UUID NOT NULL`
V2__sepay_orders_and_webhook.sql  → ALTER COLUMN `owner_id` DROP NOT NULL
V3__booking_orders_and_event_outbox.sql  → Added orders, payment_events, outbox_events
```

**Issue:** V2 modifies a table created in V1 (`ALTER COLUMN owner_id DROP NOT NULL`). This is an anti-pattern because:
- Flyway validates checksums on every migrate
- If V1 was already applied to a DB, V2's ALTER will fail or behave unexpectedly
- Migrations should be additive only; never modify previous migrations

## Solution: Baseline Migration (V4)

Created `V4__baseline_payment_schema.sql` that combines V1 + V2 + V3 into a single migration for **fresh database deployments**.

### Migration Files

| File | Purpose |
|------|---------|
| `V1__init_payment_schema.sql` | Original V1 — kept for history |
| `V2__sepay_orders_and_webhook.sql.bak` | Renamed from `.sql` → excluded from Flyway |
| `V3__booking_orders_and_event_outbox.sql.bak` | Renamed from `.sql` → excluded from Flyway |
| `V4__baseline_payment_schema.sql` | **New baseline** — combines all three for fresh DBs |

### V4 Contents (Single Migration)

1. **SePay/VietQR Orders** (`orders` table) — from V2
2. **Payments** (`payments` table) — from V1, with `owner_id` nullable from the start
3. **Payment Transactions** (`payment_transactions`) — from V3, with all V2 extensions (idempotency keys, provider IDs)
4. **Inbox Events** (`inbox_events`) — idempotent consumption
5. **Outbox Events** (`outbox_events`) — transactional outbox pattern
6. **Payment Events** (`payment_events`) — event-driven notifications

## Deployment Strategies

### Fresh Database (CI/CD, New Environments)

```bash
# Flyway automatically picks up V4 as the first migration
flyway migrate
# Result: V4 applied, schema at version 4
```

### Existing Database (Already has V1 Applied)

**Option 1: Flyway Repair (Recommended)**
```bash
# Marks V4 as "already applied" without executing it
flyway repair
# Then migrate normally - V4 skipped, V5+ applied
flyway migrate
```

**Option 2: Manual Baseline**
```bash
# If repair doesn't work
flyway baseline -baselineVersion=4
flyway migrate
```

## Checksum Validation

Flyway validates checksums on each migrate. Since V2/V3 are renamed to `.bak`:
- They are **ignored** by Flyway (only `.sql` files are scanned)
- No checksum conflicts on existing DBs
- Clean history for new DBs

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Keep V1 as `.sql` | Preserves audit trail; Flyway sees it but checksum matches |
| Rename V2/V3 to `.bak` | Excludes from Flyway scan; no validation conflicts |
| V4 combines all tables | Single baseline = one version for fresh DBs |
| `owner_id` nullable in V4 | Avoids ALTER COLUMN; matches final desired state |
| All indexes in V4 | No separate migration for indexes |

## Verification

```bash
# Fresh DB
flyway migrate
flyway info
# Should show: V4 baseline applied, V5+ pending

# Existing DB (after repair)
flyway migrate
flyway info
# Should show: V1 applied, V4 marked as "Success" (repaired), V5+ applied
```

## Rollback

Flyway doesn't support rollback for baseline migrations. To revert:
1. Drop all payment tables manually
2. Run `flyway clean` (if in dev)
3. Re-run migrations from V1 (or V4 for fresh)

---

**See also:** `docs/database-change-assessment.md` for the broader database migration strategy assessment.