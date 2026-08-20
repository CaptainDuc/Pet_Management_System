# Pet Care Platform — Entity Relationship Diagram

## Mermaid ERD

```mermaid
erDiagram
    %% ─── USERS & AUTH ─────────────────────────────
    users {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        string role "CUSTOMER|STAFF|ADMIN|SUPER_ADMIN"
        boolean active
        timestamp created_at
        timestamp updated_at
    }

    %% ─── PETS ─────────────────────────────────────
    breeds {
        uuid id PK
        string name
        uuid species_id FK
    }
    species {
        uuid id PK
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
        timestamp created_at
    }

    %% ─── MEDICAL ──────────────────────────────────
    medical_records {
        uuid id PK
        uuid pet_id FK
        uuid staff_id FK
        date visit_date
        string diagnosis
        string notes
        timestamp created_at
    }
    vaccinations {
        uuid id PK
        uuid pet_id FK
        string vaccine_name
        date administered_date
        date next_due_date
    }
    prescriptions {
        uuid id PK
        uuid medical_record_id FK
        string medication_name
        string dosage
        string instructions
    }

    %% ─── SERVICE CATALOG ──────────────────────────
    service_categories {
        uuid id PK
        string name
        string description
    }
    pet_services {
        uuid id PK
        uuid category_id FK
        string name
        string description
        integer duration_minutes
        decimal base_price
        boolean active
    }

    %% ─── BRANCH & STAFF ───────────────────────────
    branches {
        uuid id PK
        string name
        string address
        string phone
        string city
    }
    branch_hours {
        uuid id PK
        uuid branch_id FK
        string day_of_week
        time open_time
        time close_time
    }
    staff {
        uuid id PK
        uuid user_id FK
        uuid branch_id FK
        string employee_code UK
        string position
        boolean active
    }
    staff_skills {
        uuid id PK
        uuid staff_id FK
        uuid service_id FK
        string proficiency_level
    }
    schedules {
        uuid id PK
        uuid staff_id FK
        uuid branch_id FK
        date work_date
        time start_time
        time end_time
    }

    %% ─── RESOURCES ────────────────────────────────
    resource_types {
        uuid id PK
        string name
    }
    resources {
        uuid id PK
        uuid type_id FK
        uuid branch_id FK
        string name
        boolean available
    }

    %% ─── BOOKING ──────────────────────────────────
    bookings {
        uuid id PK
        uuid customer_id FK
        uuid branch_id FK
        string status "PENDING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED"
        timestamp scheduled_at
        decimal total_amount
        string notes
        timestamp created_at
    }
    booking_items {
        uuid id PK
        uuid booking_id FK
        uuid service_id FK
        uuid pet_id FK
        uuid staff_id FK
        decimal price
        integer duration_minutes
    }
    time_slots {
        uuid id PK
        uuid schedule_id FK
        uuid resource_id FK
        timestamp start_time
        timestamp end_time
        boolean is_available
    }

    %% ─── PAYMENT & INVOICE ────────────────────────
    payments {
        uuid id PK
        uuid booking_id FK
        decimal amount
        string currency
        string status "PENDING|PROCESSING|COMPLETED|FAILED|REFUNDED"
        string method "CASH|CARD|BANK_TRANSFER|WALLET"
        string gateway_transaction_id
        timestamp paid_at
    }
    invoices {
        uuid id PK
        uuid booking_id FK
        uuid payment_id FK
        string invoice_number UK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal total_amount
        timestamp issued_at
    }
    invoice_items {
        uuid id PK
        uuid invoice_id FK
        string description
        decimal unit_price
        integer quantity
        decimal total
    }

    %% ─── PROMOTIONS & LOYALTY ─────────────────────
    promotions {
        uuid id PK
        string code UK
        string type "PERCENTAGE|FIXED_AMOUNT"
        decimal value
        decimal min_order_amount
        timestamp valid_from
        timestamp valid_until
        boolean active
    }
    loyalty_accounts {
        uuid id PK
        uuid user_id FK UK
        integer total_points
        integer available_points
        string tier "BRONZE|SILVER|GOLD|PLATINUM"
    }
    loyalty_transactions {
        uuid id PK
        uuid loyalty_account_id FK
        uuid booking_id FK
        string type "EARN|REDEEM|EXPIRE"
        integer points
        string description
        timestamp created_at
    }

    %% ─── INVENTORY ────────────────────────────────
    inventory_items {
        uuid id PK
        uuid branch_id FK
        string name
        string sku UK
        string unit
        integer quantity_on_hand
        integer reorder_threshold
        decimal unit_cost
    }
    stock_movements {
        uuid id PK
        uuid item_id FK
        string type "IN|OUT|ADJUSTMENT"
        integer quantity
        string reference
        uuid performed_by FK
        timestamp created_at
    }

    %% ─── NOTIFICATIONS ────────────────────────────
    notifications {
        uuid id PK
        uuid user_id FK
        string type "EMAIL|PUSH|SMS"
        string title
        string body
        boolean is_read
        timestamp created_at
    }

    %% ─── REVIEWS ──────────────────────────────────
    reviews {
        uuid id PK
        uuid booking_id FK UK
        uuid customer_id FK
        uuid staff_id FK
        integer rating "1-5"
        string comment
        timestamp created_at
    }

    %% ─── AUDIT ────────────────────────────────────
    audit_logs {
        uuid id PK
        uuid user_id FK
        string entity_type
        uuid entity_id
        string action "CREATE|UPDATE|DELETE"
        jsonb old_values
        jsonb new_values
        string ip_address
        timestamp created_at
    }

    %% ─── AI ───────────────────────────────────────
    ai_conversations {
        uuid id PK
        uuid user_id FK
        string title
        timestamp created_at
    }
    ai_messages {
        uuid id PK
        uuid conversation_id FK
        string role "USER|ASSISTANT"
        text content
        timestamp created_at
    }

    %% ─── RELATIONSHIPS ────────────────────────────
    users ||--o{ pets : "owns"
    users ||--o| staff : "is"
    users ||--o| loyalty_accounts : "has"
    users ||--o{ notifications : "receives"
    users ||--o{ ai_conversations : "starts"

    species ||--o{ breeds : "has"
    breeds ||--o{ pets : "typed_as"

    pets ||--o{ medical_records : "has"
    pets ||--o{ vaccinations : "receives"
    pets ||--o{ booking_items : "included_in"

    medical_records ||--o{ prescriptions : "has"

    service_categories ||--o{ pet_services : "contains"
    pet_services ||--o{ booking_items : "in"
    pet_services ||--o{ staff_skills : "requires"

    branches ||--o{ branch_hours : "has"
    branches ||--o{ staff : "employs"
    branches ||--o{ schedules : "has"
    branches ||--o{ resources : "has"
    branches ||--o{ bookings : "hosts"
    branches ||--o{ inventory_items : "stocks"

    staff ||--o{ staff_skills : "has"
    staff ||--o{ schedules : "works"
    staff ||--o{ booking_items : "serves"
    staff ||--o{ medical_records : "records"

    schedules ||--o{ time_slots : "divides_into"
    resources ||--o{ time_slots : "used_in"

    bookings ||--o{ booking_items : "contains"
    bookings ||--o| payments : "paid_via"
    bookings ||--o| invoices : "invoiced_as"
    bookings ||--o| reviews : "reviewed_in"

    payments ||--o| invoices : "generates"
    invoices ||--o{ invoice_items : "has"

    loyalty_accounts ||--o{ loyalty_transactions : "tracks"
    bookings ||--o{ loyalty_transactions : "triggers"

    inventory_items ||--o{ stock_movements : "tracked_by"
    ai_conversations ||--o{ ai_messages : "has"
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Primary Key | UUID | Distributed-safe, no ID enumeration |
| Audit fields | `created_at`, `updated_at`, `version` on all entities (via BaseEntity) | Optimistic locking, soft audit |
| Soft delete | `active` boolean on key entities | Preserve referential integrity |
| Branch isolation | `branch_id` FK on operational tables | Multi-branch support |
| Vector search | pgvector extension on same PostgreSQL | RAG embeddings co-located |
