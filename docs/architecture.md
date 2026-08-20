# Pet Care Platform — Architecture Documentation

## 1. System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PetCare Platform                              │
│                                                                      │
│  Customer ──► Web/Mobile App ──► Backend API ──► PostgreSQL          │
│                                      │         ──► Redis             │
│                                      │         ──► RabbitMQ          │
│                                      └──► AI Services (Python)       │
│                                               ──► pgvector (RAG)     │
└─────────────────────────────────────────────────────────────────────┘
```

### External Actors
| Actor | Description |
|---|---|
| **Customer** | Pet owner using Web or Mobile app |
| **Staff** | Groomer, Vet, Receptionist using Staff Dashboard |
| **Admin** | Branch/System admin with full management access |
| **Super Admin** | Platform owner, cross-branch visibility |

---

## 2. Container Diagram (C4 Level 2)

```
┌────────── PetCare Platform ─────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │  Web (React) │   │Mobile (Expo) │   │  Backend (Spring Boot) │  │
│  │  Port: 80    │   │  Port: n/a   │   │  Port: 8080            │  │
│  │  Vite + TW   │   │  RN 0.74     │   │  Java 21 + JPA         │  │
│  └──────┬───────┘   └──────┬───────┘   └────────────┬───────────┘  │
│         │                  │                         │              │
│         └──────────────────┴──── REST /api/v1/ ──────┘              │
│                                                      │              │
│   ┌──────────────────────────────────────────────────┼──────────┐   │
│   │  Infrastructure                                  │          │   │
│   │  ┌──────────┐  ┌───────┐  ┌──────────┐  ┌──────▼──────┐   │   │
│   │  │ PostgreSQL│  │ Redis │  │ RabbitMQ │  │  Prometheus │   │   │
│   │  │ Port:5432 │  │ 6379  │  │5672/15672│  │  Port:9090  │   │   │
│   │  │ pgvector  │  │       │  │          │  └──────┬──────┘   │   │
│   │  └──────────┘  └───────┘  └──────────┘         │          │   │
│   │                                          ┌──────▼──────┐   │   │
│   │                                          │   Grafana   │   │   │
│   │                                          │  Port:3001  │   │   │
│   └──────────────────────────────────────────┴─────────────┘   │   │
│                                                                  │   │
│   ┌──── AI Microservices (Python FastAPI) ───────────────────┐  │   │
│   │  agent:8001  rag:8002  vision:8003                       │  │   │
│   │  recommendation:8004  forecasting:8005  optimization:8006│  │   │
│   └──────────────────────────────────────────────────────────┘  │   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend — Module Map (C4 Level 3)

Backend là **Modular Monolith**. Mỗi module có đầy đủ `controller / service / domain / repository / dto / mapper / event`.

| Module | Responsibility | Key Domain Objects |
|---|---|---|
| `auth` | JWT issue/validate, login/register | — |
| `user` | Người dùng, phân quyền (CUSTOMER/STAFF/ADMIN/SUPER_ADMIN) | User, Role |
| `pet` | Quản lý thú cưng, giống loài | Pet, Breed, Species |
| `medical` | Hồ sơ y tế, lịch tiêm phòng, đơn thuốc | MedicalRecord, Vaccination, Prescription |
| `servicecatalog` | Danh mục dịch vụ, bảng giá | PetService, ServiceCategory, PriceList |
| `booking` | Lịch đặt dịch vụ, quản lý trạng thái | Booking, BookingItem |
| `scheduling` | Lịch làm việc nhân viên, slot thời gian | Schedule, TimeSlot, Appointment |
| `staff` | Nhân viên, kỹ năng, lịch rảnh | Staff, StaffSkill |
| `branch` | Chi nhánh, giờ hoạt động | Branch, BranchHours |
| `resource` | Tài nguyên vật lý (phòng, bàn, dụng cụ) | Resource, ResourceType |
| `payment` | Thanh toán, phương thức thanh toán | Payment, PaymentMethod |
| `invoice` | Hóa đơn, chi tiết hóa đơn | Invoice, InvoiceItem |
| `promotion` | Khuyến mãi, quy tắc giảm giá | Promotion, DiscountRule |
| `loyalty` | Điểm tích lũy, đổi thưởng | LoyaltyAccount, LoyaltyTransaction |
| `inventory` | Tồn kho, nhập xuất | InventoryItem, StockMovement |
| `notification` | Thông báo push/email/SMS | Notification, NotificationTemplate |
| `review` | Đánh giá, xếp hạng | Review, Rating |
| `search` | Full-text search (PostgreSQL pg_trgm) | — |
| `analytics` | Aggregation, dashboard metrics | — |
| `audit` | Lịch sử thay đổi hệ thống | AuditLog |
| `ai` | Chat AI, lịch sử hội thoại | AIConversation, AIMessage |

---

## 4. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Spring Boot | 3.3.x |
| Language | Java | 21 (LTS) |
| ORM | Spring Data JPA + Hibernate | 6.x |
| DB Migration | Flyway | Latest |
| Database | PostgreSQL + pgvector | 16 |
| Cache | Redis | 7 |
| Message Broker | RabbitMQ | 3.13 |
| API Docs | SpringDoc OpenAPI | 2.x |
| Security | Spring Security 6 + JWT | — |
| AI Backend | Python + FastAPI | 3.12 / latest |
| AI Framework | LangChain + sentence-transformers | latest |
| Web Frontend | React + Vite + TailwindCSS | 18 / 5 / 3 |
| Mobile | React Native + Expo | 0.74 / SDK 51 |
| Observability | Prometheus + Grafana + OpenTelemetry | latest |
| Infrastructure | Docker Compose | — |

---

## 5. API Conventions

- **Base URL**: `/api/v1/{module}`
- **Auth**: `Authorization: Bearer <JWT>` header
- **Response envelope**: `ApiResponse<T>` `{ status, success, message, data, timestamp }`
- **Pagination**: `PageResponse<T>` `{ content, page, size, totalElements, totalPages }`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`

---

## 6. Security Model

```
Role          │ Permissions
──────────────┼─────────────────────────────────────────
CUSTOMER      │ Own pets, bookings, payments, reviews
STAFF         │ Appointments, medical records, schedule
ADMIN         │ Branch management, staff, promotions, inventory
SUPER_ADMIN   │ All branches, analytics, audit logs, system config
```

JWT signed with HS256, default expiry 24h. Refresh token stored in Redis.

---

## 7. Event Flow (RabbitMQ)

```
BookingService ──publish──► booking.created  ──► NotificationListener (email/push)
                                              ──► SchedulingListener (reserve slot)
                                              ──► LoyaltyListener (points pending)

PaymentService ──publish──► payment.completed ──► InvoiceListener (generate invoice)
                                               ──► LoyaltyListener (award points)
                                               ──► BookingListener (confirm booking)

BookingService ──publish──► booking.cancelled ──► SchedulingListener (release slot)
                                               ──► PaymentListener (refund trigger)
```
