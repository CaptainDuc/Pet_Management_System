# PetCare Platform — PROJECT CONTEXT
> **AGENT GUIDE**: Đọc file này đầu tiên. File này là nguồn sự thật duy nhất về toàn bộ dự án.
> Sau khi đọc xong, bạn sẽ hiểu đủ để làm bất kỳ task nào mà không cần hỏi thêm về context.

---

## 🗂️ Workspace Root
```
c:\Study\PetManageSystem\
```

## 📁 Cấu trúc Thư Mục Cấp Cao

```
PetManageSystem/
├── PROJECT_CONTEXT.md          ← FILE NÀY (đọc đầu tiên)
├── docker-compose.yml          ← Khởi động toàn bộ stack
├── .env.example                ← Biến môi trường mẫu
│
├── backend/                    ← Spring Boot 3.3, Java 21
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/
│       ├── java/com/petcare/platform/
│       │   ├── PetCareApplication.java    ← Entry point
│       │   ├── common/                   ← BaseEntity, ApiResponse, Security, Config
│       │   ├── auth/                     ← JWT Auth
│       │   ├── user/                     ← User management
│       │   ├── pet/                      ← Pet & breed management
│       │   ├── medical/                  ← Medical records, vaccinations
│       │   ├── servicecatalog/           ← Service catalog & pricing
│       │   ├── booking/                  ← Booking lifecycle
│       │   ├── scheduling/               ← Staff schedules, time slots
│       │   ├── staff/                    ← Staff & skills
│       │   ├── branch/                   ← Branch management
│       │   ├── resource/                 ← Physical resources (rooms, tools)
│       │   ├── payment/                  ← Payment processing
│       │   ├── invoice/                  ← Invoice generation
│       │   ├── promotion/                ← Promo codes, discounts
│       │   ├── loyalty/                  ← Points system
│       │   ├── inventory/                ← Stock management
│       │   ├── notification/             ← Email/push/SMS
│       │   ├── review/                   ← Ratings & reviews
│       │   ├── search/                   ← Full-text search
│       │   ├── analytics/                ← Metrics & dashboard data
│       │   ├── audit/                    ← Audit logs
│       │   └── ai/                       ← AI conversation history
│       └── resources/
│           ├── application.yml           ← Main config
│           ├── application-docker.yml    ← Docker overrides
│           └── db/migration/
│               └── V1__init_schema.sql   ← Flyway baseline
│
├── web/                        ← React 18 + Vite 5 + TailwindCSS 3
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── api/               ← Axios instance + module hooks
│       ├── components/        ← Shared UI components
│       ├── pages/
│       │   ├── auth/          ← Login, Register
│       │   ├── customer/      ← Dashboard, Pets, Booking, ...
│       │   └── staff/         ← Dashboard, Appointments, Analytics, ...
│       ├── store/             ← Zustand state
│       └── router/            ← React Router v6
│
├── mobile/                     ← React Native 0.74 + Expo SDK 51
│   ├── package.json
│   ├── app.json               ← Expo config
│   ├── babel.config.js
│   └── app/                   ← Expo Router file-based routing
│       ├── _layout.js         ← Root layout (session restore)
│       ├── index.js           ← Redirect to auth or customer
│       ├── (auth)/            ← Login, Register screens
│       ├── (customer)/        ← Customer tab navigator (5 tabs + extras)
│       └── (staff)/           ← Staff tab navigator (5 tabs)
│   └── src/
│       ├── api/client.js      ← Axios instance with JWT auto-attach
│       └── store/authStore.js ← Zustand + SecureStore auth
│
├── ai/                         ← Python FastAPI microservices
│   ├── agent/                 ← Port 8001 — LangChain conversational agent
│   ├── rag/                   ← Port 8002 — pgvector RAG system
│   ├── vision/                ← Port 8003 — Breed detection via image
│   ├── recommendation/        ← Port 8004 — Service recommendations
│   ├── forecasting/           ← Port 8005 — Demand forecasting
│   └── optimization/          ← Port 8006 — Staff schedule optimization
│
├── infrastructure/
│   ├── postgres/init.sql      ← pgvector, uuid-ossp, pg_trgm extensions
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/
│       ├── datasources/datasource.yml   ← Prometheus datasource
│       └── dashboards/
│           ├── dashboards.yml           ← Dashboard provisioning config
│           └── petcare-overview.json    ← Main Grafana dashboard
│
└── docs/
    ├── architecture.md        ← C4 diagrams, tech stack, module map, security model
    ├── erd.md                 ← Mermaid ERD — tất cả entities và relationships
    ├── sequence-diagrams.md   ← 7 sequence diagrams (auth, booking, payment, ...)
    └── api-contracts.md       ← REST endpoints cho tất cả 22 modules
```

