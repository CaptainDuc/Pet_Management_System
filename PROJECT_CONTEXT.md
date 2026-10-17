# PetCare Platform — PROJECT CONTEXT
> **AGENT GUIDE**: File này là nguồn sự thật duy nhất về toàn bộ dự án.

---

## 📁 Cấu trúc Thư Mục Cấp Cao

```
PetManageSystem/
├── PROJECT_CONTEXT.md          ← File tổng quan kiến trúc dự án
├── docker-compose.yml          ← Khởi động toàn bộ stack
├── .env.example                ← Biến môi trường mẫu
│
├── services/
│   ├── backend/                ← Core Spring Boot service, port 8080
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/
│       ├── java/com/petcare/platform/
│       │   ├── PetCareApplication.java    ← Entry point
│       │   ├── common/                   ← BaseEntity, ApiResponse, Security, Config
│       │   ├── auth/                     ← Authentication, JWT
│       │   ├── rbac/                     ← Role, Permission, UserRole, RolePermission
│       │   ├── user/                     ← User management
│       │   ├── pet/                      ← Pet, Species, Breed, Allergy, Medication
│       │   ├── veterinary/               ← Vet, DoctorSchedule, Medicine, Prescription
│       │   ├── medical/                  ← Medical record (linked with appointment_id)
│       │   ├── servicecatalog/           ← PetService catalog & pricing
│       │   ├── appointment/              ← Appointment lifecycle & status history
│       │   ├── invoice/                  ← Invoice generation (service & medicine)
│       │   ├── promotion/                ← Promo codes, Coupons, Coupon Usage
│       │   ├── loyalty/                  ← Membership Tiers, Points transactions
│       │   ├── review/                   ← Ratings & reviews
│       │   ├── search/                   ← Full-text search
│       │   ├── analytics/                ← Metrics & dashboard data
│       │   ├── audit/                    ← Audit logs
│       │   └── ai/                       ← RAG documents, AI conversation & request logs
│       └── resources/
│           ├── application.yml           ← Main config
│           ├── application-docker.yml    ← Docker overrides
│           └── db/migration/
│               ├── V1__init_schema.sql   ← Core DB Flyway baseline
│               └── V2__extract_payment_and_notification.sql
│   ├── payment-service/        ← Spring Boot, port 8082, owns Payment DB :5433
│   │   └── src/main/resources/db/migration/V1__init_payment_schema.sql
│   └── notification-service/   ← Spring Boot, port 8083, owns Notification DB :5434
│       └── src/main/resources/db/migration/V1__init_notification_schema.sql
│
├── web/                        ← React 18 + Vite 5 + TailwindCSS 3
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│
├── mobile/                     ← React Native 0.74 + Expo SDK 51
│   ├── package.json
│   ├── app.json               ← Expo config
│   └── app/                   ← Expo Router file-based routing
│
├── ai/                         ← Python FastAPI microservices
│   ├── agent/                 ← Port 8001 — LangChain conversational agent
│   ├── rag/                   ← Port 8002 — pgvector RAG system
│   ├── vision/                ← Port 8003 — Breed detection via image
│   ├── recommendation/        ← Port 8004 — Service recommendations
│
├── infrastructure/
│   ├── postgres/init.sql      ← pgvector, uuid-ossp, pg_trgm extensions
│   ├── prometheus/prometheus.yml
│   └── grafana/provisioning/
│
└── docs/
    ├── architecture.md        ← C4 diagrams, tech stack, module map, security model
    ├── erd.md                 ← Mermaid ERD — tất cả entities và relationships (full RBAC)
    ├── sequence-diagrams.md   ← Flow diagrams
    └── api-contracts.md       ← REST endpoints cho tất cả modules
```

---

## 🛠️ Tech Stack

| Layer | Tech | Notes |
|---|---|---|
| Core Backend | Spring Boot 3.3, Java 21 | Modular core service |
| Payment | Spring Boot 3.3, Java 21 | Independent service and database |
| Notification | Spring Boot 3.3, Java 21 | Independent service and database |
| ORM | JPA + Hibernate 6 + Flyway | Database Migration |
| Database | 3 PostgreSQL 16 instances; pgvector on Core DB | Database per service |
| Cache | Redis 7 | Session, rate limit |
| Messaging | RabbitMQ 3.13 | AMQP, async events & outbox |
| Security | Spring Security 6 + JWT + RBAC | Role & Permission based |
| Web | React 18 + Vite + TailwindCSS 3 | Port 80 (Docker) |
| Mobile | Expo SDK 51, RN 0.74 | Expo Router |
| AI | Python 3.11 + FastAPI | 4 service stubs |

---

## 📋 Backend Package Structure Pattern

Mỗi domain package (`com.petcare.platform.{module}`) tuân theo pattern:

```
{module}/
├── controller/   ← @RestController, @RequestMapping("/api/v1/{module}")
├── service/      ← Interface + Impl, @Service, @Transactional
├── domain/       ← @Entity, extends BaseEntity
├── repository/   ← interface extends JpaRepository<Entity, UUID>
├── dto/          ← Java records (request + response)
├── mapper/       ← MapStruct mappers
└── event/        ← POJO events published to RabbitMQ
```
