# Pet Care Platform — Architecture Documentation

> Mỗi Spring Boot service sở hữu code, Flyway migration và PostgreSQL database riêng. Không service nào được đọc trực tiếp database của service khác.

## 1. System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PetCare Platform                              │
│                                                                      │
│  Customer / Staff ──► Web (React) / Mobile (Expo)                    │
│                           │                                          │
│                           ▼ REST API / JWT                           │
│             Spring Boot Services (Core, Payment, Notification)       │
│                  │              │              │                     │
│                  ▼              ▼              ▼                     │
│             Core DB        Payment DB    Notification DB             │
│                  └──────── RabbitMQ / versioned events ───────┘       │
│                         Redis + Python AI Services                    │
└─────────────────────────────────────────────────────────────────────┘
```

### External Actors & RBAC Roles
| Role Code | Description | Key Permissions Scope |
|---|---|---|
| **OWNER** | Clinic owner / Manager | Full management, revenue reports, staff, promotions, audit logs |
| **VETERINARIAN** | Veterinary doctor | Medical records, prescriptions, diagnosis, appointment status |
| **STAFF** | Receptionist / Customer service | Appointments, invoices, payments, client onboarding |
| **ADMIN** | System administrator | System config, RAG knowledge documents, RBAC management |
| **CUSTOMER** | Pet owner | Own profile, pets, appointment booking, payments, reviews, AI chat |

---

## 2. Container Diagram (C4 Level 2)

```
┌────────── PetCare Platform ─────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────────────┐  ┌─────────────────────┐                   │
│  │   Web (React+Vite)   │  │ Mobile (React Native│                   │
│  │   Port: 80           │  │ Expo SDK 51)        │                   │
│  └──────────┬───────────┘  └──────────┬──────────┘                   │
│             │                         │                              │
│             └─────────── REST /api/v1 ┴────────┐                     │
│                                                ▼                     │
│      ┌─────────────────┬──────────────────┬────────────────────┐     │
│      ▼                 ▼                  ▼                    │     │
│ Core Backend       Payment Service   Notification Service      │     │
│ :8080              :8082             :8083                     │     │
│      │                 │                  │                    │     │
│      ▼                 ▼                  ▼                    │     │
│ Core PostgreSQL    Payment PostgreSQL Notification PostgreSQL  │     │
│ :5432              :5433             :5434                     │     │
│      └──────────────── RabbitMQ :5672 ─────────────────────────┘     │
│                                                                      │
│   ┌──── AI Microservices (FastAPI Python) ──────────────────────┐    │
│   │  agent:8001  rag:8002  vision:8003                          │    │
│   │  recommendation:8004                                      │    │
│   └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Boundaries

Core backend vẫn tổ chức theo modular-monolith, nhưng Payment và Notification là hai Spring Boot service độc lập.

| Package Module | Responsibility | Key Domain Entities |
|---|---|---|
| `auth` | JWT issuance, validation, refresh rotation/revocation | RefreshToken, JwtService |
| `rbac` | RBAC Management (Roles & Permissions) | Role, Permission, UserRole, RolePermission |
| `user` | Quản lý tài khoản người dùng | User |
| `pet` | Thú cưng, loài, giống, dị ứng, thuốc đang dùng | Pet, PetSpecies, PetBreed, PetAllergy, PetMedication |
| `veterinary` | Bác sĩ, ca trực, hồ sơ bệnh án, đơn thuốc, danh mục thuốc | Veterinarian, VeterinarianSchedule, MedicalRecord, Medicine, Prescription, PrescriptionItem |
| `servicecatalog` | Dịch vụ & bảng giá | PetService |
| `appointment` | Vòng đời lịch hẹn, dịch vụ đính kèm, lịch sử trạng thái | Appointment, AppointmentService, AppointmentStatusHistory |
| `invoice` | Hóa đơn, chi tiết hóa đơn (dịch vụ & thuốc) | Invoice, InvoiceItem |
| `promotion` | Mã giảm giá, coupon, lượt sử dụng | Promotion, Coupon, CouponUsage |
| `loyalty` | Hạng thành viên, tích/đổi/điều chỉnh điểm | MembershipTier, UserMembership, MembershipTransaction |
| `review` | Đánh giá lịch hẹn hoàn thành | Review |
| `search` | Full-text search (PostgreSQL pg_trgm) | — |
| `analytics` | Báo cáo doanh thu & dashboard metrics | — |
| `audit` | Lịch sử tác động dữ liệu | AuditLog |
| `ai` | Tích hợp AI microservices, RAG và lịch sử phân tích ảnh | Document, DocumentChunk, Conversation, Message, AIRequest, AIToolCall, VisionAnalysis |

Inventory không thuộc phạm vi MVP. Các bảng `inventory_items`, `stock_movements` và các UI/event còn sót lại trong baseline cũ sẽ được loại bỏ bằng migration riêng sau khi xác nhận không có dữ liệu cần giữ.

| Independent Service | Port | Database ownership | Main entities |
|---|---:|---|---|
| `payment-service` | 8082 | `petcare_payment` on PostgreSQL 5433 | Payment, PaymentTransaction, InboxEvent, OutboxEvent |
| `notification-service` | 8083 | `petcare_notification` on PostgreSQL 5434 | Notification, NotificationDelivery, NotificationTemplate, InboxEvent, OutboxEvent |

Core backend owns invoices. Payment stores `invoice_id`, `owner_id`, and `appointment_id` as external UUID references without cross-database foreign keys. Notification applies the same rule to user, appointment, invoice, and payment IDs.

---

## 4. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Spring Boot | 3.3.x |
| Language | Java | 21 (LTS) |
| ORM | Spring Data JPA + Hibernate | 6.x |
| Database | 3 PostgreSQL instances; pgvector only on Core DB | 16 |
| DB Migration | Flyway | Latest |
| Cache | Redis | 7 |
| Message Broker | RabbitMQ | 3.13 |
| API Docs | SpringDoc OpenAPI | 2.x |
| Security | Spring Security 6 + JWT | HS256, Stateless |
| AI Microservices | Python 3.11 + FastAPI | 4 service stub: agent, RAG, vision, recommendation |
| Web Frontend | React 18 + Vite 5 + TailwindCSS 3 | Port 80 |
| Mobile | React Native 0.74 + Expo SDK 51 | Expo Router |
| Observability | Prometheus + Grafana | 9090 / 3001 |

---

## 5. Security & RBAC Model

```
User ──► UserRole ──► Role ──► RolePermission ──► Permission ──► Method Security (@PreAuthorize)
```

- Authentication: Bearer JWT (`JwtAuthenticationFilter`).
- Authorization: Spring Security 6 với `@PreAuthorize("hasAuthority('medical:create')")`.
- Access token và refresh token có claim `typ` khác nhau; security filter chỉ chấp nhận `typ=access`.
- Refresh token được rotate khi làm mới và chỉ lưu hash trong PostgreSQL. Logout/reuse sẽ revoke token hoặc cả token family.

---

## 6. Event Flow & Transactional Outbox (RabbitMQ)

```
Core DB ──outbox──► invoice.issued.v1 ──► Payment inbox/DB
Payment DB ──outbox──► payment.completed.v1 ──► Core inbox + Notification inbox
Notification DB ──delivery──► Email/SMS/Push provider
```

Mỗi producer ghi outbox trong transaction local của chính nó. Mỗi consumer ghi `event_id` vào inbox local để xử lý idempotent. RabbitMQ là at-least-once; không dùng distributed transaction và không join xuyên database.
