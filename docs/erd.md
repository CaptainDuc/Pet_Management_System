# Pet Care Platform — Entity Relationship Diagram

> Đây là logical view xuyên service. Schema vật lý được chia thành Core DB, Payment DB và Notification DB; chỉ các quan hệ trong cùng database mới là foreign key. Flyway migration của từng service là nguồn sự thật cho database do service đó sở hữu.

## Mermaid ERD

```mermaid
erDiagram
    %% ─── USERS, ROLES & RBAC ─────────────────────────
    users {
        uuid id PK
        string email UK
        string username UK
        string password_hash
        string full_name
        string phone UK
        string address
        string avatar_url
        boolean active
        timestamp created_at
        timestamp updated_at
    }
    roles {
        uuid id PK
        string name UK "OWNER|VETERINARIAN|STAFF|ADMIN|CUSTOMER"
        string description
        timestamp created_at
    }
    user_roles {
        uuid user_id PK, FK
        uuid role_id PK, FK
        timestamp created_at
    }
    permissions {
        uuid id PK
        string code UK
        string name
        string module
        timestamp created_at
    }
    role_permissions {
        uuid role_id PK, FK
        uuid permission_id PK, FK
        timestamp created_at
    }
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        uuid token_family_id
        uuid replaced_by_token_id FK
        timestamp issued_at
        timestamp expires_at
        timestamp last_used_at
        timestamp revoked_at
        string revoke_reason
        string device_id
    }

    %% ─── PETS ─────────────────────────────────────
    pet_species {
        uuid id PK
        string name UK
        string description
    }
    pet_breeds {
        uuid id PK
        uuid species_id FK
        string name
    }
    pets {
        uuid id PK
        uuid owner_id FK
        uuid breed_id FK
        string name
        date birth_date
        decimal weight_kg
        string gender
        string avatar_url
        boolean active
        timestamp created_at
    }
    pet_allergies {
        uuid id PK
        uuid pet_id FK
        string allergen
        string severity
        string notes
    }
    pet_medications {
        uuid id PK
        uuid pet_id FK
        uuid medicine_id FK
        string dosage
        string status
    }

    %% ─── VETERINARY & STAFF ────────────────────────
    veterinarians {
        uuid id PK
        uuid user_id FK UK
        string license_number UK
        string specialization
        integer years_experience
        boolean active
    }
    veterinarian_schedules {
        uuid id PK
        uuid veterinarian_id FK
        date work_date
        time start_time
        time end_time
        string status "AVAILABLE|BOOKED|OFF"
    }

    %% ─── SERVICES & CATALOG ────────────────────────
    services {
        uuid id PK
        string name
        string description
        decimal price
        integer duration_minutes
        boolean active
        timestamp created_at
    }

    %% ─── APPOINTMENTS ──────────────────────────────
    appointments {
        uuid id PK
        string appointment_code UK
        uuid pet_id FK
        uuid owner_id FK
        uuid veterinarian_id FK
        date appointment_date
        time start_time
        time end_time
        string status "PENDING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW"
        string notes
        timestamp created_at
        timestamp updated_at
    }
    appointment_services {
        uuid appointment_id PK, FK
        uuid service_id PK, FK
        decimal price_snapshot
    }

    %% ─── MEDICAL RECORDS & PRESCRIPTIONS ───────────
    medical_records {
        uuid id PK
        uuid pet_id FK
        uuid veterinarian_id FK
        uuid appointment_id FK
        date visit_date
        string diagnosis
        string notes
        timestamp created_at
    }
    medicines {
        uuid id PK
        string name
        string description
        string unit
        decimal unit_price
        boolean active
    }
    prescriptions {
        uuid id PK
        uuid medical_record_id FK
        uuid veterinarian_id FK
        string notes
        timestamp created_at
    }
    prescription_items {
        uuid id PK
        uuid prescription_id FK
        uuid medicine_id FK
        integer quantity
        decimal price_snapshot
        string dosage
        string instructions
    }

    %% ─── INVOICES & PAYMENTS ───────────────────────
    invoices {
        uuid id PK
        string invoice_code UK
        uuid appointment_id FK
        uuid owner_id FK
        decimal subtotal
        decimal discount_amount
        decimal membership_discount
        decimal tax_amount
        decimal total_amount
        string status "UNPAID|PAID|CANCELLED|REFUNDED"
        timestamp issued_at
        timestamp created_at
    }
    invoice_items {
        uuid id PK
        uuid invoice_id FK
        string item_type "SERVICE|MEDICINE|OTHER"
        uuid service_id FK
        uuid medicine_id FK
        string description
        decimal unit_price
        integer quantity
        decimal total
    }
    payments {
        uuid id PK
        uuid invoice_id UK "external Core DB reference"
        uuid owner_id "external Core DB reference"
        uuid appointment_id "external Core DB reference"
        string payment_code UK
        decimal expected_amount
        decimal received_amount
        decimal refunded_amount
        string method "CASH|CARD|BANK_TRANSFER|QR"
        string status "PENDING|PROCESSING|PAID|FAILED|REFUNDED"
        string gateway_transaction_id
        timestamp paid_at
        timestamp refunded_at
        string refund_reason
    }
    payment_transactions {
        uuid id PK
        uuid payment_id FK
        string type "AUTHORIZE|CAPTURE|PAYMENT|REFUND|VOID|FAILURE"
        string provider
        string provider_transaction_id
        string provider_event_id
        string idempotency_key UK
        decimal amount
        string currency
        string status "PENDING|SUCCESS|FAILED"
        jsonb request_payload
        jsonb response_payload
        timestamp processed_at
        timestamp created_at
    }

    %% ─── PROMOTIONS & COUPONS ──────────────────────
    promotions {
        uuid id PK
        string name
        string description
        string discount_type "PERCENTAGE|FIXED_AMOUNT"
        decimal discount_value
        decimal min_order_amount
        timestamp valid_from
        timestamp valid_until
        boolean active
    }
    promotion_services {
        uuid promotion_id PK, FK
        uuid service_id PK, FK
    }
    coupons {
        uuid id PK
        uuid promotion_id FK
        string code UK
        integer usage_limit
        integer used_count
        integer per_user_limit
        timestamp starts_at
        timestamp expires_at
        string status "ACTIVE|DISABLED|EXPIRED"
    }
    coupon_usages {
        uuid id PK
        uuid coupon_id FK
        uuid user_id FK
        uuid invoice_id FK
        timestamp used_at
    }

    %% ─── MEMBERSHIP & LOYALTY ─────────────────────
    membership_tiers {
        uuid id PK
        string name UK "BRONZE|SILVER|GOLD|PLATINUM"
        integer min_points
        decimal earn_rate
        string description
    }
    user_memberships {
        uuid id PK
        uuid user_id FK UK
        uuid tier_id FK
        integer points
        timestamp updated_at
    }
    membership_transactions {
        uuid id PK
        uuid membership_id FK
        string type "EARN|REDEEM|ADJUST|EXPIRE"
        integer points
        string description
        timestamp created_at
    }

    %% ─── REVIEWS ──────────────────────────────────
    reviews {
        uuid id PK
        string review_code UK
        uuid user_id "external Core DB reference"
        uuid appointment_id "external Core DB reference"
        uuid invoice_id "external Core DB reference"
        uuid payment_id "external Payment DB reference"
        uuid veterinarian_id FK
        uuid service_id FK
        integer rating
        string comment
        string status "PUBLISHED|HIDDEN|FLAGGED"
        timestamp created_at
    }

    %% ─── AI / RAG & CHAT ──────────────────────────
    documents {
        uuid id PK
        string title
        string source
        string document_type
        text content
        timestamp published_at
        timestamp created_at
    }
    document_chunks {
        uuid id PK
        uuid document_id FK
        integer chunk_index
        text content
        vector embedding
        jsonb metadata
        timestamp created_at
    }
    conversations {
        uuid id PK
        uuid user_id FK
        uuid pet_id FK
        string title
        string status "OPEN|CLOSED"
        timestamp created_at
        timestamp updated_at
    }
    conversation_messages {
        uuid id PK
        uuid conversation_id FK
        string role "USER|ASSISTANT|SYSTEM"
        string message_type "TEXT|IMAGE|FILE"
        text content
        timestamp created_at
    }
    ai_requests {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        string request_type "CHAT|RAG|VISION|TOOL_CALL"
        string model
        integer input_tokens
        integer output_tokens
        integer latency_ms
        string status "PENDING|SUCCESS|FAILED"
        text error_message
        timestamp created_at
    }
    ai_tool_calls {
        uuid id PK
        uuid ai_request_id FK
        string tool_name
        jsonb arguments
        text result
        string status "PENDING|SUCCESS|FAILED"
        integer execution_time_ms
        timestamp created_at
    }
    vision_analyses {
        uuid id PK
        uuid ai_request_id FK, UK
        uuid user_id FK
        uuid pet_id FK
        string image_storage_key
        string image_sha256
        string image_mime_type
        integer image_size_bytes
        string model_name
        string model_version
        string status "PENDING|SUCCESS|FAILED"
        jsonb result
        decimal confidence
        text error_message
        timestamp created_at
        timestamp completed_at
    }

    %% ─── SYSTEM & NOTIFICATIONS ───────────────────
    notifications {
        uuid id PK
        uuid user_id FK
        uuid appointment_id FK
        string title
        string message
        string type
        boolean is_read
        timestamp read_at
        timestamp created_at
    }
    notification_outbox {
        uuid id PK
        string deduplication_key UK
        string event_type
        uuid recipient_user_id FK
        string channel "EMAIL|SMS|PUSH"
        jsonb payload
        string status "PENDING|SENDING|SENT|FAILED"
        integer retry_count
        timestamp next_retry_at
        text last_error
        timestamp created_at
        timestamp sent_at
    }
    appointment_status_history {
        uuid id PK
        uuid appointment_id FK
        string old_status
        string new_status
        uuid changed_by_user_id FK
        string source "USER|SYSTEM|CRON"
        string reason
        timestamp created_at
    }
    audit_logs {
        bigint id PK
        uuid actor_user_id FK
        string actor_type "USER|SYSTEM|CRON"
        string action
        string entity_type
        uuid entity_id
        jsonb before_data
        jsonb after_data
        string ip_address
        timestamp created_at
    }

    %% ─── RELATIONSHIPS ────────────────────────────
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned_to"
    roles ||--o{ role_permissions : "contains"
    permissions ||--o{ role_permissions : "granted_in"
    users ||--o{ refresh_tokens : "owns_sessions"

    users ||--o| veterinarians : "is_vet"
    users ||--o{ pets : "owns"
    users ||--o| user_memberships : "has"
    users ||--o{ notifications : "receives"
    users ||--o{ conversations : "starts"

    pet_species ||--o{ pet_breeds : "has"
    pet_breeds ||--o{ pets : "typed_as"
    pets ||--o{ pet_allergies : "has"
    pets ||--o{ pet_medications : "takes"
    pets ||--o{ medical_records : "has"
    pets ||--o{ appointments : "scheduled_for"

    veterinarians ||--o{ veterinarian_schedules : "has"
    veterinarians ||--o{ appointments : "assigned_to"
    veterinarians ||--o{ medical_records : "examines"

    appointments ||--o{ appointment_services : "includes"
    services ||--o{ appointment_services : "in"
    appointments ||--o| medical_records : "generates"
    appointments ||--o| invoices : "billed_as"
    appointments ||--o{ appointment_status_history : "tracks"

    medical_records ||--o{ prescriptions : "has"
    prescriptions ||--o{ prescription_items : "contains"
    medicines ||--o{ prescription_items : "prescribed"
    medicines ||--o{ pet_medications : "used_in"

    invoices ||--o{ invoice_items : "has"
    invoices ||..o| payments : "logical reference"
    payments ||--o{ payment_transactions : "records"
    services ||--o{ invoice_items : "billed_in"
    medicines ||--o{ invoice_items : "billed_in"

    promotions ||--o{ promotion_services : "applies_to"
    services ||--o{ promotion_services : "promoted_in"
    promotions ||--o{ coupons : "issues"
    coupons ||--o{ coupon_usages : "used_in"
    users ||--o{ coupon_usages : "redeems"
    invoices ||--o| coupon_usages : "applies"

    membership_tiers ||--o{ user_memberships : "defines_tier"
    user_memberships ||--o{ membership_transactions : "tracks"

    documents ||--o{ document_chunks : "chunked_into"
    conversations ||--o{ conversation_messages : "contains"
    conversations ||--o{ ai_requests : "triggers"
    ai_requests ||--o{ ai_tool_calls : "executes"
    ai_requests ||--o| vision_analyses : "produces"
    users ||--o{ vision_analyses : "requests"
    pets ||--o{ vision_analyses : "analyzed_for"
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| **Access Control** | Full RBAC (`users`, `roles`, `user_roles`, `permissions`, `role_permissions`) | Flexibly assign multiple roles & granular permissions without backend code changes |
| **Primary Key** | UUID (gen_random_uuid) | Distributed-safe, non-enumerable, standardized across services |
| **Price Snapshot** | `price_snapshot` in `appointment_services` & `prescription_items`, `unit_price` in `invoice_items` | Prevent invoice recalculation errors when catalog prices change |
| **Medical Linkage** | `appointment_id` FK on `medical_records` | Enable direct 1:1 workflow from appointment completion to medical history & invoicing |
| **Itemized Invoicing** | `invoice_items` supports `item_type` (`SERVICE` / `MEDICINE`) | Accurately itemize both veterinary service fees and prescribed medicine costs |
| **Doctor Scheduling** | `veterinarian_schedules` | Manage working hours and prevent overlapping appointment bookings |
| **Appointment Conflict** | PostgreSQL GiST exclusion constraint on veterinarian and `[start, end)` for active appointments | Prevent double booking even under concurrent requests; adjacent appointments remain valid |
| **Database Per Service** | Core, Payment and Notification each own one PostgreSQL database | Prevent direct coupling and cross-service writes |
| **Payment Audit** | Payment DB owns `payments` plus immutable `payment_transactions` | Preserve gateway attempts, callbacks, captures and partial refunds with idempotency |
| **Refresh Revocation** | Hashed, rotated `refresh_tokens` with token family | Support logout, multi-device sessions and replay detection without storing raw tokens |
| **Coupon Usage** | Unique invoice redemption plus transactional per-user count | Allow `per_user_limit > 1`; do not use `UNIQUE(coupon_id, user_id)` |
| **Vision History** | `vision_analyses` stores metadata/result, not image bytes | Keep auditable model results while large images remain in protected object storage |
| **Inventory Scope** | Excluded from MVP | Avoid maintaining stock tables and flows when inventory management is not required |
| **Outbox Pattern** | `notification_outbox` table | Guarantee message delivery resilience against process crashes |
| **Vector Search** | pgvector extension on `document_chunks.embedding` | Co-locate RAG knowledge embeddings inside primary PostgreSQL database |

## Database Integrity Rules

- `veterinarian_schedules`: require `start_time < end_time`; use a GiST exclusion constraint on `veterinarian_id` and the generated `[start, end)` range. Do not use `UNIQUE(veterinarian_id, work_date)`, because it incorrectly prevents split shifts.
- `appointments`: require `start_time < end_time`; active statuses `PENDING`, `CONFIRMED`, and `IN_PROGRESS` cannot overlap for the same veterinarian. The range is half-open so `10:00-10:30` and `10:30-11:00` are valid.
- `payment_transactions`: require `amount > 0`; unique non-null `(provider, provider_transaction_id)` and `(provider, provider_event_id)` prevent duplicate gateway processing. Successful cumulative refunds cannot exceed successful captures.
- Cross-service IDs are ordinary UUID columns and are validated through events/API snapshots. PostgreSQL foreign keys are only used inside one service-owned database.
- `refresh_tokens`: store only `token_hash`; require `expires_at > issued_at`; rotation atomically revokes the old token and links `replaced_by_token_id`.
- `coupon_usages`: use `UNIQUE(invoice_id)` and optionally `UNIQUE(coupon_id, invoice_id)`. Enforce `per_user_limit` transactionally while locking the coupon row; never add `UNIQUE(coupon_id, user_id)` unless policy is permanently one use per user.
- `vision_analyses`: require an object-storage key and checksum for persisted uploads; restrict reads by `user_id`/pet ownership and define a retention policy.
