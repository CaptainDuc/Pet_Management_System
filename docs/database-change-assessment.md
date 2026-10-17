# Database Change Assessment

## Conclusion

Payment and Notification are independent Spring Boot services with separate PostgreSQL databases. Their physical schemas are owned by migrations under `services/payment-service` and `services/notification-service`; backend migration V2 removes the legacy copies from Core DB.

Do not rewrite an already-applied Flyway V1. Add a versioned migration after confirming whether any environment has applied V1 and whether inventory data must be retained.

## Decision Table

| Item | Decision | Database action | Application action |
|---|---|---|---|
| Inventory | Remove from MVP | Drop `stock_movements` before `inventory_items` in a later migration | Remove inventory API, event topology and Web/Mobile navigation after checking consumers |
| Veterinarian schedule | Add | Add `veterinarian_schedules`, time checks and non-overlap exclusion constraint | Add schedule CRUD and availability query |
| Appointment collision | Required | Add an exclusion constraint for active appointments by veterinarian and time range | Create/reschedule in one transaction and map constraint violation to HTTP 409 |
| Payment gateway history | Added to Payment DB baseline | Immutable `payment_transactions` with provider IDs and idempotency constraints | Persist attempt before gateway call; reconcile callbacks idempotently |
| Refresh token | Add | Add hashed `refresh_tokens`, rotation family and revoke timestamps | Separate access/refresh token types; rotate on refresh and revoke on logout/reuse |
| AI Vision history | Add for this target model | Add `vision_analyses`; store only image metadata/key and result JSON | Validate upload, store file externally, persist PENDING/SUCCESS/FAILED states |
| Coupon uniqueness | Fix | Remove `UNIQUE(coupon_id, user_id)`; make invoice redemption unique | Lock coupon and enforce `per_user_limit` during redemption, not validation |
| Documentation stack | Fix | Flyway is the migration tool | Primary backend is Spring Boot; AI is Python/FastAPI; clients are React/Vite and React Native/Expo |

## Migration Notes

PostgreSQL needs `btree_gist` for exclusion constraints that combine UUID equality with time-range overlap. A representative rule is:

```sql
EXCLUDE USING gist (
    veterinarian_id WITH =,
    tsrange(appointment_date + start_time,
            appointment_date + end_time, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));
```

Use the same half-open range rule for veterinarian schedules. If the clinic supports multiple time zones, prefer `starts_at` and `ends_at` as `TIMESTAMPTZ` instead of composing a local date and time.

For coupons, the correct base constraints are:

```sql
UNIQUE (invoice_id)
-- Optional additional defense when invoice_id is not globally unique in a future design:
UNIQUE (coupon_id, invoice_id)
```

`per_user_limit` is a count-based business rule and must be checked in the same transaction that inserts usage. A unique `(coupon_id, user_id)` constraint is valid only when the limit is permanently fixed at one.

## Implementation Status

This documentation update does not claim that these tables or rules already exist. Before implementation, align the Java entities and the physical Flyway schema, then add PostgreSQL integration tests for:

- Concurrent appointments for the same veterinarian.
- Adjacent non-overlapping appointments.
- Duplicate payment callbacks and partial refunds.
- Refresh rotation, logout and token reuse.
- Two concurrent attempts to consume the last coupon usage.
- Vision upload failure and ownership checks.
