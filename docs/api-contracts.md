# Pet Care Platform — API Contracts

Base URL: `http://localhost:8080/api/v1`  
Auth: `Authorization: Bearer <JWT>` (all endpoints unless marked Public)  
Swagger UI: `http://localhost:8080/swagger-ui.html`

---

## Common Response Envelope

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Pagination Response

```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

---

## Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new customer |
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Bearer | Revoke refresh token |

**POST /auth/login** Request:
```json
{ "email": "user@example.com", "password": "secret123" }
```
Response `data`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 86400,
  "user": { "id": "uuid", "email": "...", "fullName": "...", "role": "CUSTOMER" }
}
```

---

## Users — `/api/v1/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | CUSTOMER+ | Get own profile |
| PUT | `/users/me` | CUSTOMER+ | Update own profile |
| GET | `/users` | ADMIN+ | List all users (paginated) |
| GET | `/users/{id}` | ADMIN+ | Get user by ID |
| PATCH | `/users/{id}/activate` | ADMIN+ | Activate/deactivate user |

---

## Pets — `/api/v1/pets`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/pets` | CUSTOMER | List own pets |
| POST | `/pets` | CUSTOMER | Create pet |
| GET | `/pets/{id}` | CUSTOMER | Get pet detail |
| PUT | `/pets/{id}` | CUSTOMER | Update pet |
| DELETE | `/pets/{id}` | CUSTOMER | Delete pet |
| GET | `/pets/breeds` | Public | List all breeds |
| GET | `/pets/species` | Public | List all species |

**POST /pets** Request:
```json
{
  "name": "Mochi",
  "breedId": "uuid",
  "birthDate": "2022-03-15",
  "weightKg": 4.5,
  "gender": "FEMALE",
  "avatarUrl": "https://..."
}
```

---

## Medical — `/api/v1/medical`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/medical/pets/{petId}/records` | CUSTOMER/STAFF+ | Medical history |
| POST | `/medical/records` | STAFF+ | Create medical record |
| GET | `/medical/records/{id}` | STAFF+ | Get record |
| POST | `/medical/vaccinations` | STAFF+ | Record vaccination |
| GET | `/medical/pets/{petId}/vaccinations` | CUSTOMER+ | Vaccination history |

---

## Service Catalog — `/api/v1/services`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/services` | Public | List all active services |
| GET | `/services/{id}` | Public | Service detail |
| GET | `/services/categories` | Public | List categories |
| POST | `/services` | ADMIN+ | Create service |
| PUT | `/services/{id}` | ADMIN+ | Update service |
| PATCH | `/services/{id}/toggle` | ADMIN+ | Activate/deactivate |

---

## Bookings — `/api/v1/bookings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/bookings` | CUSTOMER | Own bookings (paginated) |
| POST | `/bookings` | CUSTOMER | Create booking |
| GET | `/bookings/{id}` | CUSTOMER | Booking detail |
| PATCH | `/bookings/{id}/cancel` | CUSTOMER | Cancel booking |
| GET | `/bookings/branch/{branchId}` | STAFF+ | Branch bookings |
| PATCH | `/bookings/{id}/confirm` | STAFF+ | Confirm booking |
| PATCH | `/bookings/{id}/start` | STAFF+ | Mark in-progress |
| PATCH | `/bookings/{id}/complete` | STAFF+ | Mark completed |

**POST /bookings** Request:
```json
{
  "branchId": "uuid",
  "scheduledAt": "2024-02-01T10:00:00Z",
  "promoCode": "SAVE20",
  "notes": "Pet is shy",
  "items": [
    { "serviceId": "uuid", "petId": "uuid", "staffId": "uuid" }
  ]
}
```

---

## Scheduling — `/api/v1/schedules`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/schedules/staff/{staffId}` | STAFF+ | Staff schedule |
| POST | `/schedules` | ADMIN+ | Create schedule |
| GET | `/schedules/slots/available` | CUSTOMER | Available slots `?branchId&serviceId&date` |
| DELETE | `/schedules/{id}` | ADMIN+ | Delete schedule |

---

## Staff — `/api/v1/staff`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/staff` | ADMIN+ | List staff (paginated, filterable by branch) |
| POST | `/staff` | ADMIN+ | Create staff |
| GET | `/staff/{id}` | ADMIN+ | Get staff detail |
| PUT | `/staff/{id}` | ADMIN+ | Update staff |
| GET | `/staff/{id}/skills` | ADMIN+ | Staff skills |
| POST | `/staff/{id}/skills` | ADMIN+ | Add skill |