---

## 🛠️ Tech Stack Nhanh

| Layer | Tech | Notes |
|---|---|---|
| Backend | Spring Boot 3.3, Java 21 | Modular Monolith |
| ORM | JPA + Hibernate 6 + Flyway | `ddl-auto: validate` |
| Database | PostgreSQL 16 + pgvector | UUID PKs |
| Cache | Redis 7 | Session, rate limit |
| Messaging | RabbitMQ 3.13 | AMQP, async events |
| API Docs | SpringDoc OpenAPI 2.x | `/swagger-ui.html` |
| Security | Spring Security 6 + JWT HS256 | Stateless, 24h expiry |
| Web | React 18 + Vite + TailwindCSS 3 | Port 80 (Docker) |
| Mobile | Expo SDK 51, RN 0.74 | Expo Router (file-based) |
| AI | Python 3.12 + FastAPI + LangChain | 6 microservices |
| Observability | Prometheus + Grafana | Port 9090, 3001 |

---

## 🚀 Chạy Dự Án

```bash
# 1. Copy env
cp .env.example .env

# 2. Khởi động toàn bộ stack
docker compose up --build -d

# 3. Kiểm tra
http://localhost:8080/swagger-ui.html   # Backend API docs
http://localhost:80                     # Web frontend
http://localhost:9090                   # Prometheus
http://localhost:3001                   # Grafana (admin/admin123)
http://localhost:15672                  # RabbitMQ (petcare/petcare123)
http://localhost:8001/health            # AI Agent
```

---

## 🧩 Backend Module Pattern

Mỗi module backend tuân theo pattern sau:

```
{module}/
├── controller/   ← @RestController, @Tag(swagger), /api/v1/{module}
├── service/      ← Interface + Impl, @Service, @Transactional
├── domain/       ← @Entity, extends BaseEntity, @Table
├── repository/   ← interface extends JpaRepository<Entity, UUID>
├── dto/          ← Java records với @Schema (request + response)
├── mapper/       ← @Mapper(componentModel="spring") MapStruct
└── event/        ← POJO events published to RabbitMQ
```

**BaseEntity** (`common/domain/BaseEntity.java`):
- `id: UUID` — `@GeneratedValue(strategy = UUID)`
- `createdAt: Instant` — `@CreationTimestamp`
- `updatedAt: Instant` — `@UpdateTimestamp`
- `version: Long` — `@Version` (optimistic locking)

**ApiResponse** (`common/dto/ApiResponse.java`):
```java
// Static factory methods:
ApiResponse.ok(data)           // 200
ApiResponse.created(data)      // 201
ApiResponse.error(status, msg) // 4xx/5xx
```

---

## 🔐 Security Model

```
Role          │ Can Access
──────────────┼────────────────────────────────────────────
CUSTOMER      │ /pets/**, /bookings/**, /payments/**, /reviews/**
STAFF         │ + /medical/**, /schedules/**, /inventory/** (read)
ADMIN         │ + /staff/**, /branches/**, /promotions/**, /analytics/**
SUPER_ADMIN   │ All + /audit/**, /users/** (cross-branch)
```

JWT → `Authorization: Bearer <token>` header.  
Filter chain: `JwtAuthenticationFilter` → `UserPrincipal` → `SecurityContext`.

---

## 📨 Event Flow (RabbitMQ)

Events được publish qua `RabbitTemplate.convertAndSend(exchange, routingKey, event)`.

