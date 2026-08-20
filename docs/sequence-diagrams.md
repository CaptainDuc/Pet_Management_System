# Pet Care Platform — Sequence Diagrams

## 1. Authentication — Login Flow

```mermaid
sequenceDiagram
    actor C as Client (Web/Mobile)
    participant A as AuthController
    participant AS as AuthService
    participant US as UserService
    participant JWT as JwtService
    participant R as Redis

    C->>A: POST /api/v1/auth/login {email, password}
    A->>AS: authenticate(email, password)
    AS->>US: findByEmail(email)
    US-->>AS: User entity
    AS->>AS: verify BCrypt password
    AS->>JWT: generateAccessToken(user)
    AS->>JWT: generateRefreshToken(user)
    JWT-->>AS: accessToken, refreshToken
    AS->>R: store refreshToken (key=userId, TTL=7d)
    AS-->>A: AuthResponse {accessToken, refreshToken, user}
    A-->>C: 200 OK AuthResponse
```

---

## 2. Create Booking Flow

```mermaid
sequenceDiagram
    actor C as Customer
    participant BC as BookingController
    participant BS as BookingService
    participant SS as SchedulingService
    participant PS as PromotionService
    participant MQ as RabbitMQ
    participant NS as NotificationService
    participant LS as LoyaltyService

    C->>BC: POST /api/v1/bookings {branchId, items[], scheduledAt, promoCode?}
    BC->>BS: createBooking(request, customerId)
    BS->>SS: checkAvailability(branchId, staffId, scheduledAt)
    SS-->>BS: TimeSlot available
    opt promoCode provided
        BS->>PS: applyPromotion(promoCode, subtotal)
        PS-->>BS: discountAmount
    end
    BS->>BS: persist Booking + BookingItems
    BS->>SS: reserveTimeSlot(slotId, bookingId)
    BS->>MQ: publish BookingCreatedEvent {bookingId, customerId, scheduledAt}
    BS-->>BC: BookingResponse {bookingId, status=PENDING, total}
    BC-->>C: 201 Created BookingResponse

    MQ-->>NS: BookingCreatedEvent consumed
    NS->>NS: send confirmation email/push

    MQ-->>LS: BookingCreatedEvent consumed
    LS->>LS: mark points as pending (awarded on completion)
```

---

## 3. Payment Flow

```mermaid
sequenceDiagram
    actor C as Customer
    participant PC as PaymentController
    participant PS as PaymentService
    participant BS as BookingService
    participant IS as InvoiceService
    participant MQ as RabbitMQ
    participant LS as LoyaltyService

    C->>PC: POST /api/v1/payments {bookingId, method, amount}
    PC->>PS: initiatePayment(bookingId, method, amount)
    PS->>BS: getBooking(bookingId) -- validate CONFIRMED status
    BS-->>PS: Booking entity
    PS->>PS: persist Payment {status=PENDING}
    note over PS: For CASH: immediate completion<br/>For CARD: gateway call (stub)
    PS->>PS: update Payment {status=COMPLETED}
    PS->>MQ: publish PaymentCompletedEvent {bookingId, paymentId, amount}
    PS-->>PC: PaymentResponse {paymentId, status, amount}
    PC-->>C: 200 OK PaymentResponse

    MQ-->>IS: PaymentCompletedEvent consumed
    IS->>IS: generate Invoice + InvoiceItems
    IS->>IS: assign invoice_number

    MQ-->>BS: PaymentCompletedEvent consumed
    BS->>BS: update Booking {status=CONFIRMED}

    MQ-->>LS: PaymentCompletedEvent consumed
    LS->>LS: award loyalty points to customer
```

---

## 4. Booking Completion & Review Flow

```mermaid
sequenceDiagram
    actor S as Staff
    participant BC as BookingController
    participant BS as BookingService
    participant MQ as RabbitMQ
    actor C as Customer
    participant RC as ReviewController
    participant RS as ReviewService

    S->>BC: PATCH /api/v1/bookings/{id}/complete
    BC->>BS: completeBooking(bookingId, staffId)
    BS->>BS: update Booking {status=COMPLETED}
    BS->>MQ: publish BookingCompletedEvent
    BS-->>BC: BookingResponse {status=COMPLETED}
    BC-->>S: 200 OK

    MQ-->>C: Push notification "Service completed! Leave a review"

    C->>RC: POST /api/v1/reviews {bookingId, rating, comment}
    RC->>RS: createReview(request, customerId)
    RS->>RS: validate booking belongs to customer & COMPLETED
    RS->>RS: persist Review
    RS-->>RC: ReviewResponse
    RC-->>C: 201 Created
```

---

## 5. AI Chat (RAG) Flow

```mermaid
sequenceDiagram
    actor C as Customer
    participant AC as AIController (Backend)
    participant AS as AIService (Backend)
    participant AG as ai-agent (FastAPI :8001)
    participant RAG as ai-rag (FastAPI :8002)
    participant PG as PostgreSQL (pgvector)
    participant LLM as LLM API (OpenAI stub)

    C->>AC: POST /api/v1/ai/chat {conversationId, message}
    AC->>AS: chat(conversationId, message, userId)
    AS->>AS: persist AIMessage {role=USER}
    AS->>AG: POST /chat {history, message}
    AG->>RAG: POST /retrieve {query}
    RAG->>PG: SELECT embedding similarity (pgvector)
    PG-->>RAG: relevant document chunks
    RAG-->>AG: context documents
    AG->>LLM: prompt = system + context + history + message
    LLM-->>AG: assistant response
    AG-->>AS: {response, sources}
    AS->>AS: persist AIMessage {role=ASSISTANT}
    AS-->>AC: AIMessageResponse
    AC-->>C: 200 OK {message, sources}
```

---

## 6. Inventory Low Stock Alert Flow

```mermaid
sequenceDiagram
    participant IS as InventoryService
    participant MQ as RabbitMQ
    participant NS as NotificationService
    participant ES as EmailService
    actor A as Admin

    note over IS: Stock consumption triggers check
    IS->>IS: updateStock(itemId, -quantity)
    IS->>IS: check quantity_on_hand <= reorder_threshold
    IS->>MQ: publish InventoryLowStockEvent {itemId, branchId, currentQty, threshold}
    
    MQ-->>NS: InventoryLowStockEvent consumed
    NS->>NS: find branch admins
    NS->>ES: send low stock email to admins
    NS->>NS: persist Notification for each admin
    ES-->>A: Email "Low stock alert: {item} at {branch}"
```

---

## 7. Staff Schedule & Slot Management

```mermaid
sequenceDiagram
    actor A as Admin
    participant SC as SchedulingController
    participant SS as SchedulingService
    participant StaffS as StaffService

    A->>SC: POST /api/v1/schedules {staffId, branchId, workDate, startTime, endTime}
    SC->>SS: createSchedule(request)
    SS->>StaffS: validateStaffExists(staffId)
    SS->>SS: check no overlapping schedule
    SS->>SS: persist Schedule
    SS->>SS: generate TimeSlots (30-min intervals)
    SS-->>SC: ScheduleResponse {scheduleId, slots[]}
    SC-->>A: 201 Created

    note over SS: Slots auto-available = true on creation<br/>BookingService sets available = false on reservation
```