---

## Branch — `/api/v1/branches`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/branches` | Public | List active branches |
| GET | `/branches/{id}` | Public | Branch detail |
| POST | `/branches` | SUPER_ADMIN | Create branch |
| PUT | `/branches/{id}` | ADMIN+ | Update branch |

---

## Payments — `/api/v1/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/payments` | CUSTOMER | Initiate payment |
| GET | `/payments/{id}` | CUSTOMER | Payment status |
| GET | `/payments/booking/{bookingId}` | CUSTOMER | Payment for booking |
| POST | `/payments/{id}/refund` | ADMIN+ | Issue refund |

---

## Invoices — `/api/v1/invoices`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/invoices/me` | CUSTOMER | Own invoices |
| GET | `/invoices/{id}` | CUSTOMER | Invoice detail |
| GET | `/invoices` | ADMIN+ | All invoices (paginated) |

---

## Promotions — `/api/v1/promotions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/promotions` | ADMIN+ | List all promotions |
| POST | `/promotions` | ADMIN+ | Create promotion |
| PUT | `/promotions/{id}` | ADMIN+ | Update promotion |
| POST | `/promotions/validate` | CUSTOMER | Validate promo code |

---

## Loyalty — `/api/v1/loyalty`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/loyalty/me` | CUSTOMER | Own loyalty account |
| GET | `/loyalty/me/transactions` | CUSTOMER | Point history |
| POST | `/loyalty/redeem` | CUSTOMER | Redeem points |

---

## Inventory — `/api/v1/inventory`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/inventory` | ADMIN+ | List inventory `?branchId` |
| POST | `/inventory/items` | ADMIN+ | Add item |
| PUT | `/inventory/items/{id}` | ADMIN+ | Update item |
| POST | `/inventory/movements` | STAFF+ | Record stock movement |
| GET | `/inventory/low-stock` | ADMIN+ | Items below threshold |

---

## Notifications — `/api/v1/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | CUSTOMER+ | Own notifications |
| PATCH | `/notifications/{id}/read` | CUSTOMER+ | Mark as read |
| PATCH | `/notifications/read-all` | CUSTOMER+ | Mark all read |

---

## Reviews — `/api/v1/reviews`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/reviews` | CUSTOMER | Create review |
| GET | `/reviews/staff/{staffId}` | Public | Staff reviews |
| GET | `/reviews/branch/{branchId}` | Public | Branch reviews |
| DELETE | `/reviews/{id}` | ADMIN+ | Remove review |

---

## Search — `/api/v1/search`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/search?q=&type=` | Public | Full-text search (services, branches, staff) |

---

## Analytics — `/api/v1/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/analytics/revenue` | ADMIN+ | Revenue metrics `?branchId&from&to` |
| GET | `/analytics/bookings` | ADMIN+ | Booking metrics |
| GET | `/analytics/top-services` | ADMIN+ | Top services by revenue |
| GET | `/analytics/customer-retention` | SUPER_ADMIN | Retention rates |

---

## Audit — `/api/v1/audit`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/audit/logs` | SUPER_ADMIN | Audit logs (paginated, filterable) |
| GET | `/audit/logs/{entityType}/{entityId}` | ADMIN+ | Entity change history |

---

## AI — `/api/v1/ai`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/ai/conversations` | CUSTOMER+ | Own conversations |
| POST | `/ai/conversations` | CUSTOMER+ | Start new conversation |
| GET | `/ai/conversations/{id}/messages` | CUSTOMER+ | Message history |
| POST | `/ai/chat` | CUSTOMER+ | Send message, get AI response |

---

## Python AI Services (Direct)

| Service | Port | Key Endpoints |
|---|---|---|
| `ai-agent` | 8001 | `GET /health`, `POST /chat`, `GET /metrics` |
| `ai-rag` | 8002 | `GET /health`, `POST /upload`, `POST /retrieve`, `GET /metrics` |
| `ai-vision` | 8003 | `GET /health`, `POST /detect-breed`, `GET /metrics` |
| `ai-recommendation` | 8004 | `GET /health`, `POST /recommend`, `GET /metrics` |
| `ai-forecasting` | 8005 | `GET /health`, `POST /forecast`, `GET /metrics` |
| `ai-optimization` | 8006 | `GET /health`, `POST /optimize-schedule`, `GET /metrics` |
