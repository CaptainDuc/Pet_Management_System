# Pet Care Platform - Sequence Diagrams

> Các flow dưới đây mô tả kiến trúc đích của MVP. Chúng chưa đồng nghĩa với việc controller/service tương ứng đã được triển khai trong `services/backend`.

## 1. Login And Refresh Rotation

```mermaid
sequenceDiagram
    actor C as Web/Mobile Client
    participant A as AuthController
    participant AS as AuthService
    participant JWT as JwtService
    participant DB as PostgreSQL

    C->>A: POST /api/v1/auth/login
    A->>AS: authenticate(email, password)
    AS->>JWT: generate access typ=access
    AS->>JWT: generate refresh typ=refresh, jti, familyId
    AS->>DB: store refresh token hash and expiry
    DB-->>AS: session created
    AS-->>C: accessToken and refreshToken

    C->>A: POST /api/v1/auth/refresh
    A->>AS: rotate(refreshToken)
    AS->>JWT: validate typ=refresh
    AS->>DB: lock active token by hash
    alt token is active
        AS->>DB: revoke old token and insert replacement atomically
        AS-->>C: rotated token pair
    else token was already used or revoked
        AS->>DB: revoke token family
        AS-->>C: 401 Unauthorized
    end
```

The raw refresh token is never stored. Normal Bearer authentication accepts only `typ=access`; logout sets `revoked_at` for the selected session or token family.

## 2. Veterinarian Schedule

```mermaid
sequenceDiagram
    actor M as Manager
    participant SC as ScheduleController
    participant SS as ScheduleService
    participant DB as PostgreSQL

    M->>SC: POST /veterinarians/{id}/schedules
    SC->>SS: createSchedule(vetId, date, start, end)
    SS->>SS: validate start < end and veterinarian active
    SS->>DB: INSERT veterinarian_schedule
    alt no overlap
        DB-->>SS: schedule created
        SS-->>M: 201 Created
    else exclusion constraint violation
        DB-->>SS: overlapping range rejected
        SS-->>M: 409 Conflict
    end
```

The database uses a half-open range `[start, end)`, so adjacent shifts are allowed. A single `UNIQUE(veterinarian_id, work_date)` must not be used because it prevents valid split shifts.

## 3. Create Appointment Without Double Booking

```mermaid
sequenceDiagram
    actor C as Customer
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant DB as PostgreSQL
    participant O as NotificationOutbox

    C->>AC: POST /api/v1/appointments
    AC->>AS: createAppointment(request, ownerId)
    AS->>DB: verify pet ownership and covering work schedule
    AS->>DB: INSERT appointment in transaction
    alt veterinarian is available
        DB-->>AS: appointment created
        AS->>O: enqueue appointment.created in same transaction
        AS-->>C: 201 Created
    else active appointment overlaps
        DB-->>AS: exclusion constraint violation
        AS-->>C: 409 Veterinarian is not available
    end
```

Availability checks improve the response but are not sufficient by themselves. The PostgreSQL exclusion constraint is the final concurrency-safe protection for `PENDING`, `CONFIRMED`, and `IN_PROGRESS` appointments.

## 4. Payment And Gateway Transactions

```mermaid
sequenceDiagram
    actor C as Customer
    participant PC as PaymentController
    participant PS as PaymentService
    participant DB as PostgreSQL
    participant G as VNPay/MoMo/Stripe

    C->>PC: POST /api/v1/payments with Idempotency-Key
    PC->>PS: initiate(invoiceId, provider, key)
    PS->>DB: lock invoice and find/create Payment
    PS->>DB: INSERT payment_transaction PENDING
    PS->>G: create payment request
    G-->>PS: provider transaction and checkout URL
    PS->>DB: UPDATE transaction response/status
    PS-->>C: payment status and checkout URL

    G->>PC: signed webhook event
    PC->>PS: processWebhook(event)
    PS->>PS: verify signature and amount
    PS->>DB: INSERT transaction by unique provider event id
    alt event is new
        PS->>DB: update Payment aggregate atomically
        PS-->>G: 200 Accepted
    else duplicate callback
        DB-->>PS: event already processed
        PS-->>G: 200 Accepted
    end
```

Refunds append `REFUND` transactions. Successful cumulative refunds must never exceed successful captures; gateway payload history is not overwritten on the parent payment row.

## 5. Coupon Redemption

```mermaid
sequenceDiagram
    actor C as Customer
    participant IS as InvoiceService
    participant CS as CouponService
    participant DB as PostgreSQL

    C->>IS: Apply coupon and confirm invoice
    IS->>CS: redeem(code, userId, invoiceId)
    CS->>DB: lock coupon row
    CS->>DB: count active usage for coupon and user
    CS->>CS: verify dates, global limit, per_user_limit and invoice total
    CS->>DB: INSERT coupon_usage and update used_count atomically
    DB-->>CS: redemption created
    CS-->>IS: discount snapshot
```

`POST /coupons/validate` is advisory and does not consume a use. `UNIQUE(invoice_id)` prevents duplicate invoice redemption, while `per_user_limit` is enforced transactionally rather than by `UNIQUE(coupon_id, user_id)`.

## 6. Vision Analysis History

> ⚠ **Chưa được triển khai.** `AiController` hiện chỉ có `POST /api/v1/ai/tips` (stub, không gọi `ai-vision`), và Core DB **chưa có** bảng `vision_analyses` (xem migration đề xuất `P-36` trong `docs/api-contracts.md`).
> Endpoint chuẩn được chọn trong API contract là **`POST /api/v1/ai/vision/analyze`** (không phải `/api/v1/ai/vision-analyses` như trước đây). Khi triển khai phải cập nhật lại sơ đồ này cho khớp.

```mermaid
sequenceDiagram
    actor C as Customer
    participant AC as AIController (Spring Boot)
    participant OS as Object Storage
    participant DB as PostgreSQL
    participant V as ai-vision (FastAPI)

    C->>AC: POST /api/v1/ai/vision-analyses image and petId
    AC->>AC: validate ownership, MIME type and size
    AC->>OS: store image
    OS-->>AC: storage key and checksum
    AC->>DB: INSERT vision_analysis PENDING
    AC->>V: POST /analyze image
    alt analysis succeeds
        V-->>AC: model/version and result
        AC->>DB: UPDATE SUCCESS and result JSON
        AC-->>C: 201 analysis result
    else analysis fails
        AC->>DB: UPDATE FAILED and error
        AC-->>C: 502 analysis failed
    end
```

PostgreSQL stores only image metadata, ownership, model information and results. Image bytes remain in protected object storage and follow an explicit retention policy.

## 7. Appointment Completion And Review

```mermaid
sequenceDiagram
    actor V as Veterinarian
    participant AC as AppointmentController
    participant AS as AppointmentService
    participant DB as PostgreSQL
    participant O as NotificationOutbox
    actor C as Customer

    V->>AC: PATCH /appointments/{id}/status COMPLETED
    AC->>AS: completeAppointment(id, veterinarianId)
    AS->>DB: persist status and status history
    AS->>O: enqueue appointment.completed atomically
    AS-->>V: 200 Completed
    O-->>C: Push notification requesting review
    C->>AC: POST /reviews with appointmentId
    AC->>DB: verify ownership and completed status
    AC->>DB: INSERT one review per appointment
    AC-->>C: 201 Created
```