| Publisher | Event | Listeners |
|---|---|---|
| `BookingService` | `booking.created` | NotificationListener, SchedulingListener, LoyaltyListener |
| `BookingService` | `booking.cancelled` | SchedulingListener (release slot), PaymentListener (refund) |
| `BookingService` | `booking.completed` | LoyaltyListener (award points) |
| `PaymentService` | `payment.completed` | InvoiceListener, BookingListener (confirm), LoyaltyListener |
| `InventoryService` | `inventory.low_stock` | NotificationListener (alert admins) |

Queue config: `common/config/RabbitMQConfig.java`  
Queue constants: `common/event/RabbitMQQueues.java`

---

## 🤖 AI Services

| Service | Port | Image | Description |
|---|---|---|---|
| `ai-agent` | 8001 | petcare-ai-agent | LangChain conversational agent, booking assistance |
| `ai-rag` | 8002 | petcare-ai-rag | Document upload → pgvector → retrieval-augmented answers |
| `ai-vision` | 8003 | petcare-ai-vision | Upload pet image → detect breed |
| `ai-recommendation` | 8004 | petcare-ai-recommendation | Personalized service suggestions |
| `ai-forecasting` | 8005 | petcare-ai-forecasting | Time-series demand forecasting |
| `ai-optimization` | 8006 | petcare-ai-optimization | Staff schedule optimization (OR-Tools) |

Mỗi service có: `main.py`, `router.py`, `schemas.py`, `service.py`, `requirements.txt`, `Dockerfile`.  
Endpoints chuẩn: `GET /health`, `GET /metrics`, service-specific endpoints.

---

## 📱 Mobile Navigation Flow

```
app/
  index.js → redirect based on isAuthenticated
              ↓ NO → (auth)/login → (auth)/register
              ↓ YES → based on user.role
                       CUSTOMER → (customer)/dashboard [tabs]
                       STAFF    → (staff)/dashboard    [tabs]

(customer) tabs: dashboard | pets | booking | notifications | profile
(customer) extras (push from dashboard): appointments, ai-assistant, loyalty, invoices

(staff) tabs: dashboard | appointments | schedule | inventory | analytics
```

Auth state: `useAuthStore` (Zustand) + `SecureStore` (Expo) cho JWT persistence.

---

## 🐘 Database

- **Host**: `postgres` (Docker) / `localhost:5432` (local)
- **DB**: `petcare`
- **User**: `petcare` / **Pass**: `petcare123`
- **Extensions**: `vector` (pgvector), `uuid-ossp`, `pg_trgm`
- **Migrations**: Flyway, scripts tại `backend/src/main/resources/db/migration/`
- **Primary keys**: tất cả UUID type

---

## 📋 Docs Reference

| File | Nội dung |
|---|---|
| `docs/architecture.md` | C4 Level 1-3, tech stack, API conventions, security model |
| `docs/erd.md` | Mermaid ERD đầy đủ với tất cả 30+ tables và FK relationships |
| `docs/sequence-diagrams.md` | 7 flow diagrams: login, booking, payment, completion, AI chat, inventory alert, scheduling |
| `docs/api-contracts.md` | Tất cả REST endpoints, request/response schemas |

---

## ❗ Lưu Ý Quan Trọng

1. **`servicecatalog.domain`** — Không có package này. Package đúng là `servicecatalog.domain` bên trong thư mục `servicecatalog/domain/`. File ở ngoài đã bị xóa.
2. **`ddl-auto: validate`** — Hibernate không tự tạo/sửa table. Mọi schema change phải qua Flyway migration.
3. **Mobile chưa `npm install`** — Cần chạy `npm install` trong `mobile/` trước khi `expo start`.
4. **AI services là stubs** — Các Python service chỉ có skeleton, chưa có model thật. Cần thêm API key thật vào `.env`.
5. **RabbitMQ thay vì Kafka** — Quyết định cuối là dùng RabbitMQ 3.13 (AMQP), không phải Kafka.
6. **Swagger UI** — `http://localhost:8080/swagger-ui.html` sau khi backend khởi động.
7. **Java package root** — `com.petcare.platform` cho tất cả backend code.
