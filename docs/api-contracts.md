# Pet Care Platform — API Contracts

Tài liệu này mô tả contract REST của Pet Care Platform. **Flyway migration vật lý là nguồn sự thật cho schema**, không phải `docs/erd.md` và không phải tên Entity trong Java:

- Core DB: `services/backend/src/main/resources/db/migration/` (`V1__init_schema.sql`, `V2__extract_payment_and_notification.sql`)
- Payment DB: `services/payment-service/src/main/resources/db/migration/V1__init_payment_schema.sql`
- Notification DB: `services/notification-service/src/main/resources/db/migration/V1__init_notification_schema.sql`

Ba bảng `payments` và `notifications` trong Core V1 là lịch sử migration và đã bị loại khỏi Core DB bởi V2 (kéo theo `invoices.payment_id`). Payment và Notification không được đọc trực tiếp Core DB; các ID xuyên service là UUID tham chiếu logic, **không phải foreign key**.

> **Về `docs/csdl_pet_manager.docx` và `docs/erd.md`:** hai tài liệu này mô tả **target design** của MVP (dùng `appointments`, `user_memberships`, `coupons`, `prescriptions`, `pet_species`, `notification_outbox`, `ai_requests`…). Nhiều phần **chưa** được hiện thực trong Flyway hay source. Tài liệu này ưu tiên **Flyway + source code**; khi hai bên lệch nhau, phần lệch được liệt kê ở [§6.2](#62-mâu-thuẫn-giữa-tài-liệu-và-csdl-đã-xử-lý-trong-tài-liệu-này). Các tài liệu target không được dùng làm cơ sở để coi một API là "đã hoạt động".

---

## 0. Quy ước bắt buộc

### 0.1 Trạng thái implementation

Mỗi endpoint được gắn đúng một trong ba nhãn:

| Nhãn | Ý nghĩa |
|---|---|
| `Implemented` | Đã có `@RestController` + service/entity tương ứng trong source hiện tại |
| `Schema-supported` | Bảng/cột đã có trong Flyway nhưng **chưa** có controller/service |
| `Proposed` | Cần thêm migration (và có thể cần code) trước khi triển khai |

Nếu một endpoint `Implemented` nhưng phụ thuộc bảng chưa tồn tại trong migration, contract ghi rõ **⚠ Schema gap** và migration đề xuất.

### 0.2 Base URL

| Service | Base URL | Port | Database | SpringDoc |
|---|---|---|---|---|
| Core Backend | `http://localhost:8080/api/v1` | 8080 | `petcare` @ :5432 | `/swagger-ui.html`, `/api-docs` |
| Payment Service | `http://localhost:8082/api/v1` | 8082 | `petcare_payment` @ :5433 | Chưa cấu hình |
| Notification Service | `http://localhost:8083/api/v1` | 8083 | `petcare_notification` @ :5434 | Chưa cấu hình |

Header cho endpoint không phải Public (Core Backend):

```http
Authorization: Bearer <access-token>
```

> **API Gateway chưa tồn tại trong implementation.** `services/api-gateway/` chỉ gồm file 0 byte (`pom.xml`, `GatewayApplication.java`, `application.yml`, `Dockerfile`) và **không** có trong `docker-compose.yml`. Vì vậy mọi contract dưới đây dùng base URL trực tiếp của từng service. Quy tắc route `/payments/**` → 8082, `/notifications/**` → 8083 là **Proposed**.

### 0.3 Response envelope (thực tế trong Core)

`ApiResponse<T>` (`common/dto/ApiResponse.java`) là envelope duy nhất, `@JsonInclude(NON_NULL)`:

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": { },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

| Factory | HTTP | `message` |
|---|---|---|
| `ApiResponse.ok(data)` | `200` | `Success` |
| `ApiResponse.created(data)` | `201` | `Created` |
| `ApiResponse.error(status, msg)` | theo `status` | message truyền vào |

**Lưu ý bắt buộc:** envelope này chỉ áp dụng cho Core Backend. `LoyaltyController`, `MedicalController`, `AuditLogController`, `AnalyticsController`, `AiController` trả **entity/raw object trực tiếp, không bọc `ApiResponse`** — xem từng module.

### 0.4 Paginated (thực tế trong Core)

`PageResponse<T>` (`common/dto/PageResponse.java`) được bọc **bên trong** `ApiResponse.data`:

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

Chỉ `GET /api/v1/users` dùng `PageResponse` hiện tại. Các list endpoint khác (medical, audit, loyalty) trả `List` không phân trang.

### 0.5 Error format (thực tế trong Core)

`GlobalExceptionHandler` xử lý 5 loại exception. Lưu ý: **không có** field `errors` dạng mảng như một số tài liệu cũ mô tả.

| Exception | HTTP | Body |
|---|---|---|
| `ResourceNotFoundException` | `404` | `ApiResponse.error(404, msg)` |
| `BusinessException` | `422` | `ApiResponse.error(422, msg)` |
| `MethodArgumentNotValidException` | `400` | `ApiResponse` với `data` = `Map<String,String>` (**không có `timestamp`**) |
| `BadCredentialsException` | `401` | `ApiResponse.error(401, "Invalid credentials")` |
| `AccessDeniedException` | `403` | `ApiResponse.error(403, "Access denied")` |
| `Exception` (catch-all) | `500` | `ApiResponse.error(500, "Internal server error")` |

**Validation error thực tế (400):**

```json
{
  "status": 400,
  "success": false,
  "message": "Validation failed",
  "data": {
    "email": "Invalid email format",
    "password": "Password must be at least 6 characters"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

`data` là map `field -> message`. Khi một field có nhiều lỗi, các message được nối bằng `"; "`.

**Business error thực tế (422):**

```json
{
  "status": 422,
  "success": false,
  "message": "Email is already registered",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

#### Error catalogue

`common/exception/ErrorCode.java` là nguồn duy nhất cho cặp `(HTTP status, message mặc định)`. Mọi handler trong `GlobalExceptionHandler` đều tra từ đây, nên client có thể so khớp theo `status` thay vì theo chuỗi message.

| Exception | HTTP | `ErrorCode` |
|---|---|---|
| `ResourceNotFoundException`, `NoResourceFoundException` | `404` | `RESOURCE_NOT_FOUND` |
| `MethodArgumentNotValidException`, `BindException`, `ConstraintViolationException` | `400` | `VALIDATION_ERROR` |
| `MethodArgumentTypeMismatchException` (UUID sai trong path) | `400` | `INVALID_PARAMETER` |
| `MissingServletRequestParameterException` | `400` | `MISSING_PARAMETER` |
| `HttpMessageNotReadableException` (JSON sai) | `400` | `MALFORMED_REQUEST` |
| `HttpRequestMethodNotSupportedException` | `405` | `METHOD_NOT_ALLOWED` |
| `MaxUploadSizeExceededException` | `413` | `PAYLOAD_TOO_LARGE` |
| `HttpMediaTypeNotSupportedException` | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| `DataIntegrityViolationException` (vi phạm `CHECK`/FK) | `409` | `DATA_INTEGRITY_VIOLATION` |
| `DuplicateKeyException` (vi phạm UNIQUE) | `409` | `DUPLICATE_RESOURCE` |
| `ObjectOptimisticLockingFailureException` (cột `version`) | `409` | `OPTIMISTIC_LOCK_CONFLICT` |
| `BusinessException` | `422` | `BUSINESS_RULE_VIOLATION` |
| `Exception` (catch-all) | `500` | `INTERNAL_ERROR` |

Quy tắc bảo mật của error contract:

- **Không rò rỉ chi tiết SQL.** `DataIntegrityViolationException` chỉ log tên constraint (`constraint "..."`) ở mức server, trả về message chung.
- **`401` do Spring Security** được trả qua `RestAuthenticationEntryPoint`, **`403`** qua `RestAccessDeniedHandler` — cả hai đều dùng `ApiResponse` nên shape giống hệt các lỗi nghiệp vụ.
- `502`/`504` (`UPSTREAM_UNAVAILABLE`/`UPSTREAM_TIMEOUT`) đã có trong catalogue nhưng **chưa** có nơi ném ra; sẽ dùng khi module AI/payment proxy được triển khai.

### 0.6 Security hiện tại (Core Backend)

`SecurityConfig` + `JwtAuthenticationFilter`:

- `SessionCreationPolicy.STATELESS`, CSRF tắt.
- `PUBLIC_ENDPOINTS` = `/api/v1/auth/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/api-docs/**`, `/actuator/health/**`, `/actuator/info`, `/actuator/prometheus`.
  - `/actuator/prometheus` phải mở vì `infrastructure/prometheus/prometheus.yml` scrape không kèm credential; nếu bật `actuator.env` thì phải hạn chế riêng (không public).
- `permitAll` cho `GET /api/v1/services/**` và `GET /api/v1/branches/**` (hiện **chưa có controller** tương ứng).
- `hasRole("ADMIN")` cho `/api/v1/admin/**` (hiện **chưa có controller** nào dùng prefix này).
- Mọi request còn lại: `authenticated`.
- `401`/`403` trả về `ApiResponse` qua `RestAuthenticationEntryPoint`/`RestAccessDeniedHandler`, đồng shape với lỗi nghiệp vụ.
- `JwtAuthenticationFilter` chỉ chấp nhận JWT có claim `typ=access`; `typ=refresh` bị bỏ qua.
- Token hợp lệ về chữ ký **nhưng** account `INACTIVE`/`LOCKED` sẽ không được xác thực (kiểm `isEnabled()` + `isAccountNonLocked()`).
- Token lỗi không làm fail-fast: request tiếp tục với security context rỗng, nên `POST /auth/login` vẫn dùng được dù client gửi kèm token cũ. Endpoint được bảo vệ trả `401` qua entry point.
- Clock skew JWT: `app.jwt.clock-skew-seconds` (mặc định `30`).
- Authority được nạp lại từ DB **mỗi request** qua `CustomUserDetailsService`: `ROLE_<users.role>` + `ROLE_<roles.name>` + `<permissions.code>` cho mọi role trong `user_roles`. Claim `role` trong JWT chỉ mang tính thông tin, **không** dùng để authorize. Hệ quả: thay đổi RBAC có hiệu lực ngay ở request kế tiếp, không cần chờ hết hạn access token.
- `common/security/SecurityUtils.java` cung cấp `getCurrentUserId()`, `requireCurrentUserId()`, `hasRole()`, `hasPermission()` để controller không phải lặp lại `@AuthenticationPrincipal`.

#### CORS

| Property | Mặc định | Ý nghĩa |
|---|---|---|
| `app.security.cors.allowed-origin-patterns` | `http://localhost:*,http://127.0.0.1:*` | Danh sách origin pattern |
| `app.security.cors.allow-credentials` | `true` | Cho phép gửi cookie/Authorization cross-origin |

Mặc định đã thu hẹp về localhost (đủ cho Vite dev và `web` container ở port 80). Nếu đặt pattern `*` cùng `allow-credentials=true`, service sẽ **log cảnh báo** khi khởi động — cần đặt lại origin cụ thể trước khi lên production.

### 0.7 Quy ước chung

| Quy tắc | Giá trị |
|---|---|
| Định dạng ID | UUID v4 string (`gen_random_uuid()`) |
| Timestamp | ISO-8601 UTC, ví dụ `2026-10-01T10:00:00Z` (`Instant`/`TIMESTAMPTZ`) |
| Ngày | `yyyy-MM-dd` (`LocalDate`/`DATE`) |
| Giờ trong ngày | `HH:mm:ss` (`LocalTime`/`TIME`) |
| Thời điểm tuyệt đối | `TIMESTAMPTZ` (dùng cho `time_slots`, `issued_at`, `paid_at`) |
| Tiền tệ | `NUMERIC(14,2)`, đơn vị VND (`currency CHAR(3) DEFAULT 'VND'`) |
| Phân trang | `page` 0-based, `size` mặc định 20 |
| Số thực | Không dùng float trong JSON; giá trị tiền trả dạng số |

---

# PHẦN 1 — CORE BACKEND (`http://localhost:8080/api/v1`)

## A. Auth — `/api/v1/auth`

Controller: `auth/controller/AuthController.java`. Cả 4 endpoint **Đã có code**, nhưng `/refresh` và `/logout` phụ thuộc bảng `refresh_tokens` **chưa tồn tại** trong migration.

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| POST | `/auth/register` | `Implemented` | Public |
| POST | `/auth/login` | `Implemented` | Public |
| POST | `/auth/refresh` | `Implemented` · **⚠ Schema gap** | Public |
| POST | `/auth/logout` | `Implemented` · **⚠ Schema gap** | Public (xem cảnh báo) |

### A.1 `POST /api/v1/auth/register`

| | |
|---|---|
| Trạng thái | `Implemented` — trả `201 Created` |
| Auth | Public |
| CSDL | `users` |
| Events | Không |

**Request — `RegisterRequest`**

```json
{
  "fullName": "Nguyễn Minh Anh",
  "email": "customer@petcare.vn",
  "password": "Str0ng-Passw0rd-2026",
  "phone": "0901234567"
}
```

| Field | Kiểu | Bắt buộc | Validation (annotation thực tế) |
|---|---|---|---|
| `fullName` | string | Có | `@NotBlank("Full name is required")`; cột `users.full_name VARCHAR(255) NOT NULL` |
| `email` | string | Có | `@NotBlank` + `@Email("Invalid email format")`; cột `users.email VARCHAR(255) NOT NULL UNIQUE` |
| `password` | string | Có | `@NotBlank` + `@Size(min = 6)`; lưu BCrypt vào `users.password VARCHAR(255)` |
| `phone` | string | Không | Không có annotation; cột `users.phone VARCHAR(20)` **không UNIQUE trong migration** |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
      "email": "customer@petcare.vn",
      "fullName": "Nguyễn Minh Anh",
      "phone": "0901234567",
      "avatarUrl": null,
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "roles": ["CUSTOMER"],
      "createdAt": "2026-10-01T10:00:00Z",
      "updatedAt": "2026-10-01T10:00:00Z"
    }
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules**

- Role mặc định: `users.role = 'CUSTOMER'`, `users.status = 'ACTIVE'` (khớp default của migration).
- Nếu `roles` có bản ghi tên `CUSTOMER` thì gán thêm vào `user_roles`. Bảng `roles` **chưa tồn tại trong migration** → xem migration `P-1`.
- Email trùng → `422` (`BusinessException`). Kiểm tra ở tầng service (`existsByEmail`), không dựa vào constraint.
- Phone trùng → `422`, nhưng **chỉ** khi `phone` khác null/rỗng. Vì `users.phone` không có UNIQUE nên race condition hai request đăng ký cùng phone vẫn tồn tại.
- Không có bước xác thực email; user đăng ký là dùng được ngay.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu/sai định dạng field |
| `422` | `Email is already registered` | `users.email` đã tồn tại |
| `422` | `Phone number is already registered` | `users.phone` đã tồn tại (kiểm mềm) |
| `500` | `Internal server error` | Lỗi DB không lọt được |

```json
{
  "status": 422,
  "success": false,
  "message": "Email is already registered",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

### A.2 `POST /api/v1/auth/login`

| | |
|---|---|
| Trạng thái | `Implemented` — trả `200 OK` |
| Auth | Public |
| CSDL | `users` (+ `refresh_tokens` nếu session được ghi) |

**Request — `LoginRequest`**

```json
{
  "email": "customer@petcare.vn",
  "password": "Str0ng-Passw0rd-2026"
}
```

| Field | Validation |
|---|---|
| `email` | `@NotBlank` + `@Email` |
| `password` | `@NotBlank` |

**Response `200`** — cùng shape `AuthResponse` như A.1.

**Business rules**

- Xác thực qua Spring `AuthenticationManager` + `DaoAuthenticationProvider` (BCrypt). Sai email **hoặc** sai mật khẩu → cùng một thông báo `Invalid credentials` (không tiết lộ email tồn tại).
- Sau khi xác thực, `AuthService` nạp lại `User` và kiểm tra `status == 'ACTIVE'`; nếu không → `422 Account is inactive or locked`.
- `JwtAuthenticationFilter` chỉ nhận token `typ=access`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Field rỗng/sai định dạng |
| `401` | `Invalid credentials` | Sai email hoặc sai mật khẩu |
| `422` | `Account is inactive or locked` | `users.status != 'ACTIVE'` |
| `422` | `User not found` | User bị xóa giữa lúc xác thực |
| `500` | `Internal server error` | Lỗi DB/ghi session |

```json
{
  "status": 401,
  "success": false,
  "message": "Invalid credentials",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

### A.3 Token lifetime và cách client xử lý hết hạn

| Thuộc tính | Nguồn cấu hình | Giá trị mặc định | Ghi chú |
|---|---|---|---|
| Access token TTL | `app.jwt.expiration` (`application.yml`) | `86400000` ms = **24 giờ** | `AuthResponse.expiresIn` = `ttl / 1000` = `86400` |
| Refresh token TTL | `app.jwt.refresh-expiration` | `604800000` ms = **7 ngày** | Dùng cho cả claim `exp` của refresh JWT và `refresh_tokens.expires_at` |
| Overrides | `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | — | `docker-compose.yml` chỉ truyền `JWT_EXPIRATION` |
| Secret | `app.jwt.secret` / `JWT_SECRET` | HMAC-SHA256, ≥ 32 byte | Base64 decode trước, fallback UTF-8 |

⚠ **Cần xác nhận:** `AuthService` khai báo fallback `@Value("${app.jwt.expiration:900000}")` (15 phút) khác với `application.yml` (24 giờ). Vì `application.yml` luôn được nạp nên giá trị hiệu lực là **24 giờ**, nhưng đây là sự lệch cấu hình cần dọn dẹp. Nếu môi trường set `JWT_EXPIRATION` khác 86400000 thì `expiresIn` thay đổi theo — client **phải** đọc `expiresIn` từ response, không hardcode.

**Client xử lý token hết hạn (đã được hỗ trợ):**

1. Lưu `accessToken` + `refreshToken` phía client (khuyến nghị refresh token ở storage an toàn hơn cookie).
2. Khi API trả `401`, gọi `POST /auth/refresh` với refresh token hiện có.
3. Nhận token pair mới và retry request gốc **một lần**.
4. Nếu refresh trả `401`/`422` (token hết hạn, đã revoke, hoặc phát hiện reuse) → xóa session cục bộ và bắt người dùng đăng nhập lại.

### A.4 `POST /api/v1/auth/refresh`

| | |
|---|---|
| Trạng thái | `Implemented` · **⚠ Schema gap: bảng `refresh_tokens` không tồn tại** |
| Auth | Public |
| CSDL | `refresh_tokens` (entity `auth/domain/RefreshToken.java`) |

**Request — `RefreshTokenRequest`**

```json
{
  "refreshToken": "<jwt>"
}
```

| Field | Validation |
|---|---|
| `refreshToken` | `@NotBlank("Refresh token is required")` |

**Response `200`** — shape `AuthResponse` giống A.1.

**Business rules**

- Refresh token được tra cứu bằng **SHA-256 hash** (`hashToken`), không lưu raw token.
- Rotation: revoke token hiện tại (`revoked_at`, `revoke_reason = 'Rotated'`) rồi cấp token mới **cùng `token_family_id`**, trong cùng transaction.
- Phát hiện reuse: nếu token đã `revoked` hoặc hết hạn → `revokeFamily(token_family_id)` (set `revoked_at` cho mọi token chưa revoke trong family) rồi trả lỗi → client buộc đăng nhập lại.
- Kiểm tra `users.status == 'ACTIVE'` trước khi cấp token mới.
- Claim `familyId` được nhúng vào refresh JWT nhưng **không** được dùng để tra cứu; nguồn quyết định là `refresh_tokens.token_family_id`.
- ⚠ `replacedByToken` và `lastUsedAt` có field nhưng **chưa** được code ghi → cột `replaced_by_token_id` và `last_used_at` sẽ luôn NULL.
- ⚠ `familyId` cho session mới tạo là `UUID.randomUUID()` sinh mỗi lần login/refresh-chain-start.

**⚠ Schema gap.** Entity `RefreshToken` map tới bảng `refresh_tokens`, bảng này **không được tạo trong V1 hay V2**. Với `spring.jpa.hibernate.ddl-auto: validate`, endpoint này **không thể chạy được** cho tới khi có migration `P-1`. Migration `P-1` phải tạo đúng các cột entity dùng:
`user_id`, `token_hash`, `token_family_id`, `replaced_by_token_id`, `issued_at`, `expires_at`, `last_used_at`, `revoked_at`, `revoke_reason`, `device_id`, `created_at`, `updated_at`, `version`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | `refreshToken` rỗng |
| `422` | `Invalid refresh token` | Không tìm thấy hash trong DB |
| `422` | `Refresh token is expired or revoked. Please login again.` | Đã revoke/hết hạn (family đã bị revoke) |
| `422` | `User account is inactive` | `users.status != 'ACTIVE'` |
| `500` | `Internal server error` | Bảng `refresh_tokens` chưa tồn tại |

### A.5 `POST /api/v1/auth/logout`

| | |
|---|---|
| Trạng thái | `Implemented` · **⚠ Schema gap giống A.4** |
| Auth | Public theo `SecurityConfig` (`/api/v1/auth/**` permitAll) |
| CSDL | `refresh_tokens` |

**Request — `LogoutRequest`** (body là **optional**; thiếu thì mặc định `refreshToken = null`, `logoutAll = false`)

```json
{
  "refreshToken": "<jwt>",
  "logoutAll": false
}
```

| Field | Kiểu | Mặc định |
|---|---|---|
| `refreshToken` | string, nullable | `null` |
| `logoutAll` | boolean | `false` |

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

(`data` bị bỏ qua nhờ `@JsonInclude(NON_NULL)`.)

**Business rules**

- `logoutAll = true` → `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = :userId AND revoked_at IS NULL` (mọi thiết bị của user đó).
- `logoutAll = false` và có `refreshToken` → revoke đúng token có hash khớp.
- Không trường hợp nào khác → trả `200` (idempotent, không báo lỗi).

⚠ **Hai điểm cần xác nhận trước khi coi là production-ready:**

1. Endpoint nằm trong vùng `permitAll`, nên `principal` có thể là `null`. Khi đó `logoutAll = true` sẽ gọi `revokeAllForUser(null, …)` và không làm gì; còn `logoutAll = false` + `refreshToken` sẽ **revoke token theo hash mà không kiểm tra chủ sở hữu**. Chỉ chứa token thôi là đủ để vô hiệu hóa session của người khác.
2. Không có cơ chế thu hồi access token. Access token vẫn hợp lệ tới hết TTL (24 giờ mặc định) sau khi logout; chỉ refresh token bị chặn.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `200` | `Success` | Luôn (kể cả khi body rỗng) |
| `500` | `Internal server error` | Bảng `refresh_tokens` chưa tồn tại |

---

## B. Users — `/api/v1/users`

Controller: `user/controller/UserController.java`. Service `UserService`, DTO `UserResponse`.

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/users/me` | `Implemented` | Logged in |
| PUT | `/users/me` | `Implemented` | Logged in |
| GET | `/users` | `Implemented` | `ADMIN` hoặc `OWNER` |
| GET | `/users/{id}` | `Implemented` | `ADMIN` hoặc `OWNER` |
| PATCH | `/users/{id}/status` | `Implemented` | `ADMIN` |
| POST | `/users/{id}/roles` | `Implemented` | `ADMIN` · **⚠ Schema gap** (`user_roles` chưa tồn tại) |

> Endpoint `DELETE /users/{id}/roles/{roleId}` **không tồn tại** trong source. Tài liệu cũ mô tả nó là `Implemented` — đã gỡ khỏi contract. Xem `P-2` nếu cần bổ sung.

### B.1 `GET /api/v1/users/me`

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | Logged in; `@AuthenticationPrincipal UserPrincipal` là nguồn `userId` |
| CSDL | `users`, `user_roles` → `roles` |

**Response `200` — `UserResponse`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "id": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "email": "customer@petcare.vn",
    "fullName": "Nguyễn Minh Anh",
    "phone": "0901234567",
    "avatarUrl": null,
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "roles": ["CUSTOMER"],
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

| Field | Nguồn | Ghi chú |
|---|---|---|
| `id` | `users.id` | UUID |
| `email` | `users.email` | |
| `fullName` | `users.full_name` | |
| `phone` | `users.phone` | |
| `avatarUrl` | `users.avatar_url` | |
| `role` | `users.role` | Role **chính**, `VARCHAR(50)` |
| `status` | `users.status` | `ACTIVE` / `INACTIVE` / `LOCKED` |
| `roles` | tên các role trong `user_roles` | Mảng string; **không** chứa permission |
| `createdAt` / `updatedAt` | `users.created_at` / `updated_at` | |

`password` và `version` **không** nằm trong `UserResponse`. `roles` sẽ là mảng rỗng nếu `user_roles` rỗng (chưa có bảng này trong migration).

**Errors:** `401` (thiếu/sai token), `404 User not found with id: <id>` (token hợp lệ nhưng user không còn tồn tại).

### B.2 `PUT /api/v1/users/me`

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | Logged in |
| CSDL | `users` |

**Request — `UpdateUserRequest`** (partial update: field `null` hoặc blank → giữ nguyên)

```json
{
  "fullName": "Nguyễn Minh Anh",
  "phone": "0901234567",
  "avatarUrl": "https://storage.example.invalid/avatars/user-uuid.jpg"
}
```

| Field | Cột | Quyền sửa | Validation |
|---|---|---|---|
| `fullName` | `users.full_name` | Owner | Không có annotation; cột `VARCHAR(255)` |
| `phone` | `users.phone` | Owner | Không có annotation; cột `VARCHAR(20)` |
| `avatarUrl` | `users.avatar_url` | Owner | Không có annotation; cột `VARCHAR(500)` |

**Response `200`** — shape `UserResponse` như B.1.

**Business rules**

- **Chỉ owner được sửa ba trường trên.** Không có endpoint cho user sửa `email`, `password`, `role`, `status`, `avatarUrl` của người khác.
- Trường **chỉ Admin được sửa**: `status` (qua `PATCH /users/{id}/status`), `role`/`roles` (qua `POST /users/{id}/roles`), và `email` — hiện **chưa có** endpoint nào cho phép đổi email ⇒ cần migration/endpoint riêng nếu nghiệp vụ đòi hỏi.
- Trường **không ai sửa được qua API**: `id`, `password` (chỉ qua luồng reset mật khẩu, chưa có), `created_at`.

**Quy tắc trùng lặp email / phone**

| Trường | Constraint thật trong migration | Hành vi |
|---|---|---|
| `email` | `UNIQUE` ✔ (`users.email ... UNIQUE`) | Kiểm ở service + bắt buộc bởi DB. Trùng → `422`. |
| `phone` | **KHÔNG có UNIQUE** ✘ | Chỉ kiểm mềm bằng `existsByPhone` trong `UserService.updateUserProfile`. Hai request song song vẫn có thể tạo phone trùng. |

⚠ **Không giả định `phone` là UNIQUE.** Nếu nghiệp vụ cần, đề xuất `P-3`:
`CREATE UNIQUE INDEX uq_users_phone ON users(phone) WHERE phone IS NOT NULL;` (unique partial để cho phép nhiều user `NULL`).

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `404` | `User not found with id: <id>` | Không tìm thấy user |
| `422` | `Phone number is already in use` | `phone` đã thuộc user khác |
| `422` | `Email is already registered` | Chỉ từ flow register |

```json
{
  "status": 422,
  "success": false,
  "message": "Phone number is already in use",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

### B.3 `GET /api/v1/users`

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | `@PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")` |
| CSDL | `users` |

**Query parameters**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `role` | string, optional | — | Lọc chính xác `users.role` |
| `status` | string, optional | — | Lọc chính xác `users.status` |
| `search` | string, optional | — | `LIKE` không phân biệt hoa thường trên `full_name` **hoặc** `email` |
| `page` | int | `0` | 0-based |
| `size` | int | `20` | Không có cap; client tự giới hạn |
| `sortBy` | string | `createdAt` | Tên field entity |
| `direction` | string | `desc` | `asc` / `desc` (so sánh không phân biệt hoa thường) |

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
        "email": "customer@petcare.vn",
        "fullName": "Nguyễn Minh Anh",
        "phone": "0901234567",
        "avatarUrl": null,
        "role": "CUSTOMER",
        "status": "ACTIVE",
        "roles": ["CUSTOMER"],
        "createdAt": "2026-10-01T10:00:00Z",
        "updatedAt": "2026-10-01T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules**

- Bộ lọc nằm trong một JPQL query duy nhất; bỏ trống param = không lọc chiều đó.
- `search` chỉ so khớp `full_name` và `email`, **không** phải `phone` hay `id`.
- Không có endpoint xuất CSV hay export.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `401` | — | Thiếu token |
| `403` | `Access denied` | Đã đăng nhập nhưng không có `ADMIN`/`OWNER` |
| `500` | `Internal server error` | `sortBy` không phải field hợp lệ (`PropertyReferenceException`) |

### B.4 `GET /api/v1/users/{id}`

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | `ADMIN` hoặc `OWNER` |
| Path param | `id` (UUID) |

**Response `200`** — shape `UserResponse` như B.1.

**Errors**

| HTTP | `message` |
|---|---|
| `403` | `Access denied` |
| `404` | `User not found with id: <id>` |
| `500` | `Internal server error` (id không phải UUID hợp lệ — xem §0.5) |

### B.5 `PATCH /api/v1/users/{id}/status`

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | `ADMIN` |
| CSDL | `users.status` |

**Request — `UserStatusUpdateRequest`**

```json
{ "status": "LOCKED" }
```

**Response `200`** — shape `UserResponse`.

**Business rules**

- `@NotBlank`; giá trị được `toUpperCase()` trước khi lưu.
- ⚠ **Không có `CHECK` constraint trong migration** và **không validate danh sách giá trị** ở service. Chỉ cần `NOT NULL`. Giá trị hợp lệ theo `UserPrincipal`: `ACTIVE`, `INACTIVE`, `LOCKED` — `LOCKED` làm `isAccountNonLocked()` false, `ACTIVE` làm `isEnabled()` true.
- Đặt `INACTIVE`/`LOCKED` **không** thu hồi `refresh_tokens` đang hoạt động; token cũ vẫn refresh được cho tới khi hết hạn (7 ngày), dù `AuthService.refreshToken` có kiểm tra `status` và sẽ chặn.
- Không xóa cứng user — dùng `status`.

**Errors:** `400` (thiếu `status`), `403`, `404 User not found with id: <id>`.

### B.6 `POST /api/v1/users/{id}/roles`

| | |
|---|---|
| Trạng thái | `Implemented` · **⚠ Schema gap: `roles`, `user_roles` chưa tồn tại** |
| Auth | `ADMIN` |
| CSDL | `users`, `roles`, `user_roles` |

**Request — `AssignRolesRequest`**

```json
{ "roleIds": ["1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"] }
```

| Field | Validation |
|---|---|
| `roleIds` | `@NotEmpty("Role IDs set cannot be empty")`, `Set<UUID>` |

**Response `200`** — shape `UserResponse` với `roles` = tên các role vừa gán.

**Business rules**

- `POST` này **thay thế toàn bộ** tập role (`user.setRoles(roles)`), không phải thêm một role.
- `userRepository.findByIdIn(roleIds)` có thể trả về tập rỗng nếu ID không tồn tại → `422 No valid roles found for provided IDs`.
- ⚠ **Cập nhật `users.role` không xác định:** `roles.stream().findFirst().ifPresent(...)` lấy phần tử đầu tiên của `HashSet`, thứ tự **không đảm bảo**. `users.role` là cột mà `CustomUserDetailsService` dùng để cấp `ROLE_*`, nên sau lệnh này role chính có thể là bất kỳ role nào trong tập. Nếu cần xác định, phải sửa service hoặc thêm field `primaryRoleId` vào request — **không** coi hành vi hiện tại là contract ổn định.
- Bảng `user_roles` chưa được tạo trong migration → xem `P-2`.

**Errors**

| HTTP | `message` |
|---|---|
| `400` | `Validation failed` (`roleIds` rỗng) |
| `403` | `Access denied` |
| `404` | `User not found with id: <id>` |
| `422` | `No valid roles found for provided IDs` |
| `500` | `Internal server error` (bảng `roles` chưa tồn tại) |

---

## C. Staff — `/api/v1/staff`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/staff` | `Schema-supported` | `Proposed` |
| POST | `/staff` | `Schema-supported` | `Proposed` |
| GET | `/staff/{id}` | `Schema-supported` | `Proposed` |
| PUT | `/staff/{id}` | `Schema-supported` | `Proposed` |
| PATCH | `/staff/{id}/active` | `Schema-supported` | `Proposed` |
| GET | `/staff/{userId}/skills` | `Schema-supported` | `Proposed` |
| POST | `/staff/{id}/skills` | `Schema-supported` | `Proposed` |
| PUT | `/staff/{id}/skills/{serviceId}` | `Schema-supported` | `Proposed` |
| DELETE | `/staff/{id}/skills/{serviceId}` | `Schema-supported` | `Proposed` |

Không có package `staff` trong `services/backend/src/main/java/com/petcare/platform/`. Bảng `staff` và `staff_skills` đã có trong V1, nên các endpoint dưới đây là **thiết kế contract để implement**, không phải mô tả code hiện có.

**CSDL hiện có**

```sql
staff(
  id UUID PK, user_id UUID NOT NULL REFERENCES users(id),
  branch_id UUID NULL REFERENCES branches(id),
  position VARCHAR(100), bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at, updated_at, version
)
staff_skills(
  id UUID PK, staff_id UUID NOT NULL REFERENCES staff(id),
  service_id UUID NOT NULL REFERENCES services(id),
  proficiency_level VARCHAR(50) DEFAULT 'INTERMEDIATE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

### C.1 `POST /api/v1/staff`

**Request (đề xuất)**

```json
{
  "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
  "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "position": "Receptionist",
  "bio": "5 năm kinh nghiệm chăm sóc khách hàng",
  "isActive": true
}
```

| Field | Cột | Bắt buộc | Validation đề xuất |
|---|---|---|---|
| `userId` | `staff.user_id` | Có | UUID; `users` tồn tại; `users.status = 'ACTIVE'` |
| `branchId` | `staff.branch_id` | Không | UUID; `branches` tồn tại; `branches.is_active = TRUE` |
| `position` | `staff.position` | Không | ≤ 100 ký tự |
| `bio` | `staff.bio` | Không | TEXT |
| `isActive` | `staff.is_active` | Không | mặc định `true` |

**Response `201` (đề xuất)**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
    "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "position": "Receptionist",
    "bio": "5 năm kinh nghiệm chăm sóc khách hàng",
    "isActive": true,
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules (đề xuất)**

- Liên kết staff ↔ user là **1:1 theo nghiệp vụ** nhưng CSDL **không** enforce: `staff.user_id` không UNIQUE, chỉ có index `idx_staff_user_id` (V1:381). Nếu cần 1:1 thì đề xuất `P-4`: `CREATE UNIQUE INDEX uq_staff_user ON staff(user_id);`.
- Không tự suy luận: tạo staff **không** tự gán `users.role = 'STAFF'`. Việc đó là việc của `POST /users/{id}/roles`.
- `branch_id` nullable: staff chưa phân công chi nhánh vẫn hợp lệ.
- Không có cơ chế "xoá" staff; dùng `is_active = FALSE` (staff đã có booking/schedule thì không được xóa cứng).

**Errors (đề xuất)**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `userId` |
| `403` | `Access denied` | Không phải `ADMIN`/`OWNER` |
| `404` | `User not found with id: <userId>` | `userId` không tồn tại |
| `404` | `Branch not found with id: <branchId>` | `branchId` không tồn tại |
| `409` | `Staff already exists for this user` | Đã có staff cho `userId` |
| `409` | `Branch is not active` | `branches.is_active = FALSE` |

### C.2 `PUT /api/v1/staff/{id}`

**Request** — cùng shape C.1 nhưng `userId` **không cho đổi** (đổi `userId` là đổi danh tính staff, phải xoá và tạo lại).

| Field được phép sửa | Field khóa |
|---|---|
| `branchId`, `position`, `bio`, `isActive` | `id`, `userId`, `createdAt` |

**Errors:** `404 Staff not found with id: <id>`, `404 Branch not found...`, `409 Branch is not active`, `403`.

### C.3 `PATCH /api/v1/staff/{id}/active`

**Request:** `{"isActive": false}` · **Response `200`:** staff như C.1.

Khi `isActive = FALSE`: staff không xuất hiện trong `GET /schedules/slots/available`, không được gán thêm `staff_skills`. **Không** tự động huỷ booking đang `PENDING`/`CONFIRMED` — việc đó phải là quyết định nghiệp vụ riêng.

### C.4 Gán kỹ năng — `POST /api/v1/staff/{id}/skills`

| | |
|---|---|
| Trạng thái | `Schema-supported` |

**Request**

```json
{
  "serviceIds": ["1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"],
  "proficiencyLevel": "EXPERT"
}
```

| Field | Cột | Validation đề xuất |
|---|---|---|
| `serviceIds` | `staff_skills.service_id` | UUID tồn tại trong `services`; `services.is_active = TRUE` |
| `proficiencyLevel` | `staff_skills.proficiency_level` | Mặc định `INTERMEDIATE`. ⚠ **Không có CHECK** — tự quyết định tập giá trị, đề xuất `EXPERT` / `INTERMEDIATE` / `BEGINNER` |

**Response `201` (đề xuất)**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "staffId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
    "skills": [
      {
        "id": "3f2e1d0c-9b8a-7f6e-5d4c-3b2a1f0e9d8c",
        "serviceId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "proficiencyLevel": "EXPERT",
        "createdAt": "2026-10-01T10:00:00Z"
      }
    ]
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules (đề xuất)**

- ⚠ **`staff_skills` không có UNIQUE constraint.** Không có `UNIQUE(staff_id, service_id)` ⇒ gán trùng sẽ tạo nhiều dòng. Đề xuất `P-4`: `CREATE UNIQUE INDEX uq_staff_skills ON staff_skills(staff_id, service_id);`
- `staff_skills` không có `version`/`updated_at` — bảng append-only, sửa `proficiency_level` bằng cách `DELETE` rồi `INSERT` (xem C.5).

### C.5 `PUT /api/v1/staff/{id}/skills/{serviceId}` và `DELETE /api/v1/staff/{id}/skills/{serviceId}`

Không cần thêm endpoint **gỡ toàn bộ** kỹ năng (`DELETE /staff/{id}/skills`) vì đã có thể gọi `DELETE` cho từng `serviceId` — tránh trùng lặp.

- `PUT` — thay `proficiency_level` cho cặp `(staffId, serviceId)`. Vì bảng không có `updated_at`, cách nhất quán là `DELETE` rồi `INSERT` trong cùng transaction (giữ `created_at` mới).
- `DELETE` — hard delete dòng `staff_skills`; không đụng tới booking đã dùng kỹ năng đó.
- Cả hai: `404 Staff not found`, `404 Skill not found for staff <id> and service <serviceId>`, `403`.

---

## D. Schedules và Time Slots — `/api/v1/schedules`

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/schedules` | `Schema-supported` |
| POST | `/schedules` | `Schema-supported` |
| PUT | `/schedules/{id}` | `Schema-supported` |
| DELETE | `/schedules/{id}` | `Schema-supported` |
| GET | `/schedules/slots/available` | `Schema-supported` |

**CSDL hiện có (V1:150–173)**

```sql
schedules(
  id UUID PK, staff_id UUID NOT NULL REFERENCES staff(id),
  work_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at, updated_at, version,
  UNIQUE (staff_id, work_date)            -- ← hạn chế split shift
)
time_slots(
  id UUID PK,
  schedule_id UUID NULL REFERENCES schedules(id),
  resource_id UUID NULL REFERENCES resources(id),
  start_time TIMESTAMPTZ NOT NULL, end_time TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at, updated_at, version
)
```

### D.1 Split shift — CSDL hiện tại **KHÔNG hỗ trợ**

`UNIQUE (staff_id, work_date)` nghĩa là **mỗi staff chỉ có tối đa một ca mỗi ngày**. Một staff làm 08:00–12:00 và 14:00–18:00 cùng ngày sẽ bị từ chối bởi constraint, dù nghiệp vụ chăm sóc thú cưng thường cần ca nghỉ trưa.

**Hai lựa chọn, không được chọn tùy tiện:**

| Lựa chọn | Migration | Đánh đổi |
|---|---|---|
| **A. Cho phép split shift** *(khuyến nghị)* | `P-5`: `ALTER TABLE schedules DROP CONSTRAINT schedules_staff_id_work_date_key;` + `CHECK (start_time < end_time)` + exclusion constraint trên khoảng thời gian | Cần `btree_gist`; phải xử lý slot cũ |
| B. Giữ 1 ca/ngày | Không migration | Đơn giản nhưng không mô hình hóa được ca nghỉ trưa / ca đêm |

⚠ Extension `btree_gist` **chưa** được bật — `infrastructure/postgres/init.sql` chỉ bật `vector`, `uuid-ossp`, `pg_trgm`. Migration `P-5` phải bắt đầu bằng `CREATE EXTENSION IF NOT EXISTS btree_gist;`.

Nếu chọn A, constraint chống overlap:

```sql
ALTER TABLE schedules DROP CONSTRAINT schedules_staff_id_work_date_key;
ALTER TABLE schedules ADD CONSTRAINT ck_schedules_time CHECK (start_time < end_time);
ALTER TABLE schedules ADD CONSTRAINT ex_schedules_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(work_date + start_time, work_date + end_time, '[)') WITH &&
  );
```

Khoảng nửa mở `[)` cho phép ca kề nhau: `08:00–12:00` và `12:00–14:00` **không** overlap.

### D.2 `GET /api/v1/schedules/slots/available`

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth | `Proposed` — `GET` nên là `permitAll` để khách xem lịch trước khi đăng nhập |
| CSDL | `schedules` + `time_slots` (+ `staff`, `resources`, `services`) |

**Query parameters (đề xuất)**

| Param | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `staffId` | UUID | Không | Lọc theo staff. Bỏ trống = tất cả staff |
| `branchId` | UUID | Không | Lọc theo `staff.branch_id` |
| `serviceId` | UUID | Không | Lọc theo `staff_skills`; bắt buộc khi muốn chỉ hiện staff làm được dịch vụ |
| `date` | `yyyy-MM-dd` | **Có** | Ngày cần tra cứu |
| `includeBooked` | boolean | Không | Mặc định `false` → chỉ trả slot còn trống |

**Response `200` (đề xuất)**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "date": "2026-10-01",
    "timezone": "Asia/Ho_Chi_Minh",
    "staff": [
      {
        "staffId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "scheduleId": "5d4c3b2a-1f0e-9d8c-7b6a-5f4e3d2c1b0a",
        "workStart": "08:00:00",
        "workEnd": "12:00:00",
        "slots": [
          {
            "slotId": "c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "startTime": "2026-10-01T08:00:00+07:00",
            "endTime": "2026-10-01T08:30:00+07:00",
            "available": true,
            "serviceIds": ["1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"],
            "resourceId": null
          },
          {
            "slotId": "d2c3b4a5-f6e7-8b9c-0d1e-2f3a4b5c6d7e",
            "startTime": "2026-10-01T08:30:00+07:00",
            "endTime": "2026-10-01T09:00:00+07:00",
            "available": false,
            "bookingId": null
          }
        ]
      }
    ]
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules (đề xuất)**

- **Timezone.** `schedules.work_date/start_time/end_time` là `DATE` + `TIME` không có timezone ⇒ ngữ nghĩa phụ thuộc múi giờ của chi nhánh, phải quy ước trước. `time_slots.start_time/end_time` là `TIMESTAMPTZ` ⇒ đã mang offset. Contract đề xuất trả `startTime`/`endTime` là **ISO-8601 kèm offset** và kèm trường `timezone` của chi nhánh. Nếu hệ thống có nhiều múi giờ, xem `P-6` (chuyển `schedules` sang `starts_at`/`ends_at TIMESTAMPTZ`).
- **Cách sinh slot.** Slot được materialize sẵn vào `time_slots` (có `schedule_id`, `resource_id`). Quy tắc sinh: chia `[schedule.start_time, schedule.end_time)` thành các đoạn `services.duration_minutes`; slot được tạo khi tạo/cập nhật `schedules`. Endpoint này **đọc** slot đã có, không sinh động.
- **Slot còn trống** = `schedules.is_available = TRUE` **AND** `time_slots.is_booked = FALSE` **AND** `time_slots.start_time > now()`. Slot đã hết hạn trong ngày cũng phải bị loại.
- **Điều kiện staff/dịch vụ:** nếu truyền `serviceId`, chỉ hiện slot của staff có dòng `staff_skills(staff_id, service_id)` tương ứng và `staff.is_active = TRUE`. Nếu truyền `branchId`, chỉ hiện staff thuộc chi nhánh đó.
- **Ngày nghỉ:** không có bảng ngày nghỉ/holiday. Cách biểu diễn hiện tại là **không tạo `schedules`** cho ngày đó (hoặc đặt `is_available = FALSE`). Nếu cần lịch nghỉ lặp lại theo tuần thì cần migration `P-7`.
- **Không có resource nào available:** nếu slot gắn `resource_id` và `resources.is_available = FALSE`, coi như không có slot cho dịch vụ đó.

### D.3 `POST /api/v1/schedules`

**Request (đề xuất)**

```json
{
  "staffId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
  "workDate": "2026-10-01",
  "startTime": "08:00:00",
  "endTime": "12:00:00",
  "isAvailable": true,
  "slotDurationMinutes": 30
}
```

**Response `201`** — `{"id", "staffId", "workDate", "startTime", "endTime", "isAvailable", "createdAt", "updatedAt"}`.

**Business rules (đề xuất)**

- `staffId` phải tồn tại và `staff.is_active = TRUE`.
- `startTime < endTime` — hiện **chưa có CHECK** trong migration.
- Tạo `schedules` và sinh `time_slots` **trong cùng transaction**.
- ⚠ Nếu chọn lựa chọn D.1-A thì split shift được phép; nếu giữ constraint hiện tại thì ca thứ hai trong ngày sẽ vi phạm UNIQUE.

**Errors (đề xuất)**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `staffId`/`workDate`, `startTime >= endTime` |
| `403` | `Access denied` | Không phải `ADMIN`/`OWNER` |
| `404` | `Staff not found with id: <staffId>` | |
| `409` | `Schedule already exists for this staff and date` | Vi phạm `UNIQUE(staff_id, work_date)` (nếu giữ lựa chọn B) |
| `409` | `Schedule overlaps an existing schedule` | Vi phạm exclusion constraint (nếu đã áp dụng D.1-A) |

### D.4 `PUT /api/v1/schedules/{id}` · `DELETE /api/v1/schedules/{id}`

- `PUT`: sửa `startTime`/`endTime`/`isAvailable`. **Nếu đã có `time_slots` được đặt thì không được thu hẹp giờ làm mất slot booked** → trả `409 Schedule has booked slots`. Các slot không còn nằm trong khoảng mới bị xoá.
- `DELETE`: chỉ cho xoá khi **không** còn `time_slots.is_booked = TRUE` thuộc schedule → nếu không, `409 Schedule has booked slots`. Xoá `schedules` kéo theo xoá `time_slots` không được đặt (FK `time_slots.schedule_id` **không có `ON DELETE CASCADE`** ⇒ phải xoá thủ công trong transaction).
- Không có lịch sử thay đổi schedule (audit chỉ có bảng `audit_logs` chung).

### D.5 Chống hai request đặt cùng một slot — **CSDL hiện tại KHÔNG đảm bảo**

Kết luận quan trọng: **kiểm tra ở tầng Java là không đủ.**

| Tầng | Có gì hiện tại | Đủ chưa |
|---|---|---|
| Java | Có thể query `time_slots.is_booked` trước khi insert booking | ✘ Race condition giữa 2 transaction |
| SQL | `time_slots.is_booked BOOLEAN` | ✘ Không có constraint |
| SQL | `booking_items.time_slot_id UUID NULL REFERENCES time_slots(id)` | ✘ **Không UNIQUE** ⇒ nhiều booking trỏ cùng một slot |

Nguy cơ thực tế: hai `POST /bookings` chạy song song, cả hai đọc `is_booked = FALSE`, cả hai insert `booking_items` với cùng `time_slot_id` → cả hai thành công. Cột boolean không tự bảo vệ.

**Cơ chế cần bổ sung — `P-8` (bắt buộc trước khi mở API booking):**

```sql
-- 1) Chặn trùng slot ở mức database
ALTER TABLE booking_items ADD CONSTRAINT ck_booking_items_status
  CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'));
CREATE UNIQUE INDEX uq_booking_items_active_slot
  ON booking_items(time_slot_id) WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';
CREATE UNIQUE INDEX uq_booking_items_staff_slot
  ON booking_items(staff_id, time_slot_id) WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';

-- 2) CAS compare-and-set để đánh dấu slot đã đặt
UPDATE time_slots SET is_booked = TRUE, updated_at = now()
 WHERE id = :slotId AND is_booked = FALSE;
-- số dòng affected = 0  ⇒  slot đã có người giữ  ⇒  trả 409 SLOT_ALREADY_BOOKED
```

Và bắt buộc trong service:

1. `POST /bookings` chạy trong **một transaction** với `SELECT ... FOR UPDATE` trên dòng `time_slots` cần dùng, **hoặc** dùng câu `UPDATE ... WHERE is_booked = FALSE` ở trên (CAS) và rollback toàn bộ nếu affected = 0.
2. Bắt `DataIntegrityViolationException` từ `uq_booking_items_active_slot` → map `409 SLOT_ALREADY_BOOKED`.
3. Chỉ đánh `is_booked = TRUE` **khi** booking được tạo; hủy booking thì `is_booked = FALSE` trong cùng transaction.
4. Không dựa vào `@Version` của `time_slots` làm cơ chế chính — optimistic lock phát hiện conflict *sau* khi đã ghi, còn CAS/row lock ngăn ghi trùng ngay.

Ngoài slot, chống **overlap theo staff** giữa hai slot khác nhau cần denormalize mốc thời gian vào `booking_items` và dùng exclusion constraint (`P-9`), vì `booking_items` không lưu thời gian:

```sql
ALTER TABLE booking_items
  ADD COLUMN start_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN end_at   TIMESTAMPTZ NOT NULL;
CREATE INDEX ivfflat… -- không dùng cho thời gian
CREATE INDEX idx_booking_items_staff_time ON booking_items(staff_id, start_at);
ALTER TABLE booking_items ADD CONSTRAINT ex_booking_items_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status IN ('PENDING','CONFIRMED','IN_PROGRESS'));
```

---

## E. Pets — `/api/v1/pets`

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/pets` | `Schema-supported` (chỉ có DTO) |
| POST | `/pets` | `Schema-supported` (chỉ có DTO) |
| GET | `/pets/{id}` | `Schema-supported` |
| PUT | `/pets/{id}` | `Schema-supported` |
| DELETE | `/pets/{id}` | `Schema-supported` |

Package `pet/` hiện chỉ có `dto/CreatePetRequest.java` và `dto/PetResponse.java`. **Không** có `Pet` entity, `PetRepository`, `PetService`, `PetController`.

**CSDL (V1:92–107)**

```sql
pets(
  id UUID PK, owner_id UUID NOT NULL REFERENCES users(id),
  breed_id UUID NULL REFERENCES breeds(id),
  name VARCHAR(255) NOT NULL, species VARCHAR(100) NOT NULL,
  gender VARCHAR(20), date_of_birth DATE, weight DECIMAL(6,2),
  photo_url VARCHAR(500), notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at, updated_at, version
)
breeds(id UUID PK, name VARCHAR(255) NOT NULL, species VARCHAR(100) NOT NULL, description TEXT, created_at, updated_at, version)
```

### E.1 `POST /api/v1/pets`

**Request — `CreatePetRequest` (đã có trong source, chưa được dùng)**

```json
{
  "name": "Milu",
  "species": "DOG",
  "breedId": null,
  "gender": "FEMALE",
  "dateOfBirth": "2023-03-15",
  "weight": 8.5,
  "photoUrl": null,
  "notes": "Sợ tiếng ồn lớn"
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `name` | `pets.name` | Có | `@NotBlank`; ≤ 255 |
| `species` | `pets.species` | Có | `@NotBlank`; ≤ 100. **Là string tự do**, không phải UUID |
| `breedId` | `pets.breed_id` | Không | UUID; `breeds` tồn tại |
| `gender` | `pets.gender` | Không | ≤ 20. ⚠ **Không có CHECK** |
| `dateOfBirth` | `pets.date_of_birth` | Không | `yyyy-MM-dd`; không được ở tương lai |
| `weight` | `pets.weight` | Không | `DECIMAL(6,2)`; ⚠ **không có CHECK `> 0`** |
| `photoUrl` | `pets.photo_url` | Không | ≤ 500 |
| `notes` | `pets.notes` | Không | TEXT |

**Response `201` — `PetResponse`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "ownerId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "breedId": null,
    "name": "Milu",
    "species": "DOG",
    "gender": "FEMALE",
    "dateOfBirth": "2023-03-15",
    "weight": 8.5,
    "photoUrl": null,
    "notes": "Sợ tiếng ồn lớn",
    "isActive": true,
    "createdAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

Ghi chú tên field: `PetResponse` là Java `record` với component `boolean isActive` ⇒ JSON field là **`isActive`** (không phải `active`). Không có `updatedAt` trong DTO.

**Business rules (đề xuất)**

- **`ownerId` luôn lấy từ `@AuthenticationPrincipal`, không nhận từ request.** `CreatePetRequest` không có field `ownerId` — đúng nguyên tắc "ownership do server quyết định".
- Không có endpoint cho staff/owner tạo pet hộ người khác.
- ⚠ **`species` bị lưu trùng 2 nơi:** `pets.species` (string tự do) và `breeds.species` (string, khi `breedId` có giá trị). Không có FK giữa hai cột ⇒ có thể lệch dữ liệu. Nếu chấp nhận `breedId`, service **phải** kiểm tra `breeds.species == pets.species` và từ chối nếu lệch (`422 Breed does not match species`).

### E.2 `GET /api/v1/pets`

| | |
|---|---|
| Auth | Logged in |

**Query:** `page`, `size`, `search` (theo `name`), `species`, `breedId`, `isActive` (mặc định `true`).

**Response `200`** — `ApiResponse<PageResponse<PetResponse>>` (theo chuẩn envelope/pagination ở §0.3–0.4).

**Business rules**

- **Owner** chỉ thấy pet có `pets.owner_id = principal.id`.
- **Staff/Admin** được lọc thêm theo `ownerId`, nhưng **không** được xem pet chưa gán cho mình nếu nghiệp vụ giới hạn theo chi nhánh — phạm vi cụ thể cần chốt. Với schema hiện tại, `pets` **không** có `branch_id` ⇒ không thể suy ra "pet trong phạm vi chi nhánh của staff" một cách trực tiếp. Cách xác định phạm vi hợp lệ duy nhất hiện tại là **qua booking**: staff có booking với pet đó trong `bookings.branch_id` thuộc `staff.branch_id`. Nếu cần quyền theo "lịch sử chăm sóc" thì dùng quy tắc đó và ghi rõ trong tài liệu nội bộ; nếu cần quyền theo "phụ trách chính" thì cần thêm `pets.branch_id` (`P-10`).
- Pet đã soft-delete phải bị loại khỏi mặc định.

### E.3 `GET /api/v1/pets/{id}`

**Auth:** owner của pet, hoặc staff/admin theo phạm vi ở E.2.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Không phải owner, không có quyền staff |
| `404` | `Pet not found with id: <id>` | Không tồn tại **hoặc** `is_active = FALSE` (để không lộ sự tồn tại của pet đã xoá) |
| `403` | `Pet is deleted` | Nếu tách 404 và 403 thành hai nhánh |

⚠ **Không dùng 404 cho trường hợp "không có quyền"** một cách tùy tiện; chọn một quy ước và ghi nhất quán. Contract này chọn **403 cho sai quyền, 404 cho không tồn tại/đã xoá**.

### E.4 `PUT /api/v1/pets/{id}`

| Field | Owner được sửa | Ghi chú |
|---|---|---|
| `name` | ✔ | |
| `species` | ✔ | Đổi species phải set `breedId = null` hoặc breed cùng species |
| `breedId` | ✔ | |
| `gender` | ✔ | |
| `dateOfBirth` | ✔ | |
| `weight` | ✔ | |
| `photoUrl` | ✔ | |
| `notes` | ✔ | |

**Trường bị giới hạn (Proposed rule):**

| Field | Ai được sửa | Lý do |
|---|---|---|
| `ownerId` | Không ai qua API | Chuyển chủ pet là thao tác riêng; nếu cần thì `POST /pets/{id}/transfer` (`Proposed`) |
| `isActive` | Owner (soft delete) hoặc `ADMIN` | Không cho user tự kích hoạt lại pet đã bị staff vô hiệu hoá |
| `id`, `createdAt` | Không | |

**Errors:** như E.3, cộng `422 Breed does not match species`.

### E.5 `DELETE /api/v1/pets/{id}`

| | |
|---|---|
| Trạng thái | `Schema-supported` |

**Soft delete**: `UPDATE pets SET is_active = FALSE, updated_at = now() WHERE id = :id`. **Không xóa cứng** vì `pets` có FK từ `bookings`, `medical_records`, `vaccinations`.

- `DELETE` trả `204 No Content`.
- Lặp lại trên pet đã xoá → idempotent, vẫn `204`.
- Pet có booking `PENDING`/`CONFIRMED` → `409 Pet has active bookings`.
- `ADMIN` được xoá pet của bất kỳ ai; owner chỉ xoá pet của mình.

### E.6 Breed và species — phân biệt rõ

| API | Trạng thái | CSDL |
|---|---|---|
| `GET /breeds` | `Schema-supported` | ✔ `breeds` tồn tại |
| `POST /breeds` | `Schema-supported` | ✔ |
| `PUT /breeds/{id}` | `Schema-supported` | ✔ |
| `GET /species`, `POST /species` | **`Proposed` — KHÔNG có bảng `pet_species`** | ✘ |

⚠ CSDL hiện tại chỉ có `breeds.species VARCHAR(100)` — **một cột text**, không có bảng tra cứu loài riêng. Vì vậy:
- Không thể có API `/species` như `docs/erd.md` mô tả.
- Nếu muốn quản lý loài có kiểm soát (danh sách, mô tả, icon) thì cần migration `P-11` tạo `pet_species(id, name UNIQUE, description, icon, ...)` và backfill từ `DISTINCT breeds.species UNION DISTINCT pets.species`, đồng thời `ALTER TABLE breeds ADD COLUMN species_id`, `pets ADD COLUMN species_id`.
- `GET /breeds` (đề xuất): query `species`, `search`, phân trang. Response `{ "id", "name", "species", "description", "createdAt" }`.

---

## F. Medical Records và Vaccinations — `/api/v1/medical`

Controller: `medical/controller/MedicalController.java`. **Chỉ có 2 endpoint GET, không có endpoint tạo.**

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/api/v1/medical/records/pet/{petId}` | `Implemented` (read-only) |
| GET | `/api/v1/medical/vaccinations/pet/{petId}` | `Implemented` (read-only) |
| POST | `/api/v1/medical/records` | `Schema-supported` |
| GET | `/api/v1/medical/records/{id}` | `Schema-supported` |
| PUT | `/api/v1/medical/records/{id}` | `Schema-supported` |
| POST | `/api/v1/medical/vaccinations` | `Schema-supported` |
| PUT | `/api/v1/medical/vaccinations/{id}` | `Schema-supported` |
| GET | `/api/v1/medical/pets/{petId}/vaccinations/due` | `Schema-supported` |

**CSDL (V1:110–134)**

```sql
medical_records(
  id UUID PK, pet_id UUID NOT NULL REFERENCES pets(id),
  vet_name VARCHAR(255), diagnosis TEXT, treatment TEXT, notes TEXT,
  visit_date DATE NOT NULL, created_at, updated_at, version
)
vaccinations(
  id UUID PK, pet_id UUID NOT NULL REFERENCES pets(id),
  vaccine_name VARCHAR(255) NOT NULL,
  administered_date DATE NOT NULL, next_due_date DATE NULL,
  vet_name VARCHAR(255), batch_number VARCHAR(100),
  created_at, updated_at, version
)
```

⚠ **Entity thiếu cột (sẽ vi phạm `ddl-auto: validate` khi dùng):**

| Entity | Field | Cột trong DB | Tình trạng |
|---|---|---|---|
| `MedicalRecord` | — | `vet_name`, `notes` | ⚠ Không map ⇒ không đọc/ghi được 2 cột này |
| `Vaccination` | — | `vet_name`, `batch_number` | ⚠ Không map |

Cần sửa entity, không sửa migration (xem `P-12` — chỉ sửa mapping).

### F.1 `GET /api/v1/medical/records/pet/{petId}` *(Implemented)*

| | |
|---|---|
| Trạng thái | `Implemented` |
| Auth | `anyRequest().authenticated()` — **không có `@PreAuthorize`**, chỉ cần đăng nhập |
| Path param | `petId` (UUID) |

⚠ **Response KHÔNG dùng `ApiResponse`.** `MedicalController` trả `List<MedicalRecord>` thẳng (serialize thẳng JPA entity), không có envelope, không có phân trang:

```json
[
  {
    "id": "8e7d6c5b-4a3f-2e1d-0c9b-8a7f6e5d4c3b",
    "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "diagnosis": "Viêm đường ruột cấp",
    "treatment": "Kháng sinh 7 ngày",
    "visitDate": "2026-10-01",
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z",
    "version": 0
  }
]
```

Lưu ý: response là **entity** nên bao gồm cả `version` (cột `@Version`) và các field không map như `vetName`/`notes` sẽ **vắng mặt**.

**Business rules hiện tại (⚠ cần gia cố):**

- ⚠ **Không có kiểm tra quyền sở hữu.** `MedicalService.getRecordsByPet(petId)` không dùng principal; bất kỳ user đã đăng nhập nào đều đọc được hồ sơ y tế của bất kỳ pet nào nếu biết `petId`. Đây là lỗ hổng rò rỉ dữ liệu y tế và **phải** được sửa trước khi coi là production.
- ⚠ Không có phân trang — trả toàn bộ danh sách.
- ⚠ Không sắp xếp; thứ tự do JPA/PostgreSQL trả về.

**Errors:** `401` (chưa đăng nhập), `500` (`petId` không phải UUID). Không có `404` khi pet không có hồ sơ — trả `[]`.

### F.2 `GET /api/v1/medical/vaccinations/pet/{petId}` *(Implemented)*

Cùng shape và cùng ⚠ về quyền/đóng gói với F.1. Trả `List<Vaccination>`:

```json
[
  {
    "id": "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
    "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "vaccineName": "Vaccine dại",
    "administeredDate": "2026-03-01",
    "nextDueDate": "2027-03-01",
    "createdAt": "2026-03-01T09:00:00Z",
    "updatedAt": "2026-03-01T09:00:00Z",
    "version": 0
  }
]
```

⚠ `vetName` và `batchNumber` không có trong response vì entity không map 2 cột đó.

### F.3 `POST /api/v1/medical/records` *(Schema-supported)*

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth đề xuất | `VETERINARIAN` hoặc `ADMIN` (chưa có code enforce) |
| CSDL | `medical_records` |

**Request (đề xuất)**

```json
{
  "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
  "vetName": "BS. Trần Minh",
  "diagnosis": "Viêm đường ruột cấp",
  "treatment": "Amoxicillin 250mg, 2 lần/ngày trong 7 ngày",
  "notes": "Theo dõi 3 ngày sau điều trị",
  "visitDate": "2026-10-01"
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `petId` | `pet_id` | Có | UUID; pet tồn tại và `is_active = TRUE` |
| `vetName` | `vet_name` | Không | ≤ 255. ⚠ **Không có cột `veterinarian_id`** ⇒ không liên kết được với user/bác sĩ |
| `diagnosis` | `diagnosis` | Không | TEXT |
| `treatment` | `treatment` | Không | TEXT |
| `notes` | `notes` | Không | TEXT |
| `visitDate` | `visit_date` | **Có** | `yyyy-MM-dd`; không được ở tương lai; không sớm hơn `pets.date_of_birth` |

**Response `201` (đề xuất)** — shape `MedicalRecord` như F.1.

**Business rules (đề xuất)**

- **Validation ngày khám:** `visitDate <= CURRENT_DATE`; `visitDate >= pets.date_of_birth` nếu có. Sai → `400` hoặc `422` (`Validation failed` / `visitDate must not be in the future`).
- **Không nhận `appointmentId`:** bảng `medical_records` **không có** cột này. `docs/erd.md` và `docs/sequence-diagrams.md` mô tả `appointment_id` — mâu thuẫn với CSDL. Xem `P-13` nếu cần liên kết lịch hẹn.
- **Không xóa cứng** hồ sơ y tế. Nếu cần ẩn bản ghi sai → thêm cột trạng thái (`P-14`).
- Mọi thao tác ghi hồ sơ y tế nên ghi thêm vào `audit_logs` (`user_id`, `action`, `entity_type = 'MEDICAL_RECORD'`, `entity_id`, `old_value`, `new_value`).

### F.4 `GET` / `PUT /api/v1/medical/records/{id}` *(Schema-supported)*

**Response `200`** — `ApiResponse<MedicalRecord>` nếu chuẩn hoá envelope (khuyến nghị để đồng nhất với §0.3).

**Quyền truy cập dữ liệu y tế (đề xuất, cần chốt với bên nghiệp vụ):**

| Vai trò | Đọc | Tạo | Sửa |
|---|---|---|---|
| Owner của pet | ✔ (record của pet mình) | ✘ | ✘ |
| `VETERINARIAN` | ✔ | ✔ | ✔ |
| `ADMIN` | ✔ | ✔ | ✔ |
| `STAFF` (lễ tân) | ✔ chỉ `diagnosis` + `visitDate` (trường tối thiểu) | ✘ | ✘ |

⚠ CSDL **không có cột `veterinarian_id`** trên `medical_records` ⇒ không thể lọc "bác sĩ nào đang khám"; `vet_name` chỉ là text tự do. Đề xuất `P-15`.

### F.5 `POST /api/v1/medical/vaccinations` *(Schema-supported)*

**Request (đề xuất)**

```json
{
  "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
  "vaccineName": "Vaccine dại",
  "administeredDate": "2026-10-01",
  "nextDueDate": "2027-10-01",
  "vetName": "BS. Trần Minh",
  "batchNumber": "BATCH-2026-014"
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `petId` | `pet_id` | Có | pet tồn tại |
| `vaccineName` | `vaccine_name` | **Có** | `NOT NULL`, ≤ 255 |
| `administeredDate` | `administered_date` | **Có** | ≤ `CURRENT_DATE` |
| `nextDueDate` | `next_due_date` | Không | ⚠ **Phải > `administeredDate`** |
| `vetName` | `vet_name` | Không | ≤ 255 |
| `batchNumber` | `batch_number` | Không | ≤ 100 |

**Response `201`** — `Vaccination` như F.2.

**Business rules (đề xuất)**

- Validation ngày tiêm: `administeredDate <= CURRENT_DATE`; `nextDueDate > administeredDate` nếu có.
- ⚠ **CSDL không có CHECK cho `next_due_date > administered_date`** ⇒ phải kiểm ở service. Đề xuất `P-12`:
  `ALTER TABLE vaccinations ADD CONSTRAINT ck_vaccinations_due CHECK (next_due_date IS NULL OR next_due_date > administered_date);`
- Không có UNIQUE ⇒ có thể ghi trùng cùng vaccine/ngày. Nếu nghiệp vụ cần chống, đề xuất `UNIQUE (pet_id, vaccine_name, administered_date)`.
- **Nhắc tiêm tiếp theo:** cột `next_due_date` đã đủ để tính. Endpoint `GET /api/v1/medical/pets/{petId}/vaccinations/due?before=<date>` lọc `next_due_date <= <date>`; index đề xuất `P-12`: `CREATE INDEX idx_vaccinations_next_due ON vaccinations(next_due_date) WHERE next_due_date IS NOT NULL;`
- Event `vaccination.due` đã có routing key trong `RabbitMQQueues` và queue `vaccination.due` (Core), nhưng **chưa có publisher/consumer nào** ⇒ không được coi là hoạt động.

### F.6 Prescription, Medicines, Prescription Items — **`Proposed`, cần migration**

**Kiểm tra CSDL hiện tại:** ❌ **Không có** bảng `medicines`, `prescriptions`, `prescription_items` trong bất kỳ migration nào. Vì vậy các endpoint dưới đây là **đề xuất thiết kế**, tuyệt đối không phải API khả dụng.

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/api/v1/medicines` | **`Proposed`** |
| POST | `/api/v1/medicines` | **`Proposed`** |
| PUT | `/api/v1/medicines/{id}` | **`Proposed`** |
| GET | `/api/v1/prescriptions` | **`Proposed`** |
| POST | `/api/v1/prescriptions` | **`Proposed`** |
| GET | `/api/v1/prescriptions/{id}` | **`Proposed`** |

**Migration đề xuất — `P-16`:**

```sql
CREATE TABLE medicines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  unit          VARCHAR(50),
  unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version       BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT uq_medicines_name UNIQUE (name)
);

CREATE TABLE prescriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id  UUID NOT NULL REFERENCES medical_records(id),
  vet_name           VARCHAR(255),
  notes              TEXT,
  issued_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version    BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE prescription_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  medicine_id    UUID NOT NULL REFERENCES medicines(id),
  quantity       INT NOT NULL CHECK (quantity > 0),
  dosage         VARCHAR(255),
  frequency      VARCHAR(255),
  instructions   TEXT,
  unit_price     DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),  -- snapshot
  subtotal       DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prescriptions_record  ON prescriptions(medical_record_id);
CREATE INDEX idx_prescription_items_pr ON prescription_items(prescription_id);
```

**`POST /api/v1/prescriptions` (đề xuất)**

```json
{
  "medicalRecordId": "8e7d6c5b-4a3f-2e1d-0c9b-8a7f6e5d4c3b",
  "notes": "Uống sau ăn 30 phút",
  "items": [
    { "medicineId": "<medicine-uuid>", "quantity": 14, "dosage": "250mg", "frequency": "2 lần/ngày", "instructions": "Uống với nước ấm" }
  ]
}
```

Business rules: `unit_price` **snapshot** từ `medicines.unit_price`; client không gửi giá. Tạo prescription + items trong một transaction. Cho phép cập nhật đơn thuốc khi `prescriptions` chưa được thanh toán (liên kết `invoice_items` — xem `P-17` nếu thuốc tính vào invoice).

---

## G. Promotions — `/api/v1/promotions`

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/promotions` | `Schema-supported` |
| POST | `/promotions` | `Schema-supported` |
| GET | `/promotions/{id}` | `Schema-supported` |
| PUT | `/promotions/{id}` | `Schema-supported` |
| PATCH | `/promotions/{id}/active` | `Schema-supported` |
| POST | `/promotions/validate` | `Schema-supported` (đề xuất mới) |
| POST | `/promotions/redeem` | `Schema-supported` (đề xuất mới) |

Không có package `promotion` trong source.

**CSDL (V1:176–191)**

```sql
promotions(
  id UUID PK,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(50) NOT NULL,          -- ⚠ KHÔNG có CHECK
  discount_value DECIMAL(12,2) NOT NULL,       -- ⚠ KHÔNG có CHECK
  min_order_amount DECIMAL(12,2) DEFAULT 0,
  max_uses INT,                                -- NULL = không giới hạn
  used_count INT NOT NULL DEFAULT 0,           -- ⚠ KHÔNG có CHECK >= 0
  start_date DATE, end_date DATE,              -- ⚠ KHÔNG có CHECK thứ tự
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at, updated_at, version
)
```

⚠ **Không có `description`, không có `promotion_services`** ⇒ khẳng định "áp dụng cho service cụ thể" là điều **không thể triển khai** với CSDL hiện tại. Xem `P-18`.

### G.1 `POST /api/v1/promotions`

**Request (đề xuất)**

```json
{
  "code": "SAVE20",
  "name": "Ưu đãi mùa hè",
  "discountType": "PERCENTAGE",
  "discountValue": 20.00,
  "minOrderAmount": 200000.00,
  "maxUses": 100,
  "startDate": "2026-07-01",
  "endDate": "2026-09-30",
  "isActive": true
}
```

| Field | Cột | Bắt buộc | Validation đề xuất |
|---|---|---|---|
| `code` | `code` | Có | ≤ 50; `UNIQUE` ✔; chuẩn hoá **UPPERCASE** trước khi lưu và khi tra cứu |
| `name` | `name` | Có | ≤ 255 |
| `discountType` | `discount_type` | Có | ⚠ service phải chặn giá trị ngoài `PERCENTAGE`, `FIXED_AMOUNT` (DB không chặn) |
| `discountValue` | `discount_value` | Có | `PERCENTAGE`: `0 < v <= 100`; `FIXED_AMOUNT`: `v >= 0` |
| `minOrderAmount` | `min_order_amount` | Không | mặc định `0`; `>= 0` |
| `maxUses` | `max_uses` | Không | `null` = không giới hạn; `>= 0` |
| `startDate` | `start_date` | Không | `yyyy-MM-dd` |
| `endDate` | `end_date` | Không | `> startDate`; **inclusive** — hiệu lực tới hết ngày |
| `isActive` | `is_active` | Không | mặc định `true` |

**Response `201` (đề xuất)**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "code": "SAVE20",
    "name": "Ưu đãi mùa hè",
    "discountType": "PERCENTAGE",
    "discountValue": 20.00,
    "minOrderAmount": 200000.00,
    "maxUses": 100,
    "usedCount": 0,
    "startDate": "2026-07-01",
    "endDate": "2026-09-30",
    "isActive": true,
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

### G.2 Tính discount — **server quyết định tuyệt đối**

```
subtotal         = Σ (booking_items.unit_price)        -- server đọc từ DB
discount_amount  = discountType == 'PERCENTAGE'
                     ? round(subtotal × discountValue / 100, 2)
                     : min(discountValue, subtotal)
discount_amount  = min(discount_amount, subtotal)      -- không bao giờ âm, không vượt subtotal
eligible         = subtotal >= min_order_amount
total            = subtotal − discount_amount
```

| Quy tắc | Chi tiết |
|---|---|
| Ai tính | **Server.** `POST /bookings` và `POST /invoices` tự tính từ `booking_items.unit_price`. |
| Client được gửi | Chỉ `promotionCode` (string) trong `POST /bookings`. |
| Client **không** được gửi | `discountAmount`, `totalAmount`, `discountValue`, `discountType`, `usedCount` |
| Client **không** được đọc để quyết định | Client có thể **gọi** `POST /promotions/validate` để hiển thị số tiền dự kiến, nhưng số tiền cuối cùng do server tính lại và là giá trị có hiệu lực. |
| `discount_amount` lưu ở đâu | `bookings.discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0` ✔ và được dùng khi tạo invoice. |

### G.3 `POST /api/v1/promotions/validate` — **không** tiêu thụ lượt dùng

| | |
|---|---|
| Trạng thái | `Schema-supported` (endpoint mới đề xuất) |
| Auth | Logged in |

**Request**

```json
{
  "code": "SAVE20",
  "bookingTotal": 500000.00,
  "serviceIds": ["1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"]
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `code` | Có | Chuẩn hoá uppercase, trim |
| `bookingTotal` | Có | Tổng tiền **ước tính** để kiểm `min_order_amount` |
| `serviceIds` | Không | ⚠ **Hiện không dùng được** — không có bảng nối promotion↔service. Xem `P-18` |

**Response `200` — hợp lệ**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "valid": true,
    "code": "SAVE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20.00,
    "bookingTotal": 500000.00,
    "discountAmount": 100000.00,
    "finalAmount": 400000.00,
    "message": "Promotion is valid"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Response `200` — không hợp lệ** (trả `200`, không phải `4xx`, để UI hiển thị lý do):

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "valid": false,
    "code": "SAVE20",
    "discountAmount": 0.00,
    "finalAmount": 500000.00,
    "reason": "PROMOTION_EXPIRED",
    "message": "Promotion đã hết hạn"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**`reason` có thể trả về**

| `reason` | Điều kiện |
|---|---|
| `PROMO_NOT_FOUND` | Không tồn tại `code` |
| `PROMO_INACTIVE` | `is_active = FALSE` |
| `PROMO_NOT_STARTED` | `CURRENT_DATE < start_date` |
| `PROMO_EXPIRED` | `CURRENT_DATE > end_date` |
| `PROMO_USAGE_EXHAUSTED` | `max_uses IS NOT NULL AND used_count >= max_uses` |
| `MIN_ORDER_NOT_MET` | `bookingTotal < min_order_amount` |
| `INVALID_DISCOUNT_CONFIG` | `discount_type`/`discount_value` sai (lỗi dữ liệu) |

### G.4 `POST /api/v1/promotions/redeem` — **tiêu thụ lượt dùng**

Phân biệt bắt buộc:

| | `validate` (G.3) | `redeem` (G.4) |
|---|---|---|
| Tăng `used_count` | ❌ **không** | ✔ có |
| Ghi vào lịch sử sử dụng | ❌ | ✔ |
| Cần transaction + lock | ❌ | ✔ |
| Idempotent | không cần | **bắt buộc** |

**Request**

```json
{
  "code": "SAVE20",
  "bookingId": "<booking-uuid>",
  "idempotencyKey": "8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c"
}
```

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "promotionId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "bookingId": "<booking-uuid>",
    "discountAmount": 100000.00,
    "usedCount": 13,
    "remainingUses": 87
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules (đề xuất)**

- Chạy trong **một transaction**: `SELECT ... FROM promotions WHERE code = :code FOR UPDATE` → kiểm tra điều kiện → `UPDATE promotions SET used_count = used_count + 1, updated_at = now() WHERE id = :id` → ghi `bookings.promotion_id`, `bookings.discount_amount` → ghi `audit_logs`.
- Bắt `DataIntegrityViolationException` → `409`.
- **Rollback toàn bộ** nếu bước sau thất bại — không được để `used_count` tăng mà `bookings.discount_amount` chưa ghi.
- Nếu booking đã có `promotion_id` khác → `422 Booking already has a different promotion`.
- Nếu gọi lại cùng `idempotencyKey` ⇒ trả lại kết quả cũ, không tăng `used_count` lần nữa. Cần bảng lưu key — xem `P-19`.

### G.5 Coupon theo từng user — **cần migration**

Hiện tại `promotions` chỉ có `max_uses`/`used_count` tổng. **Không có** khái niệm coupon, không có giới hạn theo user, không có lịch sử sử dụng. Các API `/coupons`, `/coupons/validate`, `/coupons/{id}/usages` mà `docs/erd.md` mô tả là **`Proposed` hoàn toàn**.

**Migration đề xuất — `P-18` (nếu nghiệp vụ cần coupon):**

```sql
CREATE TABLE coupon_usages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id  UUID NOT NULL REFERENCES promotions(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  booking_id    UUID NULL REFERENCES bookings(id),
  discount_amount DECIMAL(12,2) NOT NULL CHECK (discount_amount >= 0),
  used_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_coupon_usages_booking UNIQUE (booking_id)   -- chống dùng 2 lần trên 1 booking
);
CREATE INDEX idx_coupon_usages_promo_user ON coupon_usages(promotion_id, user_id);

CREATE TABLE promotion_services (           -- nếu cần giới hạn theo service
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  service_id   UUID NOT NULL REFERENCES services(id),
  PRIMARY KEY (promotion_id, service_id)
);
```

`per_user_limit` phải được kiểm **bằng đếm trong cùng transaction** (khi đang lock `promotions`), không dùng `UNIQUE(promotion_id, user_id)`.

---

## H. Bookings — `/api/v1/bookings`

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/bookings` | `Schema-supported` (đề xuất mới) |
| GET | `/bookings` | `Schema-supported` |
| GET | `/bookings/{id}` | `Schema-supported` |
| POST | `/bookings/{id}/cancel` | `Schema-supported` |
| POST | `/bookings/{id}/confirm` | `Schema-supported` |
| POST | `/bookings/{id}/start` | `Schema-supported` |
| POST | `/bookings/{id}/complete` | `Schema-supported` |

Không có package `booking` trong source. Dùng **state transition endpoint riêng** (`POST /bookings/{id}/{action}`) thay vì `PATCH /bookings/{id}/status`, để mỗi hành động có validation và audit riêng. Nếu sau này cần đổi trạng thái tùy ý thì thêm `PATCH /bookings/{id}/status` (`Proposed`) — không làm cả hai cùng lúc.

**CSDL (V1:194–221)**

```sql
bookings(
  id UUID PK, customer_id UUID NOT NULL REFERENCES users(id),
  pet_id UUID NOT NULL REFERENCES pets(id),
  branch_id UUID NULL REFERENCES branches(id),
  promotion_id UUID NULL REFERENCES promotions(id),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT, created_at, updated_at, version
)
booking_items(
  id UUID PK, booking_id UUID NOT NULL REFERENCES bookings(id),
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID NULL REFERENCES staff(id),
  time_slot_id UUID NULL REFERENCES time_slots(id),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  unit_price DECIMAL(12,2) NOT NULL,
  notes TEXT, created_at, updated_at, version
)
```

⚠ Không có `CHECK` status, không có bảng lịch sử trạng thái, không có index `(staff_id, time_slot_id)`, và `bookings.status` chỉ có index đơn.

### H.1 `POST /api/v1/bookings`

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth | `CUSTOMER` (đặt cho chính mình); `ADMIN` có thể đặt hộ |
| CSDL | `bookings`, `booking_items`, `time_slots`, `promotions` |

**Request**

```json
{
  "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
  "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "notes": "Bé Milu hơi sợ tiếng ồn",
  "promotionCode": "SAVE20",
  "items": [
    { "serviceId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", "timeSlotId": "c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", "staffId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d", "notes": "Tắm ở nhiệt độ ẩm" }
  ]
}
```

| Field | Cột | Bắt buộc | Validation đề xuất |
|---|---|---|---|
| `petId` | `bookings.pet_id` | Có | Pet tồn tại, `is_active = TRUE`, **`pets.owner_id == principal.id`** |
| `branchId` | `bookings.branch_id` | Không | `branches` tồn tại, `is_active = TRUE` |
| `promotionCode` | `bookings.promotion_id` | Không | Không gửi `promotionId`; server tra cứu `code` |
| `notes` | `bookings.notes` | Không | TEXT |
| `items[].serviceId` | `booking_items.service_id` | Có | `services` tồn tại, `is_active = TRUE` |
| `items[].timeSlotId` | `booking_items.time_slot_id` | Có¹ | Slot tồn tại, chưa đặt, còn ở tương lai |
| `items[].staffId` | `booking_items.staff_id` | Không² | `staff` tồn tại, `is_active = TRUE` |
| `items[].notes` | `booking_items.notes` | Không | TEXT |

¹ Bắt buộc nếu nghiệp vụ cần giữ chỗ cụ thể. Cột là nullable nên có thể cho phép booking chưa chốt slot — nhưng khi đó `time_slots.is_booked` không được đụng tới.
² Cho phép bỏ trống = chưa chỉ định nhân viên; slot sẽ phải được chỉ định khi `confirm`.

**Các trường client KHÔNG được gửi** (server tự tính/tự lấy):

| Trường | Nguồn server |
|---|---|
| `unitPrice` | `services.base_price` (DECIMAL(12,2)) — **snapshot** vào `booking_items.unit_price` |
| `totalAmount` | `Σ booking_items.unit_price` |
| `discountAmount` | Tính từ `promotions` theo G.2 |
| `status` | `'PENDING'` |
| `customerId` | `@AuthenticationPrincipal` |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
    "customerId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "promotionId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "status": "PENDING",
    "totalAmount": 500000.00,
    "discountAmount": 100000.00,
    "notes": "Bé Milu hơi sợ tiếng ồn",
    "items": [
      {
        "id": "e5d4c3b2-a1f9-8e7d-6c5b-4a3f2e1d0c9b",
        "serviceId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "serviceName": "Tắm và chải lông",
        "staffId": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
        "timeSlotId": "c1b2a3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "startTime": "2026-10-01T08:00:00+07:00",
        "endTime": "2026-10-01T08:30:00+07:00",
        "status": "PENDING",
        "unitPrice": 500000.00,
        "notes": "Tắm ở nhiệt độ ẩm"
      }
    ],
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules (đề xuất)**

1. **Validate pet & quyền:** `pets.owner_id == principal.id`. Không tin `customerId` trong request.
2. **Validate service:** `services.is_active = TRUE`. Giá lấy từ `services.base_price`.
3. **Validate staff:** nếu có `staffId`, staff phải `is_active = TRUE`, `staff.branch_id == bookings.branch_id` (nếu `branchId` được gửi), và phải có `staff_skills(staff_id, service_id)` cho **từng** service trong item đó.
4. **Validate slot:** `time_slots.start_time > now()`; slot thuộc `schedules` có `is_available = TRUE`; `schedules.staff_id == booking_items.staff_id` nếu có `staffId`.
5. **Thời lượng dịch vụ:** `(end_time − start_time)` của slot phải bằng `services.duration_minutes` — **đây là nơi `duration_minutes` thực sự được dùng**: nó quyết định độ dài slot khi sinh ở D.3 và được kiểm khớp khi đặt.
6. **Giới hạn slot mỗi item:** mỗi `booking_items` chiếm đúng 1 `time_slot_id`.
7. **Transaction & concurrency:** xem D.5 — bắt buộc CAS `UPDATE time_slots ... WHERE is_booked = FALSE` **hoặc** `SELECT ... FOR UPDATE`, trong cùng transaction với insert `bookings` + `booking_items`. Không tách thành 2 transaction.
8. **Promotion:** nếu có `promotionCode`, áp dụng luồng G.4 trong **cùng transaction**.
9. Phát event `booking.created` (routing key đã khai báo trong `RabbitMQConfig`/`RabbitMQQueues`; ⚠ Core **chưa có** bảng `outbox_events` → xem `P-20`).

**Errors (đề xuất)**

| HTTP | `message` / `code` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `petId` hoặc `items` rỗng |
| `403` | `Access denied` | Không sở hữu pet |
| `404` | `Pet not found with id: <petId>` | Pet không tồn tại / đã xoá |
| `404` | `Service not found with id: <serviceId>` | |
| `404` | `Time slot not found with id: <timeSlotId>` | |
| `404` | `Staff not found with id: <staffId>` | |
| `422` | `Service is not active` | `services.is_active = FALSE` |
| `422` | `Staff is not active` | `staff.is_active = FALSE` |
| `422` | `Staff does not provide this service` | Thiếu `staff_skills` |
| `422` | `Staff does not belong to this branch` | `staff.branch_id != branchId` |
| `422` | `Slot duration does not match service duration` | Lệch `services.duration_minutes` |
| `422` | `Slot is in the past` | `start_time <= now()` |
| `409` | `SLOT_ALREADY_BOOKED` | Slot đã được giữ (vi phạm `uq_booking_items_active_slot` hoặc CAS thất bại) |
| `409` | `STAFF_SCHEDULE_CONFLICT` | Vi phạm exclusion constraint `ex_booking_items_no_overlap` |
| `409` | `PROMO_USAGE_EXHAUSTED` | Hết lượt (xem G.3) |
| `422` | `PROMOTION_INVALID` | Mã không hợp lệ/hết hạn (xem G.3) |

```json
{
  "status": 409,
  "success": false,
  "message": "SLOT_ALREADY_BOOKED",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

⚠ Các mã `SLOT_ALREADY_BOOKED`, `STAFF_SCHEDULE_CONFLICT` chỉ là **đề xuất**. Nếu triển khai theo hướng "đọc message từ `BusinessException`", giữ message tiếng Anh như các endpoint khác để nhất quán với `GlobalExceptionHandler` hiện tại. Trạng thái HTTP **`409`** là lựa chọn chuẩn và đã nằm trong bảng HTTP status ở cuối tài liệu.

### H.2 `GET /api/v1/bookings`

**Query:** `page`, `size`, `status`, `petId`, `branchId`, `staffId`, `customerId`*, `dateFrom`, `dateTo`, `sortBy` (mặc định `createdAt`), `direction` (mặc định `desc`).

`*` `customerId` chỉ `ADMIN` được dùng.

**Response `200`** — `ApiResponse<PageResponse<BookingResponse>>` với `BookingResponse` như H.1 (kèm `items`).

**Quyền xem**

| Vai trò | Phạm vi |
|---|---|
| `CUSTOMER` | Chỉ booking có `customer_id == principal.id` |
| `STAFF` | Booking có `branch_id == staff.branch_id` |
| `VETERINARIAN` / `ADMIN` / `OWNER` | Tất cả |

**Business rules:** mặc định chỉ trả booking ở trạng thái "còn hiệu lực"? Không — mặc định trả tất cả, client tự lọc `status`. Lọc `dateFrom`/`dateTo` áp dụng cho `bookings.created_at` (V1 chưa có index này ⇒ đề xuất `P-21`: `CREATE INDEX idx_bookings_created ON bookings(created_at DESC);`).

### H.3 `GET /api/v1/bookings/{id}`

**Response `200`** — `ApiResponse<BookingResponse>`.

**Errors:** `403` (không thuộc phạm vi xem), `404 Booking not found with id: <id>`.

### H.4 State machine

```
                 ┌──────────────────────────────┐
                 │                              ▼
  [create] ──► PENDING ──► CONFIRMED ──► IN_PROGRESS ──► COMPLETED
                 │             │               │
                 └─────────────┴───────────────┴──────────► CANCELLED
```

| Từ \ Sang | `PENDING` | `CONFIRMED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED` |
|---|---|---|---|---|---|
| `PENDING` | — | ✔ `confirm` | ✘ | ✘ | ✔ `cancel` |
| `CONFIRMED` | ✘ | — | ✔ `start` | ✘ | ✔ `cancel` |
| `IN_PROGRESS` | ✘ | ✘ | — | ✔ `complete` | ✔ `cancel` *(chỉ Admin, xem H.8)* |
| `COMPLETED` | ✘ | ✘ | ✘ | — | ✘ |
| `CANCELLED` | ✘ | ✘ | ✘ | ✘ | — |

**Quyền theo hành động**

| Hành động | `CUSTOMER` (chủ booking) | `STAFF` | `ADMIN`/`OWNER` |
|---|---|---|---|
| `confirm` | ✘ | ✔ (chi nhánh của staff) | ✔ |
| `start` | ✘ | ✔ | ✔ |
| `complete` | ✘ | ✔ | ✔ |
| `cancel` | ✔ (xem điều kiện H.8) | ✔ | ✔ |

### H.5 `POST /api/v1/bookings/{id}/confirm`

**Request:** không body (hoặc `{"staffId": "...", "timeSlotId": "..."}` nếu booking chưa chốt slot).

**Response `200`** — `BookingResponse` với `status = "CONFIRMED"`.

**Business rules**
- Booking phải `PENDING`.
- Phải gán đủ `staff_id` cho **mọi** item (nếu lúc tạo chưa gán) và staff phải hợp lệ theo H.1.3.
- Reserve slot ngay tại bước này nếu lúc tạo chưa reserve: dùng CAS D.5.
- Phát event `booking.confirmed`.

**Errors:** `404`, `403`, `409 BOOKING_INVALID_TRANSITION`, `422 Staff does not provide this service`, `409 SLOT_ALREADY_BOOKED`.

### H.6 `POST /api/v1/bookings/{id}/start`

Business rules: phải `CONFIRMED`; `start_time <= now()` (không start trước giờ hẹn); đặt `booking_items.status = 'IN_PROGRESS'`. Phát event `booking.started` (routing key đã khai báo trong `RabbitMQQueues`; queue + binding đã có trong `RabbitMQConfig` — nhưng **chưa có publisher/consumer**).

### H.7 `POST /api/v1/bookings/{id}/complete`

**Request (tùy chọn)**

```json
{ "notes": "Đã hoàn tất, khách hài lòng" }
```

**Business rules**
- Phải `IN_PROGRESS`.
- Đặt `bookings.status = 'COMPLETED'`, `booking_items.status = 'COMPLETED'`.
- **Giải phóng `time_slots.is_booked`?** Khuyến nghị **giữ nguyên `TRUE`** vì slot đã qua; chỉ giải phóng khi `CANCELLED`.
- Phát event `booking.completed` → Notification gửi thông báo + mời đánh giá.

### H.8 `POST /api/v1/bookings/{id}/cancel`

**Request**

```json
{ "reason": "Khách đổi lịch" }
```

**Response `200`** — `BookingResponse` với `status = "CANCELLED"`.

**Business rules**

| Quy tắc | Chi tiết |
|---|---|
| Trạng thái nguồn | `PENDING`, `CONFIRMED`, hoặc `IN_PROGRESS` (chỉ Admin) |
| Hạn chót hủy | ⚠ **Chưa có cấu hình nào trong source.** Không được tuyên bố một giá trị. Đề xuất cấu hình `app.booking.cancel-cutoff-hours` và áp dụng: hủy miễn phí nếu còn ≥ `N` giờ trước `time_slots.start_time`. Cần chốt số giờ với nghiệp vụ. |
| Giải phóng slot | `UPDATE time_slots SET is_booked = FALSE WHERE id IN (SELECT time_slot_id FROM booking_items WHERE booking_id = :id AND time_slot_id IS NOT NULL)` — **trong cùng transaction** |
| Giải phóng promotion | Hoàn lượt dùng: `UPDATE promotions SET used_count = used_count - 1 WHERE id = :promotionId` + xoá dòng `coupon_usages` tương ứng (nếu đã có bảng `P-18`). Không để `used_count < 0`. |
| Lịch sử trạng thái | ⚠ **Không có bảng lịch sử** trong CSDL. Tối thiểu phải ghi `audit_logs`. Đề xuất `P-22` (xem H.9) |
| Phí hủy | Không có cột phí trong CSDL. Nếu nghiệp vụ cần phí hủy → `P-23` (cột `cancel_fee` trên `bookings`) |
| Đã thanh toán | Xem H.9 |

### H.9 Đã thanh toán thì **KHÔNG** tự hoàn tiền

| Bước | Hệ thống làm gì |
|---|---|
| 1 | Kiểm tra payment qua Payment Service (`GET /payments/by-invoice/{invoiceId}`) hoặc event `payment.completed.v1` đã nhận |
| 2a | Nếu **chưa** thanh toán → cho hủy, giải phóng slot, hoàn lượt promotion |
| 2b | Nếu **đã** thanh toán một phần/toàn bộ → **không** tự hoàn tiền bằng cách đổi `bookings.status`. Trả `409 BOOKING_PAID_REQUIRES_REFUND` kèm `paymentId` để client chuyển sang luồng refund |
| 3 | Client/Staff gọi `POST /payments/{id}/refunds` (M.6). Refund thành công phát event `payment.refunded.v1` |
| 4 | Core nhận `payment.refunded.v1` → mới cho phép chuyển booking sang `CANCELLED` (hoặc thêm trạng thái `REFUNDED` nếu nghiệp vụ cần) |

```json
{
  "status": 409,
  "success": false,
  "message": "BOOKING_PAID_REQUIRES_REFUND",
  "timestamp": "2026-10-01T10:00:00Z"
}
```

⚠ Core DB **không** đọc trực tiếp Payment DB. Trạng thái thanh toán được biết qua **event** đã lưu, hoặc qua **gọi HTTP** Payment Service. Core **chưa có** bảng `inbox_events` ⇒ xem `P-20`.

### H.10 Lịch sử thay đổi trạng thái — **cần migration**

CSDL không có `bookings.status_history`. Tối thiểu phải ghi vào `audit_logs` (bảng đã có: `user_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `ip_address`, `created_at`) — ví dụ `action = 'BOOKING_STATUS_CHANGE'`, `entity_type = 'BOOKING'`, `old_value = {"status":"PENDING"}`, `new_value = {"status":"CONFIRMED"}`.

Nếu cần endpoint tra cứu chuyên dụng `GET /bookings/{id}/history`, đề xuất `P-22`:

```sql
CREATE TABLE booking_status_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES bookings(id),
  old_status     VARCHAR(50),
  new_status     VARCHAR(50) NOT NULL,
  changed_by     UUID NULL REFERENCES users(id),
  source         VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (source IN ('USER','SYSTEM','CRON','EVENT')),
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_booking_status_history_booking
  ON booking_status_history(booking_id, created_at DESC);
```

---

## I. Invoices — `/api/v1/invoices`

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/invoices` | `Schema-supported` (đề xuất mới) |
| GET | `/invoices/{id}` | `Schema-supported` |
| GET | `/invoices` | `Schema-supported` |
| GET | `/invoices/by-booking/{bookingId}` | `Schema-supported` |
| PATCH | `/invoices/{id}/status` | **`Proposed`** — cần migration `P-24` |

**⚠ Quan trọng — không có controller, và entity hiện tại SAI schema.**

`invoice/domain/Invoice.java` map: `bookingId`, `amount`, `tax`, `status` → bảng `invoices`. CSDL thật (V1:239–259):

```sql
invoices(
  id UUID PK,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at, updated_at, version
)
invoice_items(
  id UUID PK, invoice_id UUID NOT NULL REFERENCES invoices(id),
  description VARCHAR(500) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

| Vấn đề | Hậu quả |
|---|---|
| `Invoice.amount` ↔ không có cột `amount` | `ddl-auto: validate` **thất bại khi khởi động** |
| `Invoice.tax` ↔ không có cột `tax` | Như trên |
| `Invoice.status` ↔ không có cột `status` | Như trên |
| Thiếu map `invoiceNumber`, `issuedAt` | Không đọc được |
| Không có entity cho `invoice_items` | Không truy cập được chi tiết hóa đơn |

⇒ **Toàn bộ module Invoice là `Schema-supported`, chưa phải `Implemented`.** Cần sửa entity `Invoice` cho khớp CSDL (không cần migration cho phần map này).

### I.1 Cardinality: một booking có một invoice

| Quy tắc | CSDL hiện tại |
|---|---|
| `invoices.booking_id NOT NULL REFERENCES bookings(id)` | ✔ FK bắt buộc |
| Một booking **chỉ có 1 invoice** | ❌ **KHÔNG có `UNIQUE(booking_id)`** ⇒ về mặt DB có thể tạo nhiều invoice cho cùng một booking |
| `invoice_number` UNIQUE | ✔ chỉ chặn trùng **số** hóa đơn, không chặn trùng booking |

⚠ Không được tuyên bố "một booking chỉ có một invoice" là đã được CSDL bảo đảm. Cần `P-24`.

**`P-24` — bổ sung trạng thái & ràng buộc invoice:**

```sql
ALTER TABLE invoices
  ADD COLUMN status      VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
  ADD COLUMN subtotal    DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN tax_amount  DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN total_amount_check CHECK (total_amount >= 0);
UPDATE invoices SET status = 'ISSUED';
ALTER TABLE invoices ADD CONSTRAINT ck_invoices_status
  CHECK (status IN ('ISSUED','PENDING_PAYMENT','PAID','PARTIALLY_PAID','CANCELLED','REFUNDED'));
ALTER TABLE invoices ADD CONSTRAINT uq_invoices_booking UNIQUE (booking_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issued ON invoices(issued_at DESC);
```

### I.2 `POST /api/v1/invoices`

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth đề xuất | `STAFF`, `ADMIN` (do tư vấn/thu ngân phát hành) |
| CSDL | `invoices`, `invoice_items`, `bookings`, `booking_items` |

**Request**

```json
{
  "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
  "notes": "Thanh toán tiền mặt tại quầy"
}
```

⚠ **Không có `couponCode` trong request** nếu dùng luồng G.4 (`POST /promotions/redeem`) — discount đã được ghi vào `bookings.discount_amount` từ trước.

**Business rules**

| # | Quy tắc |
|---|---|
| 1 | Booking phải tồn tại và **không** ở `CANCELLED`. |
| 2 | Kiểm tra chưa có invoice cho booking (`uq_invoices_booking` — xem I.3). |
| 3 | **Chống tạo invoice trùng khi retry:** dùng `UNIQUE(booking_id)` làm chốt chặn ở DB. Bắt `DataIntegrityViolationException` → `409 INVOICE_ALREADY_EXISTS`. Ngoài ra nên nhận `Idempotency-Key` header và lưu key (xem `P-19`) — với schema hiện tại `UNIQUE(booking_id)` **đã đủ** để chống retry tạo trùng. |
| 4 | `invoice_number` do **server** sinh theo format `INV-{yyyyMM}-{seq}` hoặc `INV-{yyyy}-{6 chữ số}`, phải **UNIQUE** ✔ (đã có trong CSDL). Nếu đánh số liên tục bằng sequence, cần `P-25` (sequence Postgres hoặc bảng đếm theo năm). |
| 5 | Tạo `invoices` + toàn bộ `invoice_items` trong **một transaction**. |
| 6 | Phát event `invoice.issued.v1` cho Payment Service. |

**Cách tính tiền (server, `P-24` sau khi có cột):**

```
subtotal        = Σ (invoice_items.unit_price × invoice_items.quantity)
                 = Σ (booking_items.unit_price)          -- đã snapshot
discount_amount = bookings.discount_amount              -- đã áp promotion ở G.4
tax_amount      = round((subtotal − discount_amount) × tax_rate, 2)
total_amount    = subtotal − discount_amount + tax_amount
```

**Quy tắc bắt buộc**

- **Thuế:** CSDL hiện tại **không có** cột thuế và **không có** cấu hình tỉ lệ thuế trong source. Không được ghi ví dụ có `taxAmount` mà không nói rõ tỉ lệ lấy ở đâu. `P-24` thêm cột nhưng **tỉ lệ thuế phải là biến cấu hình** (`app.invoice.vat-rate`), chưa có giá trị xác nhận.
- **Invoice items lấy giá từ đâu:** `invoice_items.unit_price` **snapshot** từ `booking_items.unit_price` (đã snapshot từ `services.base_price`). Client không gửi giá. `invoice_items.description` = `services.name` tại thời điểm phát hành.
- **Client không được gửi `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `status`.**

### I.3 Chống invoice trùng

| Cơ chế | Trạng thái | Ghi chú |
|---|---|---|
| `UNIQUE(booking_id)` trên `invoices` | ❌ chưa có → `P-24` | Chặn chính xác retry tạo invoice |
| `invoice_number UNIQUE` | ✔ đã có | Chặn trùng số, **không** chặn trùng booking |
| `Idempotency-Key` header | `Proposed` | Khuyến nghị thêm sau; cần bảng lưu key (`P-19`) |

Cho tới khi `P-24` được áp dụng, **không có** ràng buộc nào ở DB ngăn tạo hai invoice cho cùng một booking ⇒ việc chống trùng hoàn toàn dựa vào logic service và không chống được race condition.

### I.4 Trạng thái invoice vs trạng thái payment — phải phân biệt

| | Invoice (Core DB) | Payment (Payment DB) |
|---|---|---|
| Bảng | `invoices.status` (⚠ **chưa có cột**) | `payments.status` ✔ (có `CHECK`) |
| Ý nghĩa | Văn bản hóa đơn đã phát hành chưa | Giao dịch tiền thực đã xử lý chưa |
| Nguồn | Core Backend | Payment Service |
| Quan hệ | `invoices.booking_id` FK → `bookings` ✔ | `payments.invoice_id` — **UUID tham chiếu logic, KHÔNG FK** |

| Tình huống | Invoice status | Payment status |
|---|---|---|
| Vừa phát hành, chưa trả | `PENDING_PAYMENT` | `PENDING` |
| Đang chuyển khoản | `PENDING_PAYMENT` | `PROCESSING` |
| Thu đủ | `PAID` | `PAID` |
| Trả một phần | `PARTIALLY_PAID` | `PARTIALLY_REFUNDED` chỉ dùng cho refund — **không** dùng cho trả một phần |
| Trả thất bại | `PENDING_PAYMENT` (không đổi) | `FAILED` |
| Hoàn đủ | `REFUNDED` | `REFUNDED` |
| Hủy hóa đơn chưa trả | `CANCELLED` | `CANCELLED` |

⚠ Core **không** được đặt foreign key sang Payment DB, và Payment **không** được đọc Core DB. Đồng bộ trạng thái là **một chiều theo event**:

```
Payment Service (outbox_events, published_at)
   └─ payment.completed.v1  ─►  Core inbox_events  ─►  UPDATE invoices SET status='PAID'
                              └─►  Notification     ─►  gửi receipt
```

⚠ Core **hiện không có** bảng `inbox_events`/`outbox_events` ⇒ cơ chế này **chưa tồn tại**. Xem `P-20`.

### I.5 `GET /api/v1/invoices/{id}` và `GET /api/v1/invoices`

**`GET /invoices/{id}`** — `200`, `ApiResponse<InvoiceResponse>`:

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "invoiceNumber": "INV-2026-000001",
    "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
    "status": "PENDING_PAYMENT",
    "subtotal": 500000.00,
    "discountAmount": 100000.00,
    "taxAmount": 0.00,
    "totalAmount": 400000.00,
    "issuedAt": "2026-10-01T10:30:00Z",
    "items": [
      {
        "id": "c3d4e5f6-a7b8-4c9d-8e0f-2a3b4c5d6e7f",
        "description": "Tắm và chải lông",
        "quantity": 1,
        "unitPrice": 500000.00,
        "subtotal": 500000.00
      }
    ],
    "createdAt": "2026-10-01T10:30:00Z",
    "updatedAt": "2026-10-01T10:30:00Z"
  },
  "timestamp": "2026-10-01T10:30:00Z"
}
```

⚠ Các field `status`, `subtotal`, `discountAmount`, `taxAmount` **chưa có cột** → chỉ trả được sau `P-24`.

**`GET /invoices`** — query `page`, `size`, `status`, `bookingId`, `customerId`*, `branchId`, `dateFrom`/`dateTo` (theo `issued_at`), `sortBy` mặc định `issuedAt`, `direction` mặc định `desc`. Response `ApiResponse<PageResponse<InvoiceResponse>>`.

`*` `customerId` chỉ `ADMIN`/`OWNER`.

**Quyền xem:** `CUSTOMER` chỉ xem invoice của booking mình là `customer_id`; `STAFF` xem invoice của chi nhánh; `ADMIN`/`OWNER` xem tất cả.

**Errors:** `403`, `404 Invoice not found with id: <id>`.

### I.6 `GET /api/v1/invoices/by-booking/{bookingId}`

Trả `200` với `InvoiceResponse`, `404` nếu booking chưa có invoice. Nhờ `uq_invoices_booking` (`P-24`) nên trả **một** đối tượng, không phải danh sách.

### I.7 `PATCH /api/v1/invoices/{id}/status` — **`Proposed`**

Endpoint này **không nên cho client gọi tự do**. Trạng thái invoice được quyết định bởi:

| Transition | Kích hoạt bởi |
|---|---|
| `ISSUED → PENDING_PAYMENT` | Server ngay sau khi tạo |
| `PENDING_PAYMENT → PAID` | **Chỉ** event `payment.completed.v1` |
| `PAID → PARTIALLY_REFUNDED/REFUNDED` | **Chỉ** event `payment.refunded.v1` |
| `PENDING_PAYMENT → CANCELLED` | `ADMIN` thủ công, chỉ khi chưa có payment `PAID` |
| bất kỳ → `CANCELLED` | Hủy booking + hoàn tiền qua Payment Service trước |

Nếu vẫn cần endpoint admin để huỷ: giới hạn payload `{"status": "CANCELLED", "reason": "..."}`, chỉ nhận `CANCELLED`, `ADMIN`/`OWNER`, và trả `409` nếu payment đã `PAID`.

---

## J. Loyalty — `/api/v1/loyalty`

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/loyalty/customer/{customerId}` | `Implemented` · **⚠ entity sai bảng** |
| POST | `/loyalty` | `Implemented` · **⚠ rủi ro bảo mật, entity sai bảng** |
| GET | `/loyalty/me` | `Schema-supported` |
| GET | `/loyalty/me/transactions` | `Schema-supported` |
| GET | `/loyalty/transactions` | `Schema-supported` |
| POST | `/loyalty/earn` | `Schema-supported` |
| POST | `/loyalty/redeem` | `Schema-supported` |

### J.1 ⚠ Endpoint hiện tại **không dùng được**

`loyalty/domain/Loyalty.java` map `@Table(name = "loyalty")` với `customerId`, `points`. Migration **không có** bảng `loyalty` — có `loyalty_accounts` và `loyalty_transactions` (V1:262–280):

```sql
loyalty_accounts(
  id UUID PK,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  points BIGINT NOT NULL DEFAULT 0,        -- ⚠ KHÔNG có CHECK >= 0
  tier VARCHAR(50) NOT NULL DEFAULT 'BRONZE',  -- ⚠ KHÔNG có FK tới bảng tier
  created_at, updated_at, version
)
loyalty_transactions(
  id UUID PK, account_id UUID NOT NULL REFERENCES loyalty_accounts(id),
  booking_id UUID NULL REFERENCES bookings(id),
  type VARCHAR(50) NOT NULL,               -- ⚠ KHÔNG có CHECK
  points BIGINT NOT NULL,                  -- ⚠ KHÔNG có CHECK
  description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- append-only, không có updated_at/version
)
```

⇒ Với `ddl-auto: validate`, endpoint `/loyalty/**` **không khởi động được**. Cần sửa entity (`P-12`, phần sửa mapping) — không cần migration cho phần này.

### J.2 `GET /api/v1/loyalty/customer/{customerId}` *(Implemented)*

| | |
|---|---|
| Trạng thái | `Implemented` — **không dùng được do entity sai bảng** |
| Auth | `anyRequest().authenticated()` — **không có `@PreAuthorize`** |

⚠ **Ba vấn đề nghiêm trọng:**

1. Trả **entity `Loyalty` trực tiếp**, không bọc `ApiResponse`.
2. **Không kiểm tra quyền:** bất kỳ user đăng nhập nào cũng đọc được điểm của user khác bằng `customerId` ⇒ **IDOR**.
3. **Trả `200` với body `null`** nếu không tìm thấy (`orElse(null)`) thay vì `404`.

Contract chuẩn hoá đề xuất (sau khi sửa entity) — `ApiResponse<LoyaltyAccountResponse>`:

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "id": "e3f4a5b6-c7d8-4e9f-8a0b-1c2d3e4f5a6b",
    "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "points": 1250,
    "tier": "BRONZE",
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

| Endpoint | Quyền |
|---|---|
| `GET /loyalty/customer/{customerId}` | Chỉ chính chủ (`customerId == principal.id`) hoặc `ADMIN` |
| `GET /loyalty/me` | `CUSTOMER` — tương laơng nên thay thế endpoint trên |

### J.3 `POST /api/v1/loyalty` *(Implemented)*

| | |
|---|---|
| Trạng thái | `Implemented` — **⚠ phải loại bỏ** |

⚠ **Endpoint này là một lỗ hổng nghiêm trọng và không được giữ lại dưới dạng contract:**

- Nhận **entity `Loyalty` trực tiếp** làm `@RequestBody` — client tự quyết định `id`, `customerId`, `points`.
- **Không có `@PreAuthorize`** — bất kỳ user đăng nhập nào cũng gọi được.
- **Không kiểm tra số dư, không ghi `loyalty_transactions`, không transaction.**
- Cho phép **set số dư âm** và **đặt điểm cho user bất kỳ**.

⇒ Khuyến nghị **xoá** và thay bằng `POST /loyalty/earn` (J.5) + `POST /loyalty/redeem` (J.6) + `POST /loyalty/adjust` (`ADMIN`).

### J.4 `GET /api/v1/loyalty/me` và `GET /api/v1/loyalty/me/transactions`

**`GET /loyalty/me`** — `200`, `ApiResponse<LoyaltyAccountResponse>` (tự tạo `loyalty_accounts` nếu chưa có — xem J.5.1).

**`GET /loyalty/me/transactions`** — query `page`, `size`, `type`, `dateFrom`, `dateTo`, `sortBy` mặc định `createdAt`, `direction` mặc định `desc`.

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "f4a5b6c7-d8e9-4f0a-9b1c-2d3e4f5a6b7c",
        "accountId": "e3f4a5b6-c7d8-4e9f-8a0b-1c2d3e4f5a6b",
        "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
        "type": "EARN",
        "points": 500,
        "description": "Thanh toán hóa đơn INV-2026-000001",
        "createdAt": "2026-10-01T10:30:05Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:30:05Z"
}
```

`loyalty_transactions` là **append-only**: không có API sửa/xoá, không có `updated_at`, không có `version`.

**Types:** `EARN` | `REDEEM` | `ADJUST` | `EXPIRE` (⚠ DB không có CHECK ⇒ service phải tự chặn).

### J.5 `POST /api/v1/loyalty/earn` *(Schema-supported)*

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth | ⚠ Không cho client gọi trực tiếp — xem "Điều kiện cộng điểm" |

**Điều kiện được cộng điểm (đề xuất)**

| # | Điều kiện | Ghi chú |
|---|---|---|
| 1 | Invoice có trạng thái **`PAID`** | **Không** cộng khi invoice mới tạo hay payment `PENDING`/`PROCESSING` |
| 2 | Booking ở trạng thái `COMPLETED` | Nếu nghiệp vụ muốn chỉ cộng sau khi dịch vụ hoàn tất. Cần chốt |
| 3 | Chưa cộng cho invoice đó trước đó | Xem idempotency J.7 |
| 4 | Công thức | `points = floor((subtotal − discount_amount) × earn_rate)` |

**Kích hoạt bởi transaction/event nào**

| Kích hoạt | Nguồn | Ghi chú |
|---|---|---|
| **Khuyến nghị:** event `payment.completed.v1` | Payment Service → Core inbox | Xử lý idempotent trong consumer |
| Event `booking.completed.v1` | Core tự publish | Nếu không cần chờ thanh toán |
| **Không dùng:** cron quét invoice | — | Dễ cộng trùng, không phản ánh đúng thời điểm thanh toán |

⇒ `earn_rate` theo tier **chưa có trong CSDL**. `loyalty_accounts.tier` chỉ là `VARCHAR(50)` không FK. Cần `P-26` (bảng `loyalty_tiers`) nếu muốn tỉ lệ theo hạng; nếu không, tỉ lệ phải là hằng số cấu hình và phải ghi rõ giá trị đó — **hiện chưa có giá trị nào trong source**.

**Response `200`** — `ApiResponse<LoyaltyAccountResponse>` (số dư sau khi cộng).

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Endpoint bị chặn cho role hiện tại |
| `404` | `Invoice not found with id: <invoiceId>` | |
| `422` | `Invoice is not paid` | Chưa đủ điều kiện cộng điểm |
| `409` | `POINTS_ALREADY_EARNED` | Idempotency |

### J.6 `POST /api/v1/loyalty/redeem` *(Schema-supported)*

**Request**

```json
{
  "points": 100,
  "description": "Đổi 100 điểm lấy voucher 50.000đ"
}
```

| Field | Validation |
|---|---|
| `points` | `> 0`; ⚠ **số điểm tối thiểu/tối đa chưa có quy định** trong CSDL hay source — cần chốt số và cấu hình (`app.loyalty.redeem.min-points`, `max-points`) |
| `description` | ≤ 500 |

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "accountId": "e3f4a5b6-c7d8-4e9f-8a0b-1c2d3e4f5a6b",
    "pointsRedeemed": 100,
    "remainingPoints": 1150,
    "type": "REDEEM",
    "transactionId": "f4a5b6c7-d8e9-4f0a-9b1c-2d3e4f5a6b7c"
  },
  "timestamp": "2026-10-01T10:31:00Z"
}
```

**Business rules — concurrency và số dư âm**

⚠ **CSDL hiện tại KHÔNG đảm bảo** điều này:

| Vấn đề | Cần gì |
|---|---|
| `loyalty_accounts.points` không có `CHECK (points >= 0)` | `P-27`: `ALTER TABLE loyalty_accounts ADD CONSTRAINT ck_loyalty_points CHECK (points >= 0);` — **bắt buộc**, đây là lưới an toàn cuối cùng chống số dư âm |
| Hai request redeem đồng thời trên cùng account | `SELECT ... FOR UPDATE` trên dòng `loyalty_accounts` trong transaction, **hoặc** `UPDATE loyalty_accounts SET points = points - :n WHERE id = :id AND points >= :n` và rollback nếu affected = 0 |
| `@Version` trên `loyalty_accounts` | Có ✔ (`version BIGINT`) nhưng optimistic lock phát hiện conflict **sau** khi ghi; vẫn cần retry hoặc pessimistic lock để trả lời client |
| Kiểm tra số dư ở Java | **Không đủ** — hai transaction cùng đọc `points = 100`, cùng thấy đủ, cùng ghi `-50` |

**Business rules (đề xuất)**

1. Transaction: `SELECT ... FOR UPDATE` account → kiểm `points >= n` và `min <= n <= max` → `UPDATE points = points − n` → `INSERT loyalty_transactions(type='REDEEM', points=-n)` → commit.
2. Số dư âm bị chặn ở **hai** tầng: kiểm tra service (thông báo rõ ràng) và CHECK constraint (chặn tuyệt đối).
3. `loyalty_transactions.points` lưu **số âm** cho `REDEEM` (để tổng `Σ points` bằng `loyalty_accounts.points`) — cần chốt thống nhất, và `P-27` phải cho phép giá trị âm ở cột này (chỉ chặn âm ở `loyalty_accounts.points`).
4. **Không có reward catalog** trong CSDL ⇒ `description` là text tự do, **không** có API tra danh mục quà tặng. Nếu cần, `P-28`.

### J.7 Chống cộng/trừ điểm hai lần (idempotency)

⚠ `loyalty_transactions` **không có** ràng buộc business key nào. Cùng một `booking_id` có thể có 10 dòng `EARN`.

**Đề xuất `P-26`:**

```sql
-- Một booking chỉ cộng điểm EARN đúng một lần
CREATE UNIQUE INDEX uq_loyalty_earn_booking
  ON loyalty_transactions(account_id, booking_id)
  WHERE type = 'EARN' AND booking_id IS NOT NULL;

ALTER TABLE loyalty_transactions ADD CONSTRAINT ck_loyalty_tx_type
  CHECK (type IN ('EARN','REDEEM','ADJUST','EXPIRE'));
```

Ngoài unique index, consumer `payment.completed.v1` nên dùng `inbox_events.event_id` làm khóa chống xử lý lặp (xem `P-20`).

### J.8 Tier — **không có bảng tier**

⚠ `loyalty_accounts.tier VARCHAR(50) DEFAULT 'BRONZE'` **không có** bảng `loyalty_tiers`, không có `min_points`, không có `earn_rate`. API `/membership/tiers` trong `docs/erd.md` là **`Proposed` hoàn toàn**. Nếu cần tier có luật, xem `P-26`:

```sql
CREATE TABLE loyalty_tiers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(50) NOT NULL UNIQUE,
  min_points   BIGINT NOT NULL DEFAULT 0 CHECK (min_points >= 0),
  earn_rate    DECIMAL(6,3) NOT NULL DEFAULT 1.000 CHECK (earn_rate > 0),
  redeem_rate  DECIMAL(6,3) NOT NULL DEFAULT 1.000 CHECK (redeem_rate > 0),
  description  VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE loyalty_accounts
  ADD COLUMN tier_id UUID NULL REFERENCES loyalty_tiers(id);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(tier_id);
```

---

## K. Reviews — `/api/v1/reviews`

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/reviews` | `Schema-supported` |
| GET | `/reviews` | `Schema-supported` |
| GET | `/reviews/{id}` | `Schema-supported` |
| GET | `/reviews/by-booking/{bookingId}` | `Schema-supported` |
| PATCH | `/reviews/{id}/publish` | `Schema-supported` (dùng `is_published`) |
| PATCH | `/reviews/{id}/unpublish` | `Schema-supported` |

Không có package `review` trong source.

**CSDL (V1:320–330)**

```sql
reviews(
  id UUID PK,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at, updated_at, version
)
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
```

⚠ **Khác biệt với `docs/erd.md`:** CSDL **không có** `review_code`, `status` (`PUBLISHED|HIDDEN|FLAGGED`), `veterinarian_id`, `service_id`, `invoice_id`, `payment_id`, `user_id`. Trạng thái publish chỉ là **boolean `is_published`**, không phải enum có 3 giá trị.

### K.1 `POST /api/v1/reviews`

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth | `CUSTOMER` (chủ booking) |
| CSDL | `reviews`, `bookings` |

**Request**

```json
{
  "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
  "rating": 5,
  "comment": "Nhân viên tận tâm, bé mình đã khỏe hơn"
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `bookingId` | `reviews.booking_id` | Có | UUID; booking tồn tại |
| `rating` | `reviews.rating` | Có | **1..5** — có `CHECK` ✔ |
| `comment` | `reviews.comment` | Không | TEXT; `NULL` = review không chữ |

⚠ **Không có `customerId` trong request.** `reviews.customer_id` lấy từ `@AuthenticationPrincipal`.

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "a7b8c9d0-e1f2-4a3b-9c8d-7e6f5a4b3c2d",
    "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
    "customerId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "rating": 5,
    "comment": "Nhân viên tận tâm, bé mình đã khỏe hơn",
    "isPublished": false,
    "createdAt": "2026-10-01T12:00:00Z",
    "updatedAt": "2026-10-01T12:00:00Z"
  },
  "timestamp": "2026-10-01T12:00:00Z"
}
```

`isPublished` mặc định **`false`** ⇒ review mới **không** hiện công khai, cần moderation.

**Business rules**

1. **Chỉ chủ booking đã `COMPLETED` mới được review:**
   - `bookings.status = 'COMPLETED'`
   - `bookings.customer_id == principal.id`
   - **Không** tin `customerId` trong request (field này không tồn tại).
2. Kiểm `bookings.pet_id` thuộc `pets.owner_id == principal.id` (phòng thủ sâu).
3. `rating` nằm trong `1..5` — có CHECK ở DB ✔; service vẫn nên validate để trả `400` thay vì `500`.
4. `comment` sau khi moderation: nếu nghiệp vụ cần, đề xuất `P-29` (cột `moderated_at`, `moderated_by`, `moderation_note`) — hiện `audit_logs` có thể tạm đảm nhiệm.

**Chính sách mỗi booking một review hay nhiều review**

| Lựa chọn | CSDL hiện tại | Migration |
|---|---|---|
| **A. Một booking một review** *(khuyến nghị)* | ❌ không ràng buộc ⇒ có thể tạo vô hạn review | `P-30`: `ALTER TABLE reviews ADD CONSTRAINT uq_reviews_booking UNIQUE (booking_id);` |
| B. Nhiều review mỗi booking (VD: đánh giá từng dịch vụ) | Cần cột phân biệt (`service_id`, `booking_item_id`) | `P-31` |

Contract này giả định **A** và **không được tuyên bố** là đã được DB bảo đảm. Nếu chọn A mà không áp `P-30`, việc chống trùng chỉ ở tầng service và không chống được race condition.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `bookingId`/`rating`, rating ngoài 1..5 |
| `403` | `Access denied` | Không phải chủ booking |
| `404` | `Booking not found with id: <bookingId>` | |
| `422` | `BOOKING_NOT_COMPLETED` | `bookings.status != 'COMPLETED'` |
| `409` | `REVIEW_ALREADY_EXISTS` | Đã có review cho booking (cần `P-30`) |

### K.2 `GET /api/v1/reviews` và `GET /api/v1/reviews/{id}`

**`GET /reviews`** — **Public** (chỉ trả review có `is_published = TRUE` cho khách; `CUSTOMER` có thể xem review chưa publish của chính mình). Query: `page`, `size`, `rating`, `minRating`, `maxRating`, `dateFrom`, `dateTo`, `sortBy` (mặc định `createdAt`), `direction`.

⚠ **Không thể lọc theo `veterinarianId` hay `serviceId`** — cột đó không tồn tại. Các filter đó trong `docs/erd.md` là `Proposed` (cần `P-31`).

**`GET /reviews/{id}`** — `200`; `403` nếu xem review chưa publish không phải của mình; `404 Review not found with id: <id>`.

### K.3 `GET /api/v1/reviews/by-booking/{bookingId}`

⚠ Vì **không có** `UNIQUE(booking_id)`, endpoint này **phải trả mảng**, không trả object đơn:

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": [
    { "id": "a7b8c9d0-e1f2-4a3b-9c8d-7e6f5a4b3c2d", "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a", "customerId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e", "rating": 5, "comment": "Tốt", "isPublished": true, "createdAt": "2026-10-01T12:00:00Z", "updatedAt": "2026-10-01T12:00:00Z" }
  ],
  "timestamp": "2026-10-01T12:00:00Z"
}
```

Sau khi áp `P-30`, có thể đổi thành object đơn — nhưng phải cập nhật contract cùng lúc.

### K.4 Publish / Unpublish

`PATCH /api/v1/reviews/{id}/publish` · `PATCH /api/v1/reviews/{id}/unpublish`

| | |
|---|---|
| Trạng thái | `Schema-supported` |
| Auth | `ADMIN`/`OWNER` (moderation) |

**Request**

```json
{ "reason": "Nội dung phù hợp chính sách" }
```

(`reason` được ghi vào `audit_logs`, không lưu trên `reviews`.)

**Response `200`** — `ApiResponse<ReviewResponse>` với `isPublished` đã đổi.

**Business rules**

- Đây là thao tác **toggle boolean**, không phải chuyển enum. **Không** có `PATCH /reviews/{id}/status` với `PUBLISHED|HIDDEN|FLAGGED` — trạng thái đó không có trong CSDL.
- **Ai được publish:** `ADMIN`/`OWNER` (moderation) hoặc `CUSTOMER` tự publish review của chính mình (nếu nghiệp vụ không yêu cầu duyệt). Cần chốt; contract mặc định **cần duyệt** ⇒ chỉ `ADMIN`/`OWNER`.
- Ghi `audit_logs`: `action = 'REVIEW_PUBLISH' | 'REVIEW_UNPUBLISH'`, `entity_type = 'REVIEW'`, `old_value`/`new_value` chứa `isPublished`.
- ⚠ `reviews.updated_at` có `@Version` ⇒ publish/unpublish nên dùng optimistic lock để tránh ghi đè.

**Errors:** `403`, `404 Review not found with id: <id>`, `409` (conflict `version`).

---

## L. AI / RAG / Vision — `/api/v1/ai`

### L.1 Endpoint đang tồn tại — `POST /api/v1/ai/tips`

| | |
|---|---|
| Trạng thái | `Implemented` (stub) |
| Auth | Logged in (`anyRequest().authenticated()`) |
| CSDL | **Không dùng** |
| File | `ai/controller/AiController.java`, `ai/service/AiService.java` |

⚠ **Đây là stub, không gọi tới service AI nào.** `AiService.getPetCareTip()` trả về `Map.of("answer", "...stub...", "status", "success")` — không đọc `app.ai.*-url`, không gọi HTTP.

**Request** — `@RequestBody Map<String, String>`, chỉ đọc key `question`:

```json
{ "question": "Chó Shiba 6 tháng tuổi nên ăn gì?" }
```

**Response `200`** — **không bọc `ApiResponse`**:

```json
{
  "answer": "This is an AI stub response to: Chó Shiba 6 tháng tuổi nên ăn gì?",
  "status": "success"
}
```

**Business rules hiện tại**

- Thiếu key `question` ⇒ `question = null` ⇒ `Map.of` với `null` **ném `NullPointerException`** ⇒ `500`.
- Body không phải object JSON ⇒ `500` (không có handler `HttpMessageNotReadableException`).
- `Content-Type` sai ⇒ Spring trả `415`.
- **Không có** rate limit, **không có** timeout, **không có** kiểm tra kích thước `question`.
- **Không lưu lịch sử** vào `ai_messages`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `401` | — | Chưa đăng nhập |
| `415 Unsupported Media Type` | mặc định của Spring | `Content-Type` không phải JSON |
| `500` | `Internal server error` | Thiếu `question`, JSON sai |

**Đề xuất chuẩn hoá** (khi triển khai thật): bọc `ApiResponse`, thêm DTO có `@NotBlank`, `size` tối đa, rate limit, và trả `502` khi AI service lỗi.

### L.2 Conversation — **`Schema-supported`**

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/ai/conversations` | `Schema-supported` |
| POST | `/ai/conversations` | `Schema-supported` |
| GET | `/ai/conversations/{id}` | `Schema-supported` |
| GET | `/ai/conversations/{id}/messages` | `Schema-supported` |
| PATCH | `/ai/conversations/{id}/close` | **`Proposed`** — cần migration `P-32` |

**CSDL (V1:346–360)**

```sql
ai_conversations(
  id UUID PK, user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(500), created_at, updated_at
)
ai_messages(
  id UUID PK, conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL, content TEXT NOT NULL, created_at
)
```

⚠ `ai_conversations` **không có** `pet_id`, `status`, `closed_at` ⇒ `PATCH /ai/conversations/{id}/close` và lọc theo `petId`/`status` là `Proposed`.

**`POST /ai/conversations` — Request**

```json
{ "title": "Hỏi về chế độ ăn cho chó Shiba" }
```

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "title": "Hỏi về chế độ ăn cho chó Shiba",
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**`GET /ai/conversations`** — Public **không**; chỉ chủ conversation. Query: `page`, `size`, `sortBy` mặc định `updatedAt`, `direction` mặc định `desc`. Response `ApiResponse<PageResponse<AiConversationResponse>>`.

**`GET /ai/conversations/{id}/messages`** — query `page`, `size`, `sortBy` mặc định `createdAt`, `direction` mặc định `asc`.

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      { "id": "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f", "conversationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e", "role": "USER", "content": "Chó Shiba 6 tháng tuổi nên ăn gì?", "createdAt": "2026-10-01T10:00:00Z" },
      { "id": "d3e4f5a6-b7c8-4d9e-8f0a-2b3c4d5e6f7a", "conversationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e", "role": "ASSISTANT", "content": "Chó Shiba 6 tháng tuổi cần chế độ ăn giàu protein...", "createdAt": "2026-10-01T10:00:01Z" }
    ],
    "page": 0, "size": 20, "totalElements": 2, "totalPages": 1, "last": true, "first": true
  },
  "timestamp": "2026-10-01T10:01:00Z"
}
```

`role` chỉ có `NOT NULL VARCHAR(20)`, **không có CHECK** ⇒ service phải tự chặn `USER` / `ASSISTANT` / `SYSTEM`.

**Errors:** `403 Access denied` (không phải chủ), `404 Conversation not found with id: <id>`.

### L.3 `POST /api/v1/ai/chat` — **`Schema-supported`**

⚠ **Chưa có endpoint chat.** `POST /api/v1/ai/tips` **không** phải là chat endpoint (không có `conversationId`, không lưu `ai_messages`, không trả `sources`).

**Request (đề xuất)**

```json
{
  "conversationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
  "message": "Chó Shiba 6 tháng tuổi nên ăn gì?"
}
```

| Field | Kiểu | Bắt buộc | Validation đề xuất |
|---|---|---|---|
| `conversationId` | UUID | Có | `ai_conversations` tồn tại; `user_id == principal.id` |
| `message` | string | Có | `@NotBlank`; giới hạn độ dài (**chưa có giá trị cấu hình** — đề xuất `app.ai.chat.max-message-length`, mặc định 4000 ký tự) |

⚠ **Không có `messageType`.** `ai_messages` không có cột `message_type` ⇒ chỉ hỗ trợ text. Field `messageType` trong `docs/erd.md` là `Proposed` (cần `P-33`).

**Response `200` (đề xuất)**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "conversationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    "userMessage": {
      "id": "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
      "role": "USER",
      "content": "Chó Shiba 6 tháng tuổi nên ăn gì?",
      "createdAt": "2026-10-01T10:00:00Z"
    },
    "assistantMessage": {
      "id": "d3e4f5a6-b7c8-4d9e-8f0a-2b3c4d5e6f7a",
      "role": "ASSISTANT",
      "content": "Chó Shiba 6 tháng tuổi cần chế độ ăn giàu protein...",
      "createdAt": "2026-10-01T10:00:01Z"
    },
    "sources": []
  },
  "timestamp": "2026-10-01T10:00:01Z"
}
```

**`sources`** — ⚠ **`ai/rag/main.py` (stub) không trả về nguồn tham khảo** (`POST /query` chỉ trả `answer` + `confidence`). Vì vậy `sources` chỉ có thể là:
- **Mảng rỗng** khi dùng RAG stub hiện tại, hoặc
- `Proposed` cần migration `document_chunks` (P.2 bên dưới) **và** sửa `ai/rag` trả kèm nguồn.

**Phân biệt các loại lỗi (đề xuất)**

| Tình huống | HTTP | `message` |
|---|---|---|
| Validation (thiếu field, quá dài, conversation không thuộc user) | `400` / `403` | `Validation failed` / `Access denied` |
| Conversation không tồn tại | `404` | `Conversation not found with id: <id>` |
| AI timeout | **`504 Gateway Timeout`** ⚠ | `AI request timed out` |
| AI service không khả dụng (connection refused, 5xx) | **`502 Bad Gateway`** ⚠ | `AI service unavailable` |
| AI trả lỗi/quá tải (429 từ provider) | `502` | `AI provider error` |
| RAG không tìm thấy tài liệu liên quan | `200` | `sources: []`, `answer` nói không có dữ liệu |
| Lỗi xử lý tài liệu (upload/scan/parse lỗi) | `422` | `Document processing failed` |
| Quá rate limit | `429` | `Too many requests` |

⚠ `502` và `504` **không** được `GlobalExceptionHandler` sinh ra ⇒ cần thêm handler `AiUpstreamException` và cấu hình timeout cho `RestClient`/`WebClient`. **Hiện chưa có timeout nào được cấu hình** trong source.

**Timeout & metadata (chưa cấu hình)**

| Hạng mục | Trạng thái |
|---|---|
| Timeout gọi `ai-agent` / `ai-rag` / `ai-vision` | ❌ **không có** trong source |
| `ai_requests` (token usage, latency, model) | ❌ **không có bảng** — `P-34` |
| `ai_tool_calls` | ❌ **không có bảng** — `P-34` |
| Rate limit theo user | ❌ không có |
| Cấu hình URL | ✔ `app.ai.agent-url`, `rag-url`, `vision-url`, `recommendation-url`, `forecasting-url`, `optimization-url` trong `application.yml` (chưa dùng) |

### L.4 RAG documents — **`Schema-supported`**

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/ai/documents` | `Schema-supported` |
| GET | `/ai/documents` | `Schema-supported` |
| DELETE | `/ai/documents/{id}` | `Schema-supported` |

**CSDL (V1:362–380)**

```sql
documents(
  id UUID PK,
  filename VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
CREATE INDEX idx_documents_embedding
  ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

⚠ **Vấn đề thiết kế của CSDL hiện tại:**

| Vấn đề | Hậu quả |
|---|---|
| Một `embedding vector(1536)` cho **cả tài liệu** | Tài liệu dài không thể nhúng gọn vào 1 vector ⇒ RAG quality kém |
| **Không có `document_chunks`** | Không chunk, không trả nguồn tham khảo theo đoạn |
| **Không có trạng thái indexing** | Không biết tài liệu đã sẵn sàng để search hay chưa ⇒ không trả `indexStatus` |
| **Không có `created_by`** | Không audit ai upload |
| `ivfflat` với `lists = 100` | Cần dữ liệu đủ lớn; index bên trên đã build khi còn rỗng sẽ kém chính xác |

**`POST /ai/documents` — Request (đề xuất)**

```http
POST /api/v1/ai/documents
Content-Type: multipart/form-data

file: <binary>
metadata: {"source":"handbook","language":"vi"}
```

| Hạng mục | Giá trị đề xuất | Trạng thái |
|---|---|---|
| Auth | `ADMIN` | `Proposed` |
| MIME type cho phép | `application/pdf`, `text/plain`, `text/markdown`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | **Chưa có** — cần cấu hình |
| Kích thước tối đa | **Chưa có giá trị** — cần cấu hình (`app.ai.rag.max-file-size`) | **Chưa có** |
| Giới hạn số chunk / tài liệu | **Chưa có** | **Chưa có** |

**Response `201` (đề xuất)**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "e4f5a6b7-c8d9-4e0f-9a1b-3c4d5e6f7a8b",
    "filename": "pet-care-handbook.pdf",
    "contentLength": 245000,
    "hasEmbedding": false,
    "indexStatus": "PENDING",
    "metadata": { "source": "handbook", "language": "vi" },
    "createdAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

⚠ `indexStatus` là **Proposed** — cần cột `P-2` bên dưới. Không được tuyên bố có trạng thái indexing khi CSDL không có.

**Business rules (đề xuất)**

- Chỉ `ADMIN` upload/xoá (quản trị tri thức).
- Upload và embedding **không** nên là một transaction dài (gọi model có thể mất hàng chục giây). Nên insert `PENDING` → xử lý async → cập nhật trạng thái.
- `DELETE /ai/documents/{id}` xoá cả document và chunk của nó.
- Embedding phải có chiều đúng `1536` (khớp `vector(1536)`); sai chiều ⇒ lỗi DB.

**Migration `P-2` (chunk + trạng thái indexing, cần `P-35` cho extension):**

```sql
CREATE EXTENSION IF NOT EXISTS vector;   -- đã có trong infrastructure/postgres/init.sql

ALTER TABLE documents
  ADD COLUMN title VARCHAR(255),
  ADD COLUMN document_type VARCHAR(50),
  ADD COLUMN created_by UUID REFERENCES users(id),
  ADD COLUMN index_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN indexed_at TIMESTAMPTZ,
  ADD COLUMN chunk_count INT NOT NULL DEFAULT 0;
ALTER TABLE documents ADD CONSTRAINT ck_documents_index_status
  CHECK (index_status IN ('PENDING','PROCESSING','INDEXED','FAILED'));

CREATE TABLE document_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_chunks UNIQUE (document_id, chunk_index)
);
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_documents_index_status ON documents(index_status) WHERE index_status <> 'INDEXED';
```

### L.5 Vision — **`Proposed`, chưa có endpoint lẫn bảng**

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/ai/vision/analyze` | **`Proposed`** |
| GET | `/ai/vision/analyses` | **`Proposed`** (cần bảng lịch sử) |
| GET | `/ai/vision/analyses/{id}` | **`Proposed`** |

⚠ **Không có controller vision nào.** `AiController` chỉ có `/tips`. **Không có bảng `vision_analyses`** ⇒ **không được tuyên bố có lịch sử phân tích ảnh.**

Hệ thống có service `ai/vision` (FastAPI stub, port 8003) với `POST /analyze` nhận `multipart/form-data` field `file` và trả `{ "filename", "breed_detected", "confidence", "anomalies" }`. `AiService` **không** gọi tới nó.

> **Lưu ý về đường dẫn:** `docs/sequence-diagrams.md` §6 dùng `POST /api/v1/ai/vision-analyses`. Contract này chọn `POST /api/v1/ai/vision/analyze` làm đường dẫn chuẩn (khớp cấu trúc `/ai/{module}/{action}` hiện có và tên route của AI service). Khi endpoint được triển khai phải cập nhật `sequence-diagrams.md` cho khớp.

**`POST /api/v1/ai/vision/analyze` — Request (đề xuất)**

```http
POST /api/v1/ai/vision/analyze
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

petId: 5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c
image: <binary>
```

| Hạng mục | Đề xuất | Trạng thái |
|---|---|---|
| `image` | Bắt buộc | — |
| `petId` | Không bắt buộc; nếu có thì phải thuộc `principal` | — |
| Content type | `multipart/form-data` | — |
| MIME type cho phép | `image/jpeg`, `image/png`, `image/webp` | **Chưa có** — cần cấu hình |
| Kích thước tối đa | **Chưa có giá trị** — cần cấu hình (`app.ai.vision.max-image-size`) | **Chưa có** |
| Timeout gọi `ai-vision` | **Chưa có** | **Chưa có** |

**Response `200` (đề xuất)**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "analysisId": "f5a6b7c8-d9e0-4f1a-8b2c-4d5e6f7a8b9c",
    "petId": "5f4e3d2c-1b0a-9f8e-7d6c-5b4a3f2e1d0c",
    "filename": "milu-co.jpg",
    "status": "SUCCESS",
    "result": {
      "breed_detected": "Shiba Inu",
      "confidence": 0.94,
      "anomalies": []
    },
    "completedAt": "2026-10-01T10:00:02Z"
  },
  "timestamp": "2026-10-01T10:00:02Z"
}
```

⚠ Tên field trong `result` giữ **đúng** như `ai/vision` stub trả về (`breed_detected`, `anomalies`) để không phải chuyển đổi ở tầng trung gian. Khi tích hợp model thật, chốt lại một schema và cập nhật contract.

**Business rules (đề xuất)**

1. Kiểm `petId` thuộc `principal` trước khi gọi AI.
2. Kiểm MIME type thực sự của file (magic bytes), không chỉ header do client gửi.
3. Kiểm kích thước trước khi đọc vào bộ nhớ.
4. Lưu ảnh gốc **ngoài** database (object storage); DB chỉ giữ metadata + checksum.
5. `status`: `PENDING` → `SUCCESS` | `FAILED` (cần `P-36`).

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `image` |
| `403` | `Access denied` | `petId` không thuộc user |
| `413 Payload Too Large` | `Image exceeds maximum size` | Vượt giới hạn |
| `415 Unsupported Media Type` | `Unsupported image type` | Sai MIME |
| `422` | `Image processing failed` | File hỏng, không đọc được |
| `502` | `AI service unavailable` | `ai-vision` không phản hồi / lỗi |
| `504` | `AI request timed out` | Quá thời gian chờ |

**Migration `P-36` (lịch sử phân tích ảnh)**

```sql
CREATE TABLE vision_analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  pet_id           UUID NULL REFERENCES pets(id),
  image_storage_key VARCHAR(500) NOT NULL,
  image_sha256     CHAR(64) NOT NULL,
  image_mime_type  VARCHAR(100) NOT NULL,
  image_size_bytes BIGINT NOT NULL CHECK (image_size_bytes > 0),
  model_name       VARCHAR(100),
  model_version    VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','SUCCESS','FAILED')),
  result           JSONB,
  confidence       DECIMAL(5,4),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);
CREATE INDEX idx_vision_analyses_user_created
  ON vision_analyses(user_id, created_at DESC);
CREATE INDEX idx_vision_analyses_pet
  ON vision_analyses(pet_id) WHERE pet_id IS NOT NULL;
```

⚠ `ai_requests` chưa tồn tại ⇒ **không** thêm `ai_request_id` FK vào bảng này. Nếu cần liên kết, phải làm `P-34` trước.

## O. Reference data, Resources, Audit và Inventory

Phần này bù cho **7 bảng** trong Core DB chưa có section contract riêng: `branches`, `service_categories`, `services`, `resources`, `audit_logs`, `inventory_items`, `stock_movements`.

| Bảng | Trạng thái | Lý do |
|---|---|---|
| `branches` | `Schema-supported` | Chỉ được nhắc làm ràng buộc ở C.1/H.1; `SecurityConfig` đã `permitAll` `GET /api/v1/branches/**` nhưng chưa có controller |
| `service_categories` | `Schema-supported` | **Chưa được nhắc đến ở đâu**; nhưng `services.category_id` FK tới nó |
| `services` | `Schema-supported` | Là nguồn giá & `duration_minutes` cho Booking (H.1) và Invoice (I.2) nhưng không có contract quản lý |
| `resources` | `Schema-supported` | Chỉ nhắc qua `time_slots.resource_id`; chưa có contract |
| `audit_logs` | `Schema-supported` (đọc) | Được tham chiếu ở 8 module khác nhưng chưa có section; entity hiện tại map sai cột |
| `inventory_items` | **Ngoài MVP** | `docs/database-change-assessment.md` đã chốt loại khỏi MVP |
| `stock_movements` | **Ngoài MVP** | Như trên |

### O.1 `branches` — `/api/v1/branches`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/branches` | `Schema-supported` | **Public** (`SecurityConfig` đã `permitAll`) |
| GET | `/branches/{id}` | `Schema-supported` | **Public** |
| POST | `/branches` | `Schema-supported` | `ADMIN`/`OWNER` |
| PUT | `/branches/{id}` | `Schema-supported` | `ADMIN`/`OWNER` |
| PATCH | `/branches/{id}/active` | `Schema-supported` | `ADMIN`/`OWNER` |

**CSDL (V1:22–34)**

```sql
branches(
  id UUID PK, name VARCHAR(255) NOT NULL, address TEXT NOT NULL,
  phone VARCHAR(20), email VARCHAR(255),
  latitude DECIMAL(10,8), longitude DECIMAL(11,8),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at, updated_at, version
)
```

**`GET /branches` — response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
        "name": "PetCare Quận 1",
        "address": "123 Nguyễn Huệ, Bến Thành, Quận 1, TP.HCM",
        "phone": "02831234567",
        "email": "quann1@petcare.example",
        "latitude": 10.7769000,
        "longitude": 106.7009000,
        "isActive": true,
        "createdAt": "2026-10-01T10:00:00Z",
        "updatedAt": "2026-10-01T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Query:** `page`, `size`, `search` (theo `name`), `isActive` (mặc định lọc `true` cho endpoint public), `sortBy` mặc định `name`, `direction` mặc định `asc`.

**Request tạo/cập nhật**

```json
{
  "name": "PetCare Quận 1",
  "address": "123 Nguyễn Huệ, Bến Thành, Quận 1, TP.HCM",
  "phone": "02831234567",
  "email": "quann1@petcare.example",
  "latitude": 10.7769000,
  "longitude": 106.7009000,
  "isActive": true
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `name` | `name` | Có | ≤ 255. ⚠ **không UNIQUE** → cho phép trùng tên |
| `address` | `address` | Có | TEXT |
| `phone`/`email` | `phone`/`email` | Không | ≤ 20 / ≤ 255. ⚠ **không UNIQUE**, không validate định dạng |
| `latitude`/`longitude` | `latitude`/`longitude` | Không | `-90..90` / `-180..180` — ⚠ **DB không có CHECK** |
| `isActive` | `is_active` | Không | mặc định `true` |

**Business rules**

- Không có `DELETE`: dùng `PATCH /branches/{id}/active` (`is_active = FALSE`). Lý do: `staff.branch_id`, `resources.branch_id`, `bookings.branch_id`, `inventory_items.branch_id` đều tham chiếu tới `branches`.
- Tắt branch **không** tự động huỷ booking đang `CONFIRMED`; việc đó là quyết định nghiệp vụ riêng (xem H.8).
- ⚠ `branches` **không có index** nào ngoài PK ⇒ `GET /branches?search=` và các join theo `branch_id` sẽ full-scan. Xem `P-39`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `name`/`address` |
| `403` | `Access denied` | Ghi khi không phải `ADMIN`/`OWNER` |
| `404` | `Branch not found with id: <id>` | |
| `422` | `Latitude must be between -90 and 90` | Ngoài khoảng |

### O.2 `service_categories` — `/api/v1/service-categories`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/service-categories` | `Schema-supported` | **Public** |
| GET | `/service-categories/{id}` | `Schema-supported` | **Public** |
| POST | `/service-categories` | `Schema-supported` | `ADMIN` |
| PUT | `/service-categories/{id}` | `Schema-supported` | `ADMIN` |
| DELETE | `/service-categories/{id}` | `Schema-supported` | `ADMIN` |

**CSDL (V1:50–58)**

```sql
service_categories(
  id UUID PK, name VARCHAR(255) NOT NULL, description TEXT,
  icon VARCHAR(255), created_at, updated_at, version
)
```

⚠ **`service_categories` KHÔNG có cột `is_active`** (khác `services`, `staff`, `branches`, `resources`). Hệ quả bắt buộc phải nêu:

| Vấn đề | Xử lý |
|---|---|
| Không soft-delete được | Chọn 1: **`DELETE` thật** khi không còn service nào tham chiếu; chọn 2: thêm cột `is_active` (`P-40`) |
| `services.category_id` FK **không có `ON DELETE`** | Xoá category đang có service ⇒ vi phạm FK ⇒ `500` hiện tại |
| Không có UNIQUE `name` | Cho phép trùng tên |
| `icon VARCHAR(255)` | Chứa tên icon hoặc URL; không có validate |

**Request**

```json
{
  "name": "Chăm sóc cơ bản",
  "description": "Tắm, cắt móng, chải lông",
  "icon": "grooming"
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `name` | `name` | Có | ≤ 255 |
| `description` | `description` | Không | TEXT |
| `icon` | `icon` | Không | ≤ 255 |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6e",
    "name": "Chăm sóc cơ bản",
    "description": "Tắm, cắt móng, chải lông",
    "icon": "grooming",
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules / Errors**

- `DELETE` chỉ được khi **không** còn `services.category_id` trỏ tới ⇒ nếu còn trả `409 CATEGORY_IN_USE`.
- `404 Service category not found with id: <id>`; `400 Validation failed`; `403 Access denied`.

### O.3 `services` — `/api/v1/services`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/services` | `Schema-supported` | **Public** (`SecurityConfig` đã `permitAll` `GET /api/v1/services/**`) |
| GET | `/services/{id}` | `Schema-supported` | **Public** |
| POST | `/services` | `Schema-supported` | `ADMIN`/`OWNER` |
| PUT | `/services/{id}` | `Schema-supported` | `ADMIN`/`OWNER` |
| PATCH | `/services/{id}/active` | `Schema-supported` | `ADMIN`/`OWNER` |

⚠ **Tên cột là `base_price`, không phải `price`.** Tài liệu cũ (`docs/erd.md`, `docs/csdl_pet_manager.docx`) dùng `services.price` — contract này bám CSDL.

**CSDL (V1:60–71)**

```sql
services(
  id UUID PK, category_id UUID NULL REFERENCES service_categories(id),
  name VARCHAR(255) NOT NULL, description TEXT,
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at, updated_at, version
)
```

**`GET /services` — query**

| Param | Mô tả |
|---|---|
| `categoryId` | Lọc theo `category_id` |
| `search` | `LIKE` trên `name` |
| `isActive` | Mặc định `true` cho endpoint public |
| `minPrice` / `maxPrice` | Lọc theo `base_price` |
| `maxDurationMinutes` | Lọc theo `duration_minutes` |
| `page`, `size`, `sortBy` (mặc định `name`), `direction` (mặc định `asc`) | |

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "categoryId": "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6e",
        "name": "Tắm và chải lông",
        "description": "Tắm bằng nước ấm, sấy lông, chải xù",
        "basePrice": 350000.00,
        "durationMinutes": 60,
        "isActive": true,
        "createdAt": "2026-10-01T10:00:00Z",
        "updatedAt": "2026-10-01T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Request tạo/cập nhật**

```json
{
  "categoryId": "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6e",
  "name": "Tắm và chải lông",
  "description": "Tắm bằng nước ấm, sấy lông, chải xù",
  "basePrice": 350000.00,
  "durationMinutes": 60,
  "isActive": true
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `categoryId` | `category_id` | Không | UUID; `service_categories` tồn tại |
| `name` | `name` | Có | ≤ 255. ⚠ không UNIQUE |
| `description` | `description` | Không | TEXT |
| `basePrice` | `base_price` | Không | `>= 0` — ⚠ **DB không có CHECK** → `P-12` |
| `durationMinutes` | `duration_minutes` | Không | `> 0` — ⚠ **DB không có CHECK** → `P-12`. Giá trị này là nguồn của `time_slots` (D.3) và được đối chiếu khi đặt booking (H.1.5) |
| `isActive` | `is_active` | Không | mặc định `true` |

**Business rules**

- **Giá luôn đọc từ `services.base_price`.** Client không gửi giá ở bất kỳ đâu; giá được snapshot vào `booking_items.unit_price` (H.1) rồi vào `invoice_items.unit_price` (I.2).
- **Đổi `basePrice` không đổi lịch sử:** booking/invoice cũ giữ nguyên `unit_price` đã snapshot. Đây là hành vi bắt buộc, không phải bug.
- **Đổi `durationMinutes` chỉ có hiệu lực với slot được sinh sau đó.** `time_slots` đã materialize nên phải regenerate slot cho lịch chưa có booking.
- **Không có `DELETE`.** Dùng `PATCH /services/{id}/active`. Lý do: `staff_skills.service_id`, `booking_items.service_id` đều NOT NULL FK.
- ⚠ `services.category_id` **không có index** ⇒ lọc theo category full-scan → `P-39`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `name` |
| `403` | `Access denied` | Ghi khi không phải `ADMIN`/`OWNER` |
| `404` | `Service not found with id: <id>` | |
| `404` | `Service category not found with id: <categoryId>` | |
| `422` | `Base price must be greater than or equal to 0` | Giá âm |
| `422` | `Duration minutes must be greater than 0` | Thời lượng ≤ 0 |

### O.4 `resources` — `/api/v1/resources`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/resources` | `Schema-supported` | Logged in |
| GET | `/resources/{id}` | `Schema-supported` | Logged in |
| POST | `/resources` | `Schema-supported` | `ADMIN`/`OWNER` |
| PUT | `/resources/{id}` | `Schema-supported` | `ADMIN`/`OWNER` |
| PATCH | `/resources/{id}/available` | `Schema-supported` | `ADMIN`/`OWNER` |

**CSDL (V1:137–147)**

```sql
resources(
  id UUID PK, branch_id UUID NULL REFERENCES branches(id),
  name VARCHAR(255) NOT NULL, type VARCHAR(100),
  capacity INT DEFAULT 1,
  is_available BOOLEAN NOT NULL DEFAULT TRUE, created_at, updated_at, version
)
```

**Request**

```json
{
  "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
  "name": "Buồng tắm 01",
  "type": "BATH_ROOM",
  "capacity": 1,
  "isAvailable": true
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `branchId` | `branch_id` | Không | `branches` tồn tại, `is_active = TRUE` |
| `name` | `name` | Có | ≤ 255 |
| `type` | `type` | Không | ≤ 100. ⚠ **không CHECK**; đề xuất `BATH_ROOM`, `TABLE`, `CAGE`, `ROOM` |
| `capacity` | `capacity` | Không | `>= 1` — ⚠ **không CHECK** (mặc định `1`) |
| `isAvailable` | `is_available` | Không | mặc định `true` |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "4c5d6e7f-8a9b-4c0d-9e1f-2a3b4c5d6e7f",
    "branchId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "name": "Buồng tắm 01",
    "type": "BATH_ROOM",
    "capacity": 1,
    "isAvailable": true,
    "createdAt": "2026-10-01T10:00:00Z",
    "updatedAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules**

- **Resource chia sẻ được cho nhiều slot.** `time_slots.resource_id` là FK nullable — một resource có thể xuất hiện ở nhiều `time_slots` khác nhau (khác giờ).
- ⚠ **CSDL KHÔNG bảo đảm resource không bị double-book.** Không có unique/exclusion constraint nào trên `(resource_id, start_time)`; `resources.capacity` cũng **không** được dùng ở đâu trong schema. Nếu nghiệp vụ cần "mỗi resource chỉ phục vụ 1 slot tại một thời điểm", phải thêm (`P-41`):
  ```sql
  CREATE UNIQUE INDEX uq_time_slots_resource_start
      ON time_slots(resource_id, start_time) WHERE resource_id IS NOT NULL;
  CREATE UNIQUE INDEX uq_time_slots_resource_end
      ON time_slots(resource_id, end_time)   WHERE resource_id IS NOT NULL;
  ```
  (Hai index này chỉ chặn trùng **đúng mốc thời gian**, chưa chặn overlap giữa các khoảng. Chặn overlap thật sự cần denormalize `resource_id` xuống `booking_items` + exclusion constraint như `P-9`.)
- **`is_available = FALSE`** ⇒ các `time_slots` gắn resource đó bị loại khỏi `GET /schedules/slots/available` (D.2). Không tự huỷ booking đã đặt.
- `capacity > 1` hiện **không có tác dụng gì** trong CSDL — không được tuyên bố API sẽ cho đặt N slot cùng lúc trên một resource.
- Không có `DELETE`: dùng `PATCH /resources/{id}/available`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `name` |
| `403` | `Access denied` | Ghi khi không đúng vai trò |
| `404` | `Resource not found with id: <id>` | |
| `404` | `Branch not found with id: <branchId>` | |
| `422` | `Capacity must be greater than 0` | |
| `409` | `Resource has booked slots` | Tắt resource đang được dùng bởi slot `is_booked = TRUE` |

### O.5 `audit_logs` — `/api/v1/audit`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/audit` | `Implemented` ⚠ | Logged in (thiếu `@PreAuthorize`) |
| GET | `/audit/{id}` | `Schema-supported` | `ADMIN`/`OWNER` |

**CSDL (V1:333–343)**

```sql
audit_logs(
  id UUID PK, user_id UUID NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NULL, old_value JSONB, new_value JSONB,
  ip_address VARCHAR(50), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

⚠ **`audit_logs` KHÔNG có `updated_at` và KHÔNG có `version`** ⇒ bảng append-only. Không có API sửa/xoá.

⚠ **Entity hiện tại map sai cột** ⇒ `/api/v1/audit` **không chạy được** với `ddl-auto: validate`:

| Entity `AuditLog` | Cột thật | Tình trạng |
|---|---|---|
| `action` ✔ | `action` | khớp |
| `id` ✔ | `id` | khớp |
| `username` | — | ⚠ **không có cột `username`** (dùng `user_id` FK) |
| `details` | — | ⚠ **không có cột `details`** (dùng `old_value`/`new_value` JSONB) |
| `timestamp` | — | ⚠ **không có cột `timestamp`** (dùng `created_at`) |
| — | `user_id`, `entity_type`, `entity_id`, `old_value`, `new_value`, `ip_address` | ⚠ **thiếu** trong entity |

⇒ Cần sửa mapping entity (`P-12`, phần sửa mapping — **không** cần migration).

**`GET /audit` *(Implemented)* — response thực tế**

⚠ `AuditLogController.list()` trả `List<AuditLog>` **thẳng**, không bọc `ApiResponse`, không phân trang, và **không có** `@PreAuthorize`:

```json
[
  {
    "id": "5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a",
    "action": "BOOKING_STATUS_CHANGE",
    "username": null,
    "details": null,
    "timestamp": null
  }
]
```

**⚠ Ba vấn đề bắt buộc phải gia cố:**

1. **Thiếu phân trang** — `findAll()` trả toàn bộ bảng. `audit_logs` là bảng tăng dần liên tục; sau vài tháng sẽ làm chậm và nặng response.
2. **Thiếu `@PreAuthorize("hasRole('ADMIN') or hasRole('OWNER')")`** — hiện **bất kỳ user đăng nhập nào** cũng đọc được toàn bộ log thao tác, bao gồm `old_value`/`new_value` có thể chứa dữ liệu nhạy cảm (hồ sơ y tế, giá, điểm thưởng).
3. **Thiếu bộ lọc** — không lọc được theo `entityType`, `action`, `userId`, khoảng thời gian.

**`GET /audit` — contract chuẩn hoá đề xuất**

Query: `page`, `size`, `entityType`, `entityId`, `action`, `actorUserId`, `dateFrom`, `dateTo`, `sortBy` mặc định `createdAt`, `direction` mặc định `desc`.

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a",
        "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
        "action": "BOOKING_STATUS_CHANGE",
        "entityType": "BOOKING",
        "entityId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
        "oldValue": { "status": "PENDING" },
        "newValue": { "status": "CONFIRMED" },
        "ipAddress": "203.0.113.10",
        "createdAt": "2026-10-01T10:30:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "last": true,
    "first": true
  },
  "timestamp": "2026-10-01T10:30:05Z"
}
```

**`GET /audit/{id}` — `200`** với shape trên; `404 Audit log not found with id: <id>`.

**Business rules**

- **Append-only:** không có `PUT`/`DELETE` cho `audit_logs`.
- `old_value`/`new_value` là **JSONB tự do** ⇒ không có schema cố định. Client phải parse phòng thủ.
- ⚠ Không có `actor_type` (`USER`/`SYSTEM`/`CRON`) như `docs/erd.md` mô tả. Muốn phân biệt thao tác của người với hệ thống thì dùng `user_id IS NULL` ⇒ `Proposed` (`P-42`: thêm `actor_type VARCHAR(20)`).
- ⚠ `ip_address VARCHAR(50)` không chứa được IPv6 dạng đầy đủ (tối đa 45 ký tự + scope) ⇒ có thể bị cắt. `Proposed` (`P-42`: đổi sang `INET` hoặc `VARCHAR(64)`).
- ⚠ `audit_logs.user_id` **không có index**; `idx_audit_entity` chỉ phục vụ `entity_type/entity_id`. Lọc theo `user_id` sẽ full-scan → `P-39`.
- Ghi log là **bắt buộc** ở các luồng đã nêu: đổi trạng thái booking (H.10), publish/unpublish review (K.4), ghi hồ sơ y tế (F.3), ghi hồ sơ y tế, redeem promotion (G.4), retry notification delivery (N.8 — ⚠ nhưng Notification DB **không có** bảng này).

### O.6 `inventory_items` và `stock_movements` — **Ngoài MVP, không có API**

`docs/database-change-assessment.md` đã chốt: *"Inventory | Remove from MVP | Drop `stock_movements` before `inventory_items` in a later migration | Remove inventory API, event topology and Web/Mobile navigation"*.

| Method | Path | Trạng thái |
|---|---|---|
| — | — | **Không có API nào được định nghĩa** |

**CSDL vẫn còn (V1:283–304)**

```sql
inventory_items(
  id UUID PK, branch_id UUID NULL REFERENCES branches(id),
  name VARCHAR(255) NOT NULL, sku VARCHAR(100) NOT NULL UNIQUE,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_quantity DECIMAL(12,3) NOT NULL DEFAULT 5,
  unit VARCHAR(50), created_at, updated_at, version
)
CREATE INDEX idx_inventory_sku ON inventory_items(sku);   -- trùng với UNIQUE, thừa

stock_movements(
  id UUID PK, item_id UUID NOT NULL REFERENCES inventory_items(id),
  type VARCHAR(50) NOT NULL, quantity DECIMAL(12,3) NOT NULL,
  notes TEXT, created_by UUID NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

⚠ **Ba điểm không nhất quán phải ghi nhận:**

1. **Không có controller `inventory` trong source hiện tại.** (Lịch sử git có `com/petcare/platform/inventory/`, nhưng đã bị xoá khi tách cấu trúc `backend/` → `services/backend/`.) ⇒ không có API nào đang "chạy".
2. **RabbitMQ vẫn khai báo `inventory.low-stock`.** `RabbitMQQueues.INVENTORY_EXCHANGE` và `INVENTORY_LOW_STOCK` tồn tại trong source, cùng queue trong `RabbitMQConfig` — **mâu thuẫn** với quyết định "loại inventory khỏi MVP". Phải chọn một trong hai: giữ inventory (và xây API) hoặc bỏ (và xoá bean exchange/queue + routing key).
3. `idx_inventory_sku` **thừa** vì `sku` đã có `UNIQUE` tạo index riêng.

**Nếu sau này quyết định giữ inventory**, API tối thiểu cần: `GET /inventory/items` (lọc `branchId`, `search`, `lowStock`), `POST/PUT /inventory/items`, `GET /inventory/items/{id}/movements`, `POST /inventory/items/{id}/movements` (ghi tăng/giảm, `type ∈ {IN, OUT, ADJUST, EXPIRE}`), và job quét `quantity < min_quantity` phát event `inventory.low-stock`. **Contract này không viết chi tiết cho các endpoint đó** cho tới khi nghiệp vụ chốt.

### O.7 `inbox_events` và `outbox_events` — **Không có API, theo thiết kế**

⚠ Core DB **không có** hai bảng này (xem `P-20`). Payment DB và Notification DB có, và chúng là **bảng kỹ thuật nội bộ**.

| Bảng | API | Lý do |
|---|---|---|
| `outbox_events` (Payment, Notification) | ❌ không có | Chỉ publisher nội bộ ghi; client không được đọc/ghi |
| `inbox_events` (Payment, Notification) | ❌ không có | Chỉ consumer nội bộ ghi; là khóa dedup event |

- Không mở endpoint đọc/ghi trực tiếp ⇒ tránh làm hỏng đảm bảo idempotency.
- Vận hành/đối soát phải đi qua log/metrics, không qua API công khai.

---

# PHẦN 2 — PAYMENT SERVICE (`http://localhost:8082/api/v1`)

## M. Payment

⚠ **Trạng thái thực tế:** `services/payment-service/src/main/java/` chỉ có `PaymentApplication.java`. **Không có controller, service, repository, entity.** Toàn bộ mục M là **`Proposed`**.

⚠ Payment Service **không** có `spring-boot-starter-security` trong `pom.xml` ⇒ hiện **không có cơ chế xác thực nào**. Bắt buộc phải thêm dependency + resource server JWT (dùng chung `JWT_SECRET` với Core) trước khi mở bất kỳ endpoint nào.

| Method | Path | Trạng thái |
|---|---|---|
| POST | `/payments` | `Proposed` |
| GET | `/payments/{id}` | `Proposed` |
| GET | `/payments/by-invoice/{invoiceId}` | `Proposed` |
| GET | `/payments` | `Proposed` |
| GET | `/payments/{id}/transactions` | `Proposed` |
| POST | `/payments/{id}/refunds` | `Proposed` |
| POST | `/payments/webhooks/{provider}` | `Proposed` |

### M.1 CSDL (V1:1–51) — nguồn sự thật

```sql
payments(
  id UUID PK,
  invoice_id UUID NOT NULL,                      -- UUID tham chiếu Core, KHÔNG FK
  owner_id UUID NOT NULL,
  appointment_id UUID NULL,
  invoice_code VARCHAR(100) NOT NULL,
  expected_amount NUMERIC(14,2) NOT NULL CHECK (expected_amount > 0),
  received_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  refunded_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  provider VARCHAR(50), method VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','PAID','FAILED','PARTIALLY_REFUNDED','REFUNDED','CANCELLED')),
  paid_at TIMESTAMPTZ NULL, created_at, updated_at, version BIGINT,
  CONSTRAINT uq_payments_invoice UNIQUE (invoice_id),                -- 1 payment / invoice
  CONSTRAINT ck_payments_refund_amount CHECK (refunded_amount <= received_amount)
)
payment_transactions(
  id UUID PK, payment_id UUID NOT NULL REFERENCES payments(id),
  transaction_type VARCHAR(30) NOT NULL
    CHECK (transaction_type IN ('AUTHORIZE','CAPTURE','PAYMENT','REFUND','VOID','FAILURE')),
  provider VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255), provider_event_id VARCHAR(255),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED')),
  request_payload JSONB, response_payload JSONB,
  failure_code VARCHAR(100), failure_message TEXT, processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
CREATE UNIQUE INDEX uq_payment_transactions_provider_tx    ON payment_transactions(provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_transactions_provider_event ON payment_transactions(provider, provider_event_id)         WHERE provider_event_id         IS NOT NULL;
CREATE INDEX idx_payment_transactions_payment_created ON payment_transactions(payment_id, created_at DESC);
```

⚠ **Khác biệt với `docs/api-contracts.md` cũ:** không có cột `payment_code` (chỉ có `invoice_code`), không có `gateway_transaction_id` trên `payments` (nằm ở `payment_transactions.provider_transaction_id`), không có `refund_reason` trên `payments`.

### M.2 Ba kiểm soát bắt buộc

| Kiểm soát | Nguồn | Bắt buộc |
|---|---|---|
| Client **KHÔNG** được tự quyết định `owner_id` | `payments.owner_id NOT NULL` | ✔ Lấy từ user đã xác thực hoặc từ snapshot invoice |
| Client **KHÔNG** được tự quyết định amount | `expected_amount CHECK (> 0)` | ✔ Lấy từ snapshot `invoice.issued.v1` |
| Client **KHÔNG** được tự đặt status `PAID` | `status CHECK` + không có write path cho client | ✔ Chỉ gateway callback / internal reconcile được set `PAID` |

**Xác minh invoice qua nguồn đáng tin cậy**

| Nguồn | Cơ chế | Sẵn có? |
|---|---|---|
| Event `invoice.issued.v1` (Core → Payment inbox) | `inbox_events` + `outbox_events` **đã có** trong Payment DB ✔ | Bảng có, **consumer chưa có** |
| Gọi Core API `GET /invoices/{id}` (internal) | HTTP | `Proposed` — cần service token |
| Client gửi `expectedAmount` | — | ❌ **Cấm tuyệt đối** |

⇒ Bắt buộc: `payments` chỉ được tạo khi Payment đã lưu được snapshot invoice từ event. Nếu chưa có snapshot ⇒ `409 INVOICE_NOT_VERIFIED`.

### M.3 `POST /api/v1/payments`

**Request — KHÔNG có `ownerId`, `expectedAmount`, `invoiceCode`, `status`**

```http
POST http://localhost:8082/api/v1/payments
Idempotency-Key: 51b2aa09-f58e-4e9b-836c-d830746b18b7
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "invoiceId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  "provider": "VNPAY",
  "method": "QR",
  "returnUrl": "https://app.example.invalid/payments/return",
  "cancelUrl": "https://app.example.invalid/payments/cancel"
}
```

| Field | Nguồn | Bắt buộc | Ghi chú |
|---|---|---|---|
| `invoiceId` | Client | Có | Phải tồn tại snapshot invoice đã xác minh |
| `provider` | Client | Không | `payments.provider VARCHAR(50)` |
| `method` | Client | **Có** | `payments.method NOT NULL`. Giá trị đề xuất: `QR`, `CARD`, `CASH`, `BANK_TRANSFER`, `EWALLET` |
| `returnUrl`/`cancelUrl` | Client | Không | Chỉ dùng khi `provider` cần; phải là URL đã whitelist |

**Fields lấy từ snapshot invoice, không nhận từ client**

| Cột | Lấy từ |
|---|---|
| `owner_id` | `userId` trong event `invoice.issued.v1` (đối chiếu với user đang đăng nhập) |
| `invoice_code` | `invoiceNumber` trong event |
| `expected_amount` | `totalAmount` trong event |
| `appointment_id` | `bookingId` trong event |
| `currency` | `VND` (default) |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "invoiceId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "ownerId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "appointmentId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
    "invoiceCode": "INV-2026-000001",
    "expectedAmount": 400000.00,
    "receivedAmount": 0.00,
    "refundedAmount": 0.00,
    "currency": "VND",
    "provider": "VNPAY",
    "method": "QR",
    "status": "PENDING",
    "paidAt": null,
    "checkoutUrl": "https://pay.example.invalid/checkout/<token>",
    "createdAt": "2026-10-01T10:30:00Z"
  }
}
```

⚠ `checkoutUrl` **không có cột** trong `payments` — nếu gateway cần trả URL thanh toán, phải lưu trong `payment_transactions.response_payload` (JSONB) ✔ **đã có cột này**, hoặc thêm cột riêng.

**Business rules**

1. `Idempotency-Key` **bắt buộc** ở header. Giá trị này được ghi vào `payment_transactions.idempotency_key` (UNIQUE ✔).
2. Gọi lại với cùng key ⇒ trả lại response cũ, **không** tạo transaction mới, **không** gọi gateway lần hai.
3. `uq_payments_invoice UNIQUE` ⇒ chỉ có **một** payment aggregate cho mỗi invoice. Gọi lại cho invoice đã có payment → trả payment hiện có (idempotent theo invoice) hoặc `409 PAYMENT_ALREADY_EXISTS`; cần chốt một trong hai và ghi vào contract khi triển khai.
4. Quy trình nội bộ: `SELECT ... FROM payments WHERE invoice_id = :id FOR UPDATE` → nếu chưa có thì insert với `status = 'PENDING'` → insert `payment_transactions(PENDING)` → gọi gateway → cập nhật `payment_transactions.response_payload` + `status` → nếu gateway cần thao tác bất đồng bộ thì `payments.status = 'PROCESSING'`.
5. **Không** đặt `PAID` ở endpoint này, kể cả phương thức tiền mặt (`CASH`). Với `CASH`, vẫn phải có bước xác nhận của staff (`POST /payments/{id}/confirm-cash`) — `Proposed` — trước khi chuyển `PAID` và ghi `paid_at`.
6. Mọi gateway attempt tạo **dòng `payment_transactions` mới**; không ghi đè dòng cũ.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `invoiceId`/`method`, `method` rỗng |
| `401`/`403` | `Unauthorized` / `Access denied` | Chưa xác thực / không phải chủ invoice |
| `404` | `Invoice snapshot not found for this invoiceId` | Chưa nhận event `invoice.issued.v1` |
| `409` | `Idempotency-Key is required` | Thiếu header |
| `409` | `Idempotency-Key already used with a different payload` | Cùng key, body khác |
| `409` | `PAYMENT_ALREADY_EXISTS` | `uq_payments_invoice` |
| `409` | `Invoice is not payable` | Invoice đã `PAID`/`CANCELLED` |
| `422` | `Payment amount does not match invoice total` | Snapshot không khớp |
| `502` | `Payment gateway error` | Gateway lỗi/timeout |
| `504` | `Payment gateway timed out` | Quá thời gian chờ gateway |

⚠ `502`/`504` cần exception handler riêng — Payment Service **chưa có** `GlobalExceptionHandler`.

### M.4 `GET /api/v1/payments/{id}` · `GET /api/v1/payments/by-invoice/{invoiceId}`

**`GET /payments/{id}`** — `200`, response như M.3. Quyền: `owner_id == principal.id`, hoặc `STAFF`/`ADMIN`.

**`GET /payments/by-invoice/{invoiceId}`** — `200` với **một** payment (đảm bảo bởi `uq_payments_invoice`), `404 Payment not found for invoice <invoiceId>` nếu chưa có. Đây là endpoint Core dùng để kiểm tra trạng thái thanh toán trước khi hủy booking (H.9).

### M.5 `GET /api/v1/payments` và `GET /api/v1/payments/{id}/transactions`

**`GET /payments`** — query `page`, `size`, `invoiceId`, `ownerId`*, `status`, `provider`, `method`, `dateFrom`, `dateTo` (theo `created_at`), `sortBy` mặc định `createdAt`, `direction` mặc định `desc`. `*` chỉ `ADMIN`.

**`GET /payments/{id}/transactions`** — lịch sử **bất biến**, không có API sửa/xoá. Phân trang, `sortBy` mặc định `createdAt`, `direction` mặc định `desc` (index `idx_payment_transactions_payment_created` hỗ trợ `(payment_id, created_at DESC)` ✔).

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
        "paymentId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "transactionType": "PAYMENT",
        "provider": "VNPAY",
        "providerTransactionId": "<gateway-tx-id>",
        "providerEventId": null,
        "idempotencyKey": "51b2aa09-f58e-4e9b-836c-d830746b18b7",
        "amount": 400000.00,
        "currency": "VND",
        "status": "SUCCESS",
        "failureCode": null,
        "failureMessage": null,
        "processedAt": "2026-10-01T10:30:15Z",
        "createdAt": "2026-10-01T10:30:05Z"
      }
    ],
    "page": 0, "size": 20, "totalElements": 1, "totalPages": 1, "last": true, "first": true
  }
}
```

⚠ `request_payload`/`response_payload` **không** trả ra ngoài cho `CUSTOMER` (có thể chứa dữ liệu nhạy cảm từ gateway). Chỉ `ADMIN` mới xem được.

### M.6 `POST /api/v1/payments/{id}/refunds`

**Request**

```http
POST /api/v1/payments/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/refunds
Idempotency-Key: 7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f
```

```json
{
  "amount": 100000.00,
  "reason": "Hoàn tiền dịch vụ chưa thực hiện"
}
```

| Field | Bắt buộc | Validation |
|---|---|---|
| `amount` | Có | `> 0` (`CHECK` ✔); `amount <= received_amount − refunded_amount` |
| `reason` | Có | Ghi vào `payment_transactions` — ⚠ `payments` **không có** cột `refund_reason`, nên phải lưu trong `request_payload` hoặc thêm cột (`P-25`) |

⚠ **`Idempotency-Key` là header, không phải field trong body.** Tài liệu cũ đặt `idempotencyKey` trong body — sai với cột `payment_transactions.idempotency_key` (server tự sinh/tiếp nhận từ header).

**Business rules**

1. Payment phải `PAID` hoặc `PARTIALLY_REFUNDED`.
2. Tổng refund chưa hoàn tất + số mới ≤ `received_amount`.
3. `ck_payments_refund_amount CHECK (refunded_amount <= received_amount)` chặn refund vượt số đã nhận **ở mức DB** ✔.
4. Tạo `payment_transactions(transaction_type='REFUND', status='PENDING')` **trước** khi gọi gateway; cập nhật `status` + `response_payload` sau.
5. Chuyển `payments.status`: `PAID → PARTIALLY_REFUNDED` hoặc `→ REFUNDED` (khi `refunded_amount = received_amount`).
6. Phát event outbox `payment.refunded.v1` khi refund `SUCCESS`.
7. **Refund trùng (callback lặp):** `uq_payment_transactions_provider_event` chặn xử lý lặp. Bắt `DataIntegrityViolationException` ⇒ coi như callback đã xử lý ⇒ trả `200` (idempotent cho gateway).
8. Refund không tự động đổi trạng thái booking ở Core — Core xử lý qua event `payment.refunded.v1` (H.9).

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Không có quyền refund |
| `404` | `Payment not found with id: <id>` | |
| `409` | `Idempotency-Key is required` | |
| `409` | `PAYMENT_NOT_REFUNDABLE` | Status không phải `PAID`/`PARTIALLY_REFUNDED` |
| `422` | `REFUND_EXCEEDS_RECEIVED_AMOUNT` | Vượt số đã nhận |
| `502`/`504` | `Payment gateway error` / `Payment gateway timed out` | |

### M.7 Phân biệt ba loại số tiền

| Cột | Ý nghĩa | Khi nào thay đổi | Check |
|---|---|---|---|
| `expected_amount` | Số tiền **cần** thu (snapshot từ invoice) | Không đổi sau khi tạo | `> 0` ✔ |
| `received_amount` | Số tiền **đã thực nhận** thành công | Khi gateway callback `PAID` thành công | `>= 0` ✔ |
| `refunded_amount` | Số tiền **đã hoàn** thành công | Khi refund `SUCCESS` | `>= 0` ✔ và `<= received_amount` ✔ |

**Refund đang xử lý** — không có cột riêng. Suy ra từ `payment_transactions` có dòng `transaction_type='REFUND'` với `status='PENDING'`:

```
số đang hoàn = Σ amount của payment_transactions
               WHERE transaction_type='REFUND' AND status='PENDING'
số còn có thể hoàn = received_amount − refunded_amount − số đang hoàn
```

⇒ Endpoint refund **phải** tính cả phần `PENDING`, nếu không sẽ cho phép hoàn vượt tiền thực tế.

### M.8 State machine và transition rules

```
        create              gateway accept        gateway success
  ─────────────► PENDING ──────────────────► PROCESSING ──────────► PAID
                   │                            │                     │
                   │ cancel                     │ gateway fail         │ refund (partial)
                   ▼                            ▼                     ▼
               CANCELLED                     FAILED              PARTIALLY_REFUNDED
                                                                         │ refund (full)
                                                                         ▼
                                                                     REFUNDED
```

| Từ \ Sang | `PENDING` | `PROCESSING` | `PAID` | `FAILED` | `PARTIALLY_REFUNDED` | `REFUNDED` | `CANCELLED` |
|---|---|---|---|---|---|---|---|
| `PENDING` | — | ✔ gateway | ✔ gateway (một số provider) | ✔ gateway | ✘ | ✘ | ✔ internal/user |
| `PROCESSING` | ✘ | — | ✔ gateway | ✔ gateway | ✘ | ✘ | ✔ internal |
| `PAID` | ✘ | ✘ | — | ✘ | ✔ refund | ✔ refund | ✘ |
| `FAILED` | ✔ retry (tạo payment mới, không reuse) | ✘ | ✘ | — | ✘ | ✘ | ✔ internal |
| `PARTIALLY_REFUNDED` | ✘ | ✘ | ✘ | ✘ | ✔ refund | ✔ refund | ✘ |
| `REFUNDED` | ✘ | ✘ | ✘ | ✘ | ✘ | — | ✘ |
| `CANCELLED` | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | — |

**Quy tắc bắt buộc**

| # | Quy tắc |
|---|---|
| 1 | **Monotonicity:** không bao giờ hạ trạng thái. Ví dụ callback `PAID` đến sau `REFUNDED` ⇒ **bỏ qua**, không revert về `PAID`. |
| 2 | `paid_at` chỉ set **một lần** (lần chuyển sang `PAID` đầu tiên). |
| 3 | Chỉ gateway callback và internal reconcile được đặt `PAID`. Không có endpoint client nào set `PAID`. |
| 4 | Mọi transition đều append 1 dòng `payment_transactions` — lịch sử **bất biến**. |
| 5 | Dùng `@Version` (`payments.version`) để chống ghi đè khi nhiều callback chạy song song. |
| 6 | Mỗi transition thành công ghi 1 dòng `outbox_events` **trong cùng transaction**. |

### M.9 `POST /api/v1/payments/webhooks/{provider}`

| | |
|---|---|
| Auth | **Xác thực chữ ký provider**, không dùng JWT |
| Content type | Theo provider (thường `application/json` hoặc `application/x-www-form-urlencoded`) |

⚠ **Chưa có cấu hình webhook secret nào trong source** (`payment-service/application.yml` không có). Cần bổ sung `app.payment.providers.<PROVIDER>.webhook-secret`, `api-secret`, `signature-header`.

**Business rules — bắt buộc**

1. **Xác minh chữ ký** trước mọi xử lý: HMAC-SHA256 trên raw body + timestamp, so sánh constant-time, kiểm timestamp nằm trong cửa sổ chống replay (VD ±5 phút). Chữ ký sai ⇒ `401`, **không** log nội dung nhạy cảm.
2. **Không tin dữ liệu callback chưa xác thực:** không lấy `amount`/`status` từ body làm nguồn quyết định mà không đối chiếu `payments.expected_amount` và trạng thái đã lưu.
3. **Chống xử lý lặp:** `INSERT payment_transactions(provider, provider_event_id, ...)` — `uq_payment_transactions_provider_event` chặn trùng. Bắt `DataIntegrityViolationException` ⇒ trả `200` vì gateway chỉ cần biết đã nhận.
4. **Transaction:** insert transaction **và** cập nhật `payments` trong **một** transaction. Nếu update fail ⇒ rollback cả insert ⇒ không mất sự kiện.
5. **Callback đến sai thứ tự:** áp dụng monotonicity (M.8.1). Dùng `paid_at` và `payments.version` để phán đoán.
6. **Trả lỗi đúng chuẩn gateway:** provider thường coi non-2xx là thất bại và sẽ retry. Trả `200` cho event đã xử lý hoặc không liên quan; `401` cho chữ ký sai; `500` cho lỗi tạm thời để gateway retry.
7. **Không chặn request lâu** — xử lý nhanh; nếu cần xử lý nặng thì nhận vào `inbox_events` rồi xử lý bất đồng bộ.

**Idempotency/dedup layers có sẵn**

| Tầng | Cơ chế |
|---|---|
| DB | `payment_transactions.idempotency_key UNIQUE` |
| DB | `uq_payment_transactions_provider_event (provider, provider_event_id)` |
| DB | `uq_payment_transactions_provider_tx (provider, provider_transaction_id)` |
| DB | `payments.invoice_id UNIQUE` |
| App | `inbox_events.event_id PRIMARY KEY` cho event nội bộ |

**Errors**

| HTTP | Khi nào | Gateway sẽ |
|---|---|---|
| `200` | Đã xử lý / trùng / không liên quan | Dừng retry |
| `202 Accepted` | Đã nhận, xử lý bất đồng bộ (nếu dùng inbox) | Dừng retry |
| `400` | Body sai cú pháp, không parse được | Có thể retry vô ích |
| `401` | Chữ ký sai / timestamp ngoài cửa sổ | Không retry |
| `404` | `provider` không được hỗ trợ | Không retry |
| `500` | Lỗi tạm thời | **Retry** |

### M.10 Timeout, callback lặp, callback sai thứ tự, đối soát

| Tình huống | Xử lý |
|---|---|
| **Gateway timeout khi tạo payment** | Ghi `payment_transactions(status='PENDING')` **trước** khi gọi gateway; timeout ⇒ `status='FAILED'` + `failure_code='GATEWAY_TIMEOUT'`, **không** rollback dòng transaction (để đối soát sau). `payments.status='FAILED'`. |
| **Không nhận được callback** | Không có cron đối soát nào được cấu hình ⇒ **cần xây dựng** (`Proposed`): job quét `payments` có `payment_transactions.status='PENDING'` quá N phút → query trạng thái tại gateway → cập nhật hoặc đánh `FAILED`. |
| **Callback lặp (duplicate)** | `uq_payment_transactions_provider_event` ⇒ `DataIntegrityViolationException` ⇒ trả `200`, không side effect lần hai. |
| **Callback sai thứ tự** (`PAID` sau `REFUNDED`; `FAILED` sau `PAID`) | Monotonicity: bỏ qua, ghi log cảnh báo. Không append transaction `SUCCESS`. |
| **Callback tới cho payment không tồn tại** | `404` cho webhook; đồng thời ghi vào bảng reconciliation để đối soát. |
| **Số tiền callback ≠ `expected_amount`** | Không tự động đặt `PAID`. Ghi transaction `FAILED` với `failure_code='AMOUNT_MISMATCH'`, chuyển `payments.status='FAILED'`, cảnh báo. Xử lý thủ công/quyết định nghiệp vụ. |
| **Partial capture / partial refund nhiều lần** | Chỉ cập nhật `received_amount`/`refunded_amount` bằng **cộng dồn từ** các transaction `SUCCESS`. CHECK `refunded_amount <= received_amount` chặn trạng thái không hợp lệ. |
| **Đối soát định kỳ (reconciliation)** | `Proposed` — job đọc `outbox_events` chưa `published_at` (index `idx_payment_outbox_unpublished` ✔) và `inbox_events` chưa `processed_at`. |

---

# PHẦN 3 — NOTIFICATION SERVICE (`http://localhost:8083/api/v1`)

## N. Notification

⚠ **Trạng thái thực tế:** `services/notification-service/src/main/java/` chỉ có `NotificationApplication.java`. **Không có controller, service, entity.** Toàn bộ mục N là **`Proposed`**.

⚠ Notification Service **không** có `spring-boot-starter-security` ⇒ **không có xác thực nào**. Bắt buộc thêm resource server JWT + cơ chế service-to-service trước khi mở endpoint.

| Method | Path | Trạng thái |
|---|---|---|
| GET | `/notifications` | `Proposed` |
| GET | `/notifications/{id}` | `Proposed` |
| PATCH | `/notifications/{id}/read` | `Proposed` |
| PATCH | `/notifications/read-all` | `Proposed` |
| GET | `/notifications/unread-count` | `Proposed` |
| POST | `/notifications` | `Proposed` (internal) |
| POST | `/notifications/{id}/retry` | `Proposed` (quản trị) |

### N.1 CSDL (V1:1–61) — nguồn sự thật

```sql
notification_templates(
  id UUID PK, code VARCHAR(100) NOT NULL, version INTEGER NOT NULL CHECK (version > 0),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP')),
  subject VARCHAR(255), body_template TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_template_version UNIQUE (code, version, channel)
)
notifications(
  id UUID PK,
  user_id UUID NULL,               -- ⚠ KHÔNG có FK sang Core, KHÔNG NOT NULL
  appointment_id UUID NULL, invoice_id UUID NULL, payment_id UUID NULL,
  template_code VARCHAR(100), template_version INTEGER,
  type VARCHAR(100) NOT NULL, title VARCHAR(255) NOT NULL, body TEXT NOT NULL,
  data JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SENT','PARTIALLY_SENT','FAILED','CANCELLED')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE, read_at TIMESTAMPTZ NULL,
  scheduled_at TIMESTAMPTZ NULL,
  created_at, updated_at,
  CONSTRAINT ck_notification_read_at CHECK (NOT is_read OR read_at IS NOT NULL)
)
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_pending      ON notifications(scheduled_at, created_at) WHERE status = 'PENDING';
notification_deliveries(
  id UUID PK, notification_id UUID NOT NULL REFERENCES notifications(id),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP')),
  recipient VARCHAR(500) NOT NULL, provider VARCHAR(100), provider_message_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED','DEAD_LETTERED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NULL, sent_at TIMESTAMPTZ NULL, last_error TEXT,
  created_at, updated_at
)
CREATE UNIQUE INDEX uq_notification_provider_message
  ON notification_deliveries(provider, provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_notification_deliveries_retry
  ON notification_deliveries(next_attempt_at) WHERE status = 'FAILED';
```

⚠ **Khác biệt với tài liệu cũ:**

| Tài liệu cũ | CSDL thật |
|---|---|
| Cột `message` | **`body`** (`notifications.body`) |
| Bảng `notification_outbox` với `deduplication_key`, `next_retry_at`, `sent_at` | **Không tồn tại.** Dùng `outbox_events` (chung) + `notification_deliveries` |
| `status: PENDING\|SENDING\|SENT\|FAILED` | **`PENDING\|PROCESSING\|SENT\|PARTIALLY_SENT\|FAILED\|CANCELLED`** |
| Channels `EMAIL\|SMS\|PUSH` | Thêm **`IN_APP`** |

### N.2 `GET /api/v1/notifications`

| | |
|---|---|
| Auth | `CUSTOMER` (chỉ của chính mình) |
| CSDL | `notifications` |

**Query parameters**

| Param | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `isRead` | boolean | — | Lọc đã đọc/chưa đọc |
| `type` | string | — | Lọc `notifications.type` |
| `status` | string | — | Lọc `notifications.status` |
| `page` | int | `0` | 0-based |
| `size` | int | `20` | |
| `sortBy` | string | `createdAt` | |
| `direction` | string | `desc` | |

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
        "type": "BOOKING_CONFIRMED",
        "title": "Lịch hẹn đã được xác nhận",
        "body": "Lịch hẹn ngày 01/10/2026 lúc 09:00 đã được xác nhận.",
        "data": { "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a" },
        "status": "SENT",
        "isRead": false,
        "readAt": null,
        "appointmentId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
        "invoiceId": null,
        "paymentId": null,
        "createdAt": "2026-10-01T10:00:00Z",
        "updatedAt": "2026-10-01T10:00:00Z"
      }
    ],
    "page": 0, "size": 20, "totalElements": 1, "totalPages": 1, "last": true, "first": true
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules**

- ⚠ **User chỉ đọc được notification của chính mình:** mọi query bắt buộc có `WHERE user_id = principal.id`. `notifications.user_id` là UUID đơn thuần (không FK), nên **không thể** dựa vào referential integrity — phải kiểm ở tầng ứng dụng.
- `notifications.user_id` **nullable** ⇒ có thể tồn tại notification không gắn user (broadcast). Endpoint này **không** trả các notification đó.
- Sắp xếp mặc định `created_at DESC` — khớp index `idx_notifications_user_created` ✔.

### N.3 `GET /api/v1/notifications/{id}`

**Auth:** owner (`user_id == principal.id`), hoặc `ADMIN`/`OWNER` cho mục đích hỗ trợ.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Không phải chủ, không phải admin |
| `404` | `Notification not found with id: <id>` | |

⚠ Với notification của user khác, trả `403` (không phải `404`) để phân biệt rõ; nhưng nếu chọn quy ước "không lộ tồn tại" thì trả `404`. Phải thống nhất một quy ước cho toàn bộ hệ thống — contract này dùng **403 = sai quyền, 404 = không tồn tại**.

### N.4 `PATCH /api/v1/notifications/{id}/read`

**Request:** không body (hoặc `{"isRead": true}`).

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    "isRead": true,
    "readAt": "2026-10-01T11:00:00Z"
  },
  "timestamp": "2026-10-01T11:00:00Z"
}
```

**Business rules**

- `UPDATE notifications SET is_read = TRUE, read_at = now(), updated_at = now() WHERE id = :id AND user_id = :principalId AND is_read = FALSE`.
- ⚠ **CHECK `ck_notification_read_at CHECK (NOT is_read OR read_at IS NOT NULL)`** ⇒ **phải** ghi `read_at` cùng lúc với `is_read = TRUE`, nếu không sẽ vi phạm constraint.
- **Idempotent:** đọc lại notification đã đọc ⇒ `200`, giữ nguyên `read_at` cũ (không overwrite).
- Không cho đánh dấu "chưa đọc" bằng API này (nếu cần thì thêm `PATCH /notifications/{id}/unread` — `Proposed`; khi đó phải set `read_at = NULL` để không vi phạm CHECK).

### N.5 `PATCH /api/v1/notifications/read-all`

**Request**

```json
{ "type": "BOOKING_CONFIRMED" }
```

(`type` optional — bỏ trống = đánh dấu tất cả.)

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": { "updatedCount": 12 },
  "timestamp": "2026-10-01T11:05:00Z"
}
```

**Business rules**

- `UPDATE notifications SET is_read = TRUE, read_at = now() WHERE user_id = :principalId AND is_read = FALSE [AND type = :type]`.
- Chỉ chạm notification **của chính user** — đây là chỗ dễ sai nhất: nếu thiếu `user_id` trong `WHERE` thì sẽ đánh dấu đọc hàng loạt của toàn hệ thống.
- Trả `updatedCount` để client hiển thị chính xác.
- **Không** giới hạn số lượng ⇒ cân nhắc batch update nếu `notifications` lớn; `updatedCount` cho biết phạm vi ảnh hưởng.

### N.6 `GET /api/v1/notifications/unread-count`

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": { "unreadCount": 5 },
  "timestamp": "2026-10-01T11:06:00Z"
}
```

⚠ **Query này sẽ full-scan mọi notification của user** vì index `idx_notifications_user_created` là `(user_id, created_at DESC)`, không có phần `is_read`. Đề xuất `P-37`:

```sql
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id) WHERE is_read = FALSE;
```

### N.7 `POST /api/v1/notifications` — **Internal / service-to-service**

⚠ **Yêu cầu xác thực service-to-service chưa có cấu hình nào trong source.** Cần chốt cơ chế:

| Phương án | Mô tả | Đánh giá |
|---|---|---|
| A. Internal token header | `X-Internal-Token` so sánh constant-time với secret từ biến môi trường | Đơn giản; cần luân chuyển secret |
| B. Client credentials | `grant_type=client_credentials` phát token riêng cho service | Chuẩn hơn; cần thêm `spring-security-oauth2-client` |
| C. mTLS giữa các service | Xác thực ở tầng transport | Mạnh nhất; cần hạ tầng |

Contract khuyến nghị **B** (hoặc A nếu cần triển khai nhanh), kèm ràng buộc bắt buộc: **endpoint này KHÔNG được public** và phải bị chặn ở tầng network (compose network nội bộ / security group).

**Request**

```json
{
  "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
  "type": "BOOKING_REMINDER",
  "title": "Nhắc lịch hẹn",
  "body": "Bạn có lịch hẹn lúc 09:00 ngày mai tại phòng khám PetCare",
  "appointmentId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a",
  "invoiceId": null,
  "paymentId": null,
  "templateCode": "BOOKING_REMINDER",
  "templateVersion": 1,
  "data": { "bookingId": "d4c3b2a1-9f8e-7d6c-5b4a-3f2e1d0c9b8a", "startTime": "2026-10-02T09:00:00+07:00" },
  "channels": ["IN_APP", "EMAIL"],
  "scheduledAt": null
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `userId` | `user_id` | Có | ⚠ nullable trong DB nhưng endpoint này nên yêu cầu |
| `type` | `type` | **Có** | `NOT NULL`, ≤ 100 |
| `title` | `title` | **Có** | `NOT NULL`, ≤ 255 |
| `body` | `body` | **Có** | `NOT NULL` |
| `appointmentId`/`invoiceId`/`paymentId` | cùng tên | Không | UUID tham chiếu logic |
| `templateCode` | `template_code` | Không | Phải tồn tại `notification_templates(code, version, channel)` |
| `templateVersion` | `template_version` | Không | > 0 |
| `data` | `data` | Không | JSONB |
| `channels` | → `notification_deliveries` | Không | Mặc định `["IN_APP"]` |
| `scheduledAt` | `scheduled_at` | Không | ISO-8601; để giao trễ |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    "userId": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
    "type": "BOOKING_REMINDER",
    "title": "Nhắc lịch hẹn",
    "status": "PENDING",
    "isRead": false,
    "scheduledAt": null,
    "createdAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**Business rules**

- Tạo `notifications` + **một dòng `notification_deliveries` cho mỗi channel** trong cùng transaction.
- ⚠ **Không có cột `deduplication_key`** trong `notifications` ⇒ gọi lại endpoint này sẽ tạo bản ghi trùng. Xem N.9.
- ⚠ `notifications.user_id` không FK sang Core ⇒ không thể xác minh user tồn tại. Nếu cần, phải thêm lookup qua Core API hoặc chấp nhận rủi ro orphan.
- Khi có `templateCode`, `title`/`body` có thể render từ template; nếu không truyền thì lấy từ template theo `channel`.
- `notifications.status` khởi tạo `PENDING`; worker sẽ chuyển sang `PROCESSING` → `SENT`/`PARTIALLY_SENT`/`FAILED`.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `userId`/`type`/`title`/`body` |
| `401` | `Unauthorized` | Thiếu/sai service token |
| `404` | `Template not found for code <code> and version <v>` | Template không tồn tại |
| `422` | `Unsupported channel: <channel>` | Channel ngoài 4 giá trị CHECK |

### N.8 `POST /api/v1/notifications/{id}/retry`

⚠ **Retry delivery ≠ tạo notification mới.** Endpoint này **phải** chỉ đặt lại trạng thái của các dòng `notification_deliveries` đang `FAILED`/`DEAD_LETTERED`; **tuyệt đối không** `INSERT` bản ghi `notifications` mới.

| | |
|---|---|
| Auth | `ADMIN` hoặc permission `notification:retry` |

⚠ **Phân biệt rõ hai nhóm quyền:**

| Nhóm quyền | Phạm vi |
|---|---|
| `STAFF` (lễ tân/nhân viên) | **Không** được retry delivery, **không** được gọi endpoint nội bộ `POST /notifications`. Chỉ có thể xem notification của chính mình |
| `ADMIN`/`OWNER` | Retry delivery, xem mọi notification, gọi endpoint nội bộ |

**Request**

```json
{
  "channels": ["EMAIL"],
  "reason": "SMTP tạm thời không khả dụng"
}
```

**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "notificationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
    "retriedDeliveries": 1,
    "deliveries": [
      {
        "id": "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
        "channel": "EMAIL",
        "status": "PENDING",
        "attemptCount": 4,
        "nextAttemptAt": "2026-10-01T11:10:00Z",
        "lastError": "Connection refused"
      }
    ]
  },
  "timestamp": "2026-10-01T11:07:00Z"
}
```

**Business rules**

```sql
UPDATE notification_deliveries
   SET status = 'PENDING',
       next_attempt_at = now(),
       last_error = NULL,
       updated_at = now()
 WHERE notification_id = :id
   AND status IN ('FAILED','DEAD_LETTERED')
   AND (:channel IS NULL OR channel = :channel);
```

- Reset **cả** `attempt_count` về 0, nếu không thì delivery sẽ `DEAD_LETTERED` ngay lần gửi kế tiếp. Nếu chính sách là "giữ lịch sử số lần thử", **không** reset mà tăng hạn mức — phải chốt và ghi vào contract.
- Không retry dòng `status='SENT'` ⇒ trả `retriedDeliveries: 0`.
- Ghi `audit_logs`… ⚠ Notification DB **không có** bảng `audit_logs` ⇒ log ở tầng ứng dụng/monitoring.
- Phát event outbox `notification.retried.v1` (nếu các hệ thống khác cần biết).

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Không phải admin |
| `404` | `Notification not found with id: <id>` | |
| `409` | `NOTHING_TO_RETRY` | Không có delivery `FAILED`/`DEAD_LETTERED` |

### N.9 Idempotency / deduplication

| Đường tạo notification | Cơ chế dedup | Trạng thái |
|---|---|---|
| **Qua event RabbitMQ** (`booking.created.v1`, `payment.completed.v1`, …) | `inbox_events.event_id PRIMARY KEY` ⇒ consumer bỏ qua event đã xử lý ✔ | **Có sẵn ở tầng DB** |
| **Qua `POST /notifications`** (internal) | ⚠ **KHÔNG có** — `notifications` không có `deduplication_key` | **Thiếu** → `P-38` |
| **Retry delivery** | Không tạo notification mới ⇒ không cần dedup ✔ | Đúng theo thiết kế |
| **Provider message** | `uq_notification_provider_message (provider, provider_message_id)` ✔ chống ghi trùng message của provider | Có sẵn |

**`P-38` — dedup cho endpoint nội bộ:**

```sql
ALTER TABLE notifications
  ADD COLUMN deduplication_key VARCHAR(255);
CREATE UNIQUE INDEX uq_notifications_dedup
  ON notifications(deduplication_key) WHERE deduplication_key IS NOT NULL;
-- chặn gửi trùng cùng một channel cho cùng một notification
CREATE UNIQUE INDEX uq_notification_deliveries_channel
  ON notification_deliveries(notification_id, channel);
```

Client nội bộ truyền `deduplicationKey` (VD `booking.reminder:{bookingId}:{startTime}`). Gọi lại với cùng key ⇒ trả `200` với notification cũ, không tạo mới.

⚠ `outbox_events` **không có** cột `deduplication_key` — tài liệu cũ mô tả `notification_outbox.deduplication_key` là **không tồn tại**.

### N.10 Retry policy và dead-letter

**Điều CSDL đã hỗ trợ**

| Cột / index | Vai trò |
|---|---|
| `notification_deliveries.status = 'FAILED'` | Trạng thái lỗi |
| `notification_deliveries.attempt_count` (CHECK ≥ 0) | Số lần đã thử |
| `notification_deliveries.next_attempt_at` | Thời điểm thử lại |
| `notification_deliveries.last_error` | Chi tiết lỗi |
| `notification_deliveries.status = 'DEAD_LETTERED'` | Đã hết số lần cho phép |
| `idx_notification_deliveries_retry` | `(next_attempt_at) WHERE status='FAILED'` ✔ hỗ trợ worker poll |
| `notifications.status = 'PARTIALLY_SENT'` | Một số channel thành công, số khác thất bại |

**⚠ Chưa có cấu hình nào trong source.** Cần định nghĩa trước khi triển khai:

| Hạng mục | Đề xuất | Trạng thái |
|---|---|---|
| Số lần thử tối đa | `5` | **Chưa cấu hình** |
| Lịch backoff | `1m → 5m → 15m → 1h → 6h` (exponential + jitter) | **Chưa cấu hình** |
| Ngưỡng dead-letter | `attempt_count >= max` ⇒ `status = 'DEAD_LETTERED'` | **Chưa cấu hình** |
| Worker poll interval | 30 giây, `SELECT ... FOR UPDATE SKIP LOCKED` cho nhiều instance | **Chưa cấu hình** |
| Xử lý sau dead-letter | Không tự retry; chỉ retry thủ công qua N.8 kèm `ADMIN` | **Chưa cấu hình** |
| Notification service (Java) listener retry | — | ⚠ `notification-service/application.yml` **không** có `spring.rabbitmq.listener.retry` (Core có) |

**Luồng xử lý đề xuất**

```
PENDING ──► PROCESSING ──► SENT
                 │
                 └──► FAILED ──(next_attempt_at, attempt_count++)──► PROCESSING
                                  │
                                  └──(attempt_count >= max)──► DEAD_LETTERED

notifications.status:  PENDING ──► PROCESSING ──► SENT
                                         ├──► PARTIALLY_SENT   (một số channel OK)
                                         ├──► FAILED           (tất cả channel lỗi)
                                         └──► CANCELLED        (huỷ trước khi gửi)
```

⚠ **Quy tắc bất biến:** retry delivery **không được** tạo `notifications` mới. Retry chỉ đổi trạng thái dòng `notification_deliveries` hiện có.

### N.11 Event types

Notification service nhận event qua RabbitMQ; `notifications.type` lưu loại sự kiện.

| `type` đề xuất | Trigger |
|---|---|
| `BOOKING_CREATED` | `booking.created` |
| `BOOKING_CONFIRMED` | `booking.confirmed` |
| `BOOKING_CANCELLED` | `booking.cancelled` |
| `BOOKING_COMPLETED` | `booking.completed` |
| `BOOKING_REMINDER` | Scheduled job (⚠ chưa có) |
| `PAYMENT_SUCCESS` | `payment.completed.v1` |
| `PAYMENT_FAILED` | `payment.failed` |
| `PAYMENT_REFUNDED` | `payment.refunded.v1` |
| `VACCINATION_DUE` | `vaccination.due` |
| `REVIEW_REQUEST` | `review.created` |
| `INVENTORY_LOW_STOCK` | `inventory.low-stock` |
| `LOYALTY_POINTS_EARNED` | `loyalty.points_earned` |

⚠ Tên routing key phải khớp `RabbitMQQueues` trong Core:

```java
BOOKING_CREATED   = "booking.created"     BOOKING_CONFIRMED = "booking.confirmed"
BOOKING_CANCELLED = "booking.cancelled"   BOOKING_COMPLETED = "booking.completed"
PAYMENT_COMPLETED = "payment.completed"   PAYMENT_FAILED    = "payment.failed"
NOTIFICATION_SEND = "notification.send"   INVENTORY_LOW_STOCK = "inventory.low-stock"
REVIEW_CREATED    = "review.created"      VACCINATION_DUE   = "vaccination.due"
```

Tất cả routing key trong `RabbitMQQueues` đều có queue + binding tương ứng trong `RabbitMQConfig`. Việc **phát** event và **consume** vẫn chưa có code — xem `P-20`.

### N.12 `notification_templates` — `/api/v1/notification-templates`

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/notification-templates` | `Schema-supported` | `ADMIN` |
| GET | `/notification-templates/{id}` | `Schema-supported` | `ADMIN` |
| GET | `/notification-templates/code/{code}` | `Schema-supported` | `ADMIN` |
| POST | `/notification-templates` | `Schema-supported` | `ADMIN` |
| PATCH | `/notification-templates/{id}/active` | `Schema-supported` | `ADMIN` |

**CSDL (V1:1–11)**

```sql
notification_templates(
  id UUID PK,
  code VARCHAR(100) NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP')),
  subject VARCHAR(255), body_template TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_template_version UNIQUE (code, version, channel)
)
```

⚠ **`notification_templates` KHÔNG có `updated_at` và KHÔNG có `version`** (cột `version` ở đây là **số hiệu template nghiệp vụ**, không phải optimistic lock). Bảng là **append-only theo version**.

⚠ **`notifications.template_code` / `template_version` KHÔNG có foreign key** tới `notification_templates`. Hai cột đó chỉ là **text tham chiếu logic**.

**Business rules**

| # | Quy tắc |
|---|---|
| 1 | **Cập nhật template = tạo version mới**, không `UPDATE` dòng cũ (`uq_notification_template_version` chặn trùng `(code, version, channel)`). |
| 2 | **`DELETE` là `Proposed` và không khuyến nghị.** Xoá template không vi phạm FK (vì không có FK), nhưng làm **hỏng render lịch sử**: notification cũ đã lưu `template_code`/`template_version` sẽ không còn template để dựng lại nội dung. Ưu tiên `active = FALSE`. |
| 3 | Khi gửi, chọn template theo `(code, version, channel)` với `active = TRUE` và **version lớn nhất** ≤ version được yêu cầu. |
| 4 | `channel` có `CHECK` ✔ ⇒ 4 giá trị hợp lệ; service vẫn nên trả `422` rõ ràng thay vì để DB ném lỗi → `500`. |

**Request**

```json
{
  "code": "BOOKING_CONFIRMED",
  "version": 2,
  "channel": "EMAIL",
  "subject": "Lịch hẹn của {{petName}} đã được xác nhận",
  "bodyTemplate": "Chào {{customerName}}, lịch hẹn dịch vụ {{serviceName}} ngày {{bookingDate}} lúc {{startTime}} đã được xác nhận.",
  "active": true
}
```

| Field | Cột | Bắt buộc | Validation |
|---|---|---|---|
| `code` | `code` | Có | ≤ 100; chuẩn hoá **UPPERCASE** |
| `version` | `version` | Có | `> 0` ✔ (CHECK) |
| `channel` | `channel` | Có | `EMAIL`/`SMS`/`PUSH`/`IN_APP` ✔ (CHECK) |
| `subject` | `subject` | Không | ≤ 255. Chỉ dùng cho `EMAIL` |
| `bodyTemplate` | `body_template` | **Có** | TEXT; **không rỗng** |
| `active` | `active` | Không | mặc định `true` |

**Response `201`**

```json
{
  "status": 201,
  "success": true,
  "message": "Created",
  "data": {
    "id": "6e7f8a9b-0c1d-4e2f-8a3b-4c5d6e7f8a9b",
    "code": "BOOKING_CONFIRMED",
    "version": 2,
    "channel": "EMAIL",
    "subject": "Lịch hẹn của {{petName}} đã được xác nhận",
    "bodyTemplate": "Chào {{customerName}}, lịch hẹn dịch vụ {{serviceName}} ngày {{bookingDate}} lúc {{startTime}} đã được xác nhận.",
    "active": true,
    "createdAt": "2026-10-01T10:00:00Z"
  },
  "timestamp": "2026-10-01T10:00:00Z"
}
```

**`GET /notification-templates`** — query `code`, `channel`, `active`, `page`, `size`, `sortBy` mặc định `code`, `direction` mặc định `asc`.

**`GET /notification-templates/code/{code}`** — trả **tất cả version** của một `code`, `200` với mảng (có thể rỗng). Tiện cho việc render lại notification lịch sử.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `400` | `Validation failed` | Thiếu `code`/`version`/`channel`/`bodyTemplate` |
| `403` | `Access denied` | Không phải `ADMIN` |
| `404` | `Template not found with id: <id>` | |
| `409` | `Template version already exists for code and channel` | Vi phạm `uq_notification_template_version` |

### N.13 `notification_deliveries` — tra cứu vận hành

| Method | Path | Trạng thái | Auth |
|---|---|---|---|
| GET | `/notifications/{id}/deliveries` | `Schema-supported` | `ADMIN`/`OWNER` |
| POST | `/notifications/deliveries/{deliveryId}/retry` | `Schema-supported` | `ADMIN` |

⚠ **Phân biệt với N.8** — `POST /notifications/{id}/retry` reset **mọi** delivery `FAILED`/`DEAD_LETTERED` của một notification. Endpoint này reset **một** delivery cụ thể, dùng khi chỉ một channel lỗi (VD: chỉ SMS fail còn email đã gửi).

**`GET /notifications/{id}/deliveries` — response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
      "notificationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "channel": "EMAIL",
      "recipient": "cus****@example.invalid",
      "provider": "smtp",
      "providerMessageId": "<provider-msg-id>",
      "status": "FAILED",
      "attemptCount": 3,
      "nextAttemptAt": "2026-10-01T11:10:00Z",
      "sentAt": null,
      "lastError": "Connection refused",
      "createdAt": "2026-10-01T10:00:00Z",
      "updatedAt": "2026-10-01T10:05:00Z"
    },
    {
      "id": "d3e4f5a6-b7c8-4d9e-8f0a-2b3c4d5e6f7a",
      "notificationId": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e",
      "channel": "IN_APP",
      "recipient": "0f9a1c2e-3d4b-5a6f-7e8c-9b0a1b2c3d4e",
      "provider": null,
      "providerMessageId": null,
      "status": "SENT",
      "attemptCount": 1,
      "nextAttemptAt": null,
      "sentAt": "2026-10-01T10:00:01Z",
      "lastError": null,
      "createdAt": "2026-10-01T10:00:00Z",
      "updatedAt": "2026-10-01T10:00:01Z"
    }
  ],
  "timestamp": "2026-10-01T11:06:00Z"
}
```

**Business rules**

- **Mask dữ liệu người nhận:** `EMAIL` phải che trừng giữa (VD `cus****@example.invalid`), `PUSH`/`SMS` che số cuối. `recipient VARCHAR(500)` chứa PII ⇒ chỉ `ADMIN` được xem và phải mask.
- Trả **mảng, không phân trang** — số channel tối đa 4 nên một notification có tối đa vài dòng delivery. Nếu vượt quá thì chuyển sang `PageResponse`.
- `CUSTOMER` **không** được gọi endpoint này (chỉ có `/notifications/{id}`).

**`POST /notifications/deliveries/{deliveryId}/retry`**

**Request:** không body (hoặc `{"reason": "..."}`).
**Response `200`**

```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "deliveryId": "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f",
    "channel": "EMAIL",
    "status": "PENDING",
    "attemptCount": 0,
    "nextAttemptAt": "2026-10-01T11:10:00Z"
  },
  "timestamp": "2026-10-01T11:07:00Z"
}
```

Business rules giống N.8 (reset `status`, `next_attempt_at`, `last_error`, `attempt_count`), cộng thêm:
- ⚠ **Chỉ reset dòng `status IN ('FAILED','DEAD_LETTERED')`.** Reset dòng `SENT` sẽ gửi lại email/notification ⇒ trả `409 DELIVERY_NOT_RETRYABLE`.
- ⚠ **Không tạo `notifications` mới** và **không tạo `notification_deliveries` mới**.

**Errors**

| HTTP | `message` | Khi nào |
|---|---|---|
| `403` | `Access denied` | Không phải `ADMIN`/`OWNER` |
| `404` | `Notification not found with id: <id>` | |
| `404` | `Delivery not found with id: <deliveryId>` | |
| `409` | `DELIVERY_NOT_RETRYABLE` | Delivery đang `PENDING`/`PROCESSING`/`SENT` |

---

# PHẦN 4 — INTER-SERVICE EVENTS

## RabbitMQ topology đã cấu hình

`RabbitMQConfig` + `RabbitMQQueues` trong Core khai báo (đã có trong source):

| Exchange | Queue | Routing key | DLX |
|---|---|---|---|
| `petcare.booking` | `booking.created` | `booking.created` | `petcare.dlx` (routing key `booking.created.dlq`) |
| `petcare.booking` | `booking.confirmed` | `booking.confirmed` | `petcare.dlx` |
| `petcare.booking` | `booking.cancelled` | `booking.cancelled` | `petcare.dlx` |
| `petcare.booking` | `booking.completed` | `booking.completed` | `petcare.dlx` |
| `petcare.payment` | `payment.completed` | `payment.completed` | `petcare.dlx` |
| `petcare.payment` | `payment.failed` | `payment.failed` | `petcare.dlx` |
| `petcare.notification` | `notification.send` | `notification.send` | `petcare.dlx` |
| `petcare.inventory` | `inventory.low-stock` | `inventory.low-stock` | `petcare.dlx` |
| `petcare.review` | `review.created` | `review.created` | `petcare.dlx` |
| `petcare.medical` | `vaccination.due` | `vaccination.due` | `petcare.dlx` |

⚠ **Không có publisher hay consumer nào trong source.** Toàn bộ topology chỉ là khai báo bean.

⚠ `infrastructure/rabbitmq/definitions.json` là file **0 byte** ⇒ RabbitMQ khởi động không có định nghĩa nào được import; queue được tạo bởi Spring `QueueBuilder.durable(...)` khi service khởi động.

## Event envelope

```json
{
  "eventId": "uuid",
  "eventType": "payment.completed",
  "eventVersion": 1,
  "aggregateId": "uuid",
  "occurredAt": "2026-10-01T10:30:00Z",
  "correlationId": "uuid",
  "payload": {}
}
```

⚠ Trường `correlationId` **không có cột** trong `inbox_events`/`outbox_events`. Nếu cần truy vết phân tán thì thêm cột vào payload hoặc migration (`P-20`).

## Outbox / Inbox theo database

| Database | `outbox_events` | `inbox_events` | Ghi chú |
|---|---|---|---|
| Core | ❌ **không có** | ❌ **không có** | ⇒ **Publisher/consumer ở Core chưa thể dùng mẫu outbox** → `P-20` |
| Payment | ✔ có | ✔ có | Index `idx_payment_outbox_unpublished (occurred_at) WHERE published_at IS NULL` ✔ |
| Notification | ✔ có | ✔ có | Index `idx_notification_outbox_unpublished` ✔ |

## Event topology đề xuất

| Producer | Event | Consumers | Trạng thái |
|---|---|---|---|
| Core | `invoice.issued.v1` | Payment | Routing key **chưa có** → `P-20` |
| Core | `booking.created` | Notification | ✔ key có, chưa implement |
| Core | `booking.confirmed` | Notification | ✔ key có, chưa implement |
| Core | `booking.completed` | Notification | ✔ key có, chưa implement |
| Core | `booking.cancelled` | Notification | ✔ key có, chưa implement |
| Core | `booking.started` | Notification | ✔ key + queue đã khai báo; chưa implement |
| Core | `review.created` | Notification | ✔ key có, chưa implement |
| Core | `vaccination.due` | Notification | ✔ key có, chưa implement |
| Core | `inventory.low-stock` | Notification | ✔ key có, chưa implement |
| Core | `loyalty.points-earned` | Notification | ✔ key + queue đã khai báo; chưa implement |
| Payment | `payment.completed` | Core, Notification | ✔ key có; **Notification phải có queue riêng** |
| Payment | `payment.failed` | Core, Notification | ✔ key có |
| Payment | `payment.refunded` | Core, Notification | ✔ key + queue đã khai báo; chưa implement |

**Quy tắc bắt buộc:** mỗi consumer phải có **queue riêng**. Core và Notification **không** được cùng consume một queue `payment.completed`, vì RabbitMQ sẽ chia message giữa các consumer thay vì gửi một bản cho mỗi service. Với topic exchange, mỗi service bind **một queue riêng** vào cùng routing key.

**Retry/DLQ:** mọi event queue đều khai báo `x-dead-letter-exchange = petcare.dlx` **và** `x-dead-letter-routing-key = <routing-key>.dlq`, nên message hết số lần retry sẽ nằm ở key riêng thay vì key gốc. Listener retry: `initial-interval=1000ms, max-attempts=3, multiplier=2, max-interval=10000ms`, `acknowledge-mode: manual`, `prefetch: 10`.

---

# PHẦN 5 — PROPOSED MIGRATIONS

Các migration dưới đây **chưa tồn tại**. Chỉ tạo khi nghiệp vụ đã chốt và đã kiểm tra môi trường nào đã apply V1/V2 (không sửa file migration đã apply).

## Bảng tổng hợp

| ID | Mục đích | Bảng/cột | Ưu tiên |
|---|---|---|---|
| `P-1` | Refresh token persistence | tạo `refresh_tokens` | **Blocker** |
| `P-2` | RBAC persistence | tạo `roles`, `permissions`, `role_permissions`, `user_roles` | **Blocker** |
| `P-3` | Unique phone | `uq_users_phone` | Thấp |
| `P-4` | Integrity staff/skills | `uq_staff_user`, `uq_staff_skills` | Trung bình |
| `P-5` | Split shift + chống overlap lịch | `schedules` | Cao |
| `P-6` | Timezone cho schedules | `schedules.starts_at/ends_at` | Trung bình |
| `P-7` | Ngày nghỉ/holiday | `branch_holidays` | Thấp |
| `P-8` | **Chống double-booking slot** | `booking_items` index + `time_slots` CAS | **Blocker** |
| `P-9` | Chống overlap theo staff | `booking_items.start_at/end_at` + exclusion | Cao |
| `P-10` | Pet thuộc chi nhánh | `pets.branch_id` | Thấp |
| `P-11` | Bảng loài thú cưng | `pet_species` | Trung bình |
| `P-12` | CHECK constraints + index | nhiều bảng | Cao |
| `P-13` | Liên kết medical ↔ booking | `medical_records.booking_id` | Trung bình |
| `P-14` | Ẩn hồ sơ y tế sai | `medical_records.status` | Thấp |
| `P-15` | Bác sĩ có cấu trúc | `veterinarians`, `medical_records.veterinarian_id` | Trung bình |
| `P-16` | Thuốc & đơn thuốc | `medicines`, `prescriptions`, `prescription_items` | Trung bình |
| `P-17` | Thuốc lên invoice | `invoice_items.item_type`, `medicine_id` | Thấp |
| `P-18` | Promotion ↔ service + coupon usage | `promotion_services`, `coupon_usages` | Trung bình |
| `P-19` | Idempotency key storage | `idempotency_records` | Cao |
| `P-20` | **Outbox/inbox cho Core** | `outbox_events`, `inbox_events` + routing keys | **Blocker** |
| `P-21` | Index truy vấn booking | `idx_bookings_created` | Thấp |
| `P-22` | Lịch sử trạng thái booking | `booking_status_history` | Cao |
| `P-23` | Phí hủy booking | `bookings.cancel_fee` | Thấp |
| `P-24` | **Trạng thái + ràng buộc invoice** | `invoices.status`, `UNIQUE(booking_id)` | **Blocker** |
| `P-25` | Sinh `invoice_number` + refund reason | sequence / bảng đếm | Trung bình |
| `P-26` | Loyalty tier + idempotent earn | `loyalty_tiers`, unique index | Cao |
| `P-27` | **Chống số dư điểm âm** | `CHECK (points >= 0)` | **Blocker** |
| `P-28` | Reward catalog | `loyalty_rewards`, `loyalty_redemptions` | Thấp |
| `P-29` | Moderation review | `reviews.moderated_*` | Thấp |
| `P-30` | Một booking một review | `UNIQUE (booking_id)` | Cao |
| `P-31` | Review theo service/vet | `reviews.service_id`, `veterinarian_id` | Thấp |
| `P-32` | Trạng thái conversation | `ai_conversations.status` | Thấp |
| `P-33` | Loại message AI | `ai_messages.message_type` | Thấp |
| `P-34` | Nhật ký AI request/tool call | `ai_requests`, `ai_tool_calls` | Trung bình |
| `P-35` | RAG chunking | `document_chunks`, `documents.index_status` | Cao |
| `P-36` | Lịch sử phân tích ảnh | `vision_analyses` | Trung bình |
| `P-37` | Index unread count | `idx_notifications_user_unread` | Thấp |
| `P-38` | Dedup notification nội bộ | `notifications.deduplication_key` | Cao |
| `P-39` | **Index cho FK chưa có** | 29 cột FK trong Core DB | Cao |
| `P-40` | Soft-delete cho service category | `service_categories.is_active` | Trung bình |
| `P-41` | Chống double-book resource | index `time_slots(resource_id, …)` | Cao |
| `P-42` | Audit actor type + `ip_address` rộng hơn | `audit_logs.actor_type`, `ip_address` | Thấp |

## Nội dung chi tiết các migration Blocker

### `P-1` — `refresh_tokens` (Bắt buộc trước khi dùng `/auth/refresh`, `/auth/logout`)

```sql
CREATE TABLE refresh_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    token_hash          VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 hex = 64 ký tự
    token_family_id     UUID NOT NULL,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id),
    issued_at           TIMESTAMPTZ NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    last_used_at        TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revoke_reason       VARCHAR(255),
    device_id           VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_refresh_tokens_expiry CHECK (expires_at > issued_at)
);
CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family  ON refresh_tokens(token_family_id);
CREATE INDEX idx_refresh_tokens_active  ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;
```

### `P-2` — RBAC (Bắt buộc trước khi dùng `/rbac/**`, `/users/{id}/roles`)

```sql
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    module      VARCHAR(100),
    description VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version     BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

INSERT INTO roles (name, description) VALUES
  ('CUSTOMER',    'Khách hàng — hồ sơ, thú cưng, đặt lịch, thanh toán, đánh giá'),
  ('STAFF',       'Lễ tân / nhân viên — lịch hẹn, hóa đơn, thanh toán'),
  ('VETERINARIAN','Bác sĩ thú y — hồ sơ bệnh án, chẩn đoán, kê đơn'),
  ('OWNER',       'Chủ phòng khám — quản lý, báo cáo doanh thu, nhân sự, khuyến mãi'),
  ('ADMIN',       'Quản trị hệ thống — cấu hình, RBAC, tài liệu tri thức RAG')
ON CONFLICT (name) DO NOTHING;
```

⚠ `user_roles` **không** có `updated_at`/`version` — nên `POST /users/{id}/roles` là thay-thế toàn bộ tập (xem B.6), không phải thêm/bớt từng role.

### `P-8` — Chống double-booking slot (Bắt buộc trước khi mở `POST /bookings`)

Xem phần **D.5** để có DDL đầy đủ. Tóm tắt:

```sql
ALTER TABLE booking_items ADD CONSTRAINT ck_booking_items_status
  CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'));
ALTER TABLE bookings ADD CONSTRAINT ck_bookings_status
  CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'));

CREATE UNIQUE INDEX uq_booking_items_active_slot
  ON booking_items(time_slot_id) WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';
CREATE UNIQUE INDEX uq_booking_items_staff_slot
  ON booking_items(staff_id, time_slot_id) WHERE time_slot_id IS NOT NULL AND status <> 'CANCELLED';
```

Kèm cơ chế CAS bắt buộc trong service (không thay thế được bằng constraint):

```sql
UPDATE time_slots SET is_booked = TRUE, updated_at = now()
 WHERE id = :slotId AND is_booked = FALSE;
-- affected rows = 0  ⇒  SLOT_ALREADY_BOOKED (409)
```

### `P-20` — Outbox/Inbox cho Core + bổ sung routing key (Bắt buộc trước khi dùng event ở Core)

```sql
CREATE TABLE outbox_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID NOT NULL,
    event_type     VARCHAR(150) NOT NULL,
    event_version  INTEGER NOT NULL DEFAULT 1 CHECK (event_version > 0),
    payload        JSONB NOT NULL,
    correlation_id UUID,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at   TIMESTAMPTZ,
    retry_count    INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error     TEXT
);
CREATE INDEX idx_core_outbox_unpublished ON outbox_events(occurred_at) WHERE published_at IS NULL;

CREATE TABLE inbox_events (
    event_id       UUID PRIMARY KEY,
    event_type     VARCHAR(150) NOT NULL,
    payload        JSONB NOT NULL,
    correlation_id UUID,
    received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMPTZ,
    failure_reason TEXT
);
CREATE INDEX idx_core_inbox_unprocessed ON inbox_events(received_at) WHERE processed_at IS NULL;
```

Bổ sung vào `RabbitMQQueues.java`:

```java
public static final String INVOICE_ISSUED = "invoice.issued";
public static final String BOOKING_STARTED = "booking.started";
public static final String PAYMENT_REFUNDED = "payment.refunded";
public static final String LOYALTY_POINTS_EARNED = "loyalty.points-earned";
```

⚠ Những routing key này **không** có trong source hiện tại ⇒ event topology chỉ "đề xuất" cho tới khi khai báo.

### `P-24` — Trạng thái và ràng buộc invoice (Bắt buộc trước khi mở `POST /invoices`)

Xem phần **I.1** để có DDL đầy đủ.

Tóm tắt: thêm `invoices.status` (+ `CHECK`), `subtotal`, `discount_amount`, `tax_amount`, `UNIQUE (booking_id)`, index `status` và `issued_at`.

### `P-27` — Chống số dư điểm âm (Bắt buộc trước khi mở `/loyalty/redeem`)

```sql
ALTER TABLE loyalty_accounts ADD CONSTRAINT ck_loyalty_points CHECK (points >= 0);
ALTER TABLE loyalty_transactions ADD CONSTRAINT ck_loyalty_tx_type
  CHECK (type IN ('EARN','REDEEM','ADJUST','EXPIRE'));
-- KHÔNG thêm CHECK >= 0 cho loyalty_transactions.points: số âm là hợp lệ cho REDEEM/ADJUST
CREATE INDEX idx_loyalty_transactions_account ON loyalty_transactions(account_id, created_at DESC);
```

---

## Chi tiết các migration còn lại (tham khảo, không kèm DDL)

| ID | Cột / index chính |
|---|---|
| `P-3` | `CREATE UNIQUE INDEX uq_users_phone ON users(phone) WHERE phone IS NOT NULL;` |
| `P-4` | `CREATE UNIQUE INDEX uq_staff_user ON staff(user_id);` + `CREATE UNIQUE INDEX uq_staff_skills ON staff_skills(staff_id, service_id);` |
| `P-5` | `DROP CONSTRAINT schedules_staff_id_work_date_key`; `CHECK (start_time < end_time)`; `EXCLUDE USING gist (staff_id WITH =, tsrange(work_date+start_time, work_date+end_time,'[)') WITH &&)` — cần `CREATE EXTENSION IF NOT EXISTS btree_gist;` |
| `P-6` | `schedules.starts_at/ends_at TIMESTAMPTZ NOT NULL` thay cho `work_date/start_time/end_time` |
| `P-7` | `branch_holidays(branch_id, holiday_date DATE, reason VARCHAR(255), PRIMARY KEY (branch_id, holiday_date))` |
| `P-9` | `booking_items.start_at TIMESTAMPTZ NOT NULL`, `end_at TIMESTAMPTZ NOT NULL`, `idx_booking_items_staff_time`, `EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at,end_at,'[)') WITH &&) WHERE (status IN ('PENDING','CONFIRMED','IN_PROGRESS'))` |
| `P-10` | `pets.branch_id UUID NULL REFERENCES branches(id)` + index |
| `P-11` | `pet_species(id, name UNIQUE, description, icon, ...)`; `ALTER TABLE breeds ADD COLUMN species_id UUID REFERENCES pet_species(id)`; `ALTER TABLE pets ADD COLUMN species_id UUID REFERENCES pet_species(id)`; backfill từ `DISTINCT` |
| `P-12` | `vaccinations`: `CHECK (next_due_date IS NULL OR next_due_date > administered_date)`, `idx_vaccinations_next_due`; `promotions`: `CHECK (discount_type IN ('PERCENTAGE','FIXED_AMOUNT'))`, `CHECK (used_count >= 0)`, `CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)` |
| `P-13` | `medical_records.booking_id UUID NULL REFERENCES bookings(id)` + `uq_medical_records_booking` (partial) |
| `P-14` | `medical_records.status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` + `CHECK (status IN ('ACTIVE','VOID'))` |
| `P-15` | `veterinarians(id, user_id UNIQUE REFERENCES users(id), license_number UNIQUE, specialization, years_experience INT, is_active BOOLEAN)`; `medical_records.veterinarian_id UUID NULL REFERENCES veterinarians(id)` |
| `P-16` | `medicines`, `prescriptions`, `prescription_items` — xem F.6 |
| `P-17` | `invoice_items.item_type VARCHAR(20) NOT NULL DEFAULT 'SERVICE'` + `CHECK (item_type IN ('SERVICE','MEDICINE','OTHER'))`; `invoice_items.service_id UUID NULL REFERENCES services(id)`; `invoice_items.medicine_id UUID NULL REFERENCES medicines(id)` |
| `P-18` | `promotion_services`, `coupon_usages` — xem G.5 |
| `P-19` | `idempotency_records(id, scope VARCHAR(50), idempotency_key VARCHAR(255), request_hash CHAR(64), response_body JSONB, created_at, UNIQUE (scope, idempotency_key))` |
| `P-21` | `CREATE INDEX idx_bookings_created ON bookings(created_at DESC);` |
| `P-22` | `booking_status_history` — xem H.10 |
| `P-23` | `bookings.cancel_fee DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cancel_fee >= 0)` |
| `P-25` | `CREATE SEQUENCE invoice_number_seq;` hoặc `invoice_counters(year INT, last_value INT, PRIMARY KEY(year))`; `payment_transactions.refund_reason TEXT` hoặc `payments.last_refund_reason` |
| `P-26` | `loyalty_tiers` + `loyalty_accounts.tier_id`; `CREATE UNIQUE INDEX uq_loyalty_earn_booking ON loyalty_transactions(account_id, booking_id) WHERE type='EARN' AND booking_id IS NOT NULL;` |
| `P-28` | `loyalty_rewards(id, name, points_cost BIGINT CHECK (>0), stock INT, is_active BOOLEAN)`; `loyalty_redemptions(...)` |
| `P-29` | `reviews.moderated_at TIMESTAMPTZ`, `reviews.moderated_by UUID REFERENCES users(id)`, `reviews.moderation_note TEXT` |
| `P-30` | `ALTER TABLE reviews ADD CONSTRAINT uq_reviews_booking UNIQUE (booking_id);` |
| `P-31` | `reviews.service_id UUID NULL REFERENCES services(id)`, `reviews.veterinarian_id UUID NULL REFERENCES veterinarians(id)` |
| `P-32` | `ai_conversations.status VARCHAR(20) NOT NULL DEFAULT 'OPEN'` + `CHECK (status IN ('OPEN','CLOSED'))`, `ai_conversations.closed_at` |
| `P-33` | `ai_messages.message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT'` + `CHECK (message_type IN ('TEXT','IMAGE','FILE'))` |
| `P-34` | `ai_requests(id, conversation_id, user_id, request_type, model, input_tokens, output_tokens, latency_ms, status, error_message, created_at)`; `ai_tool_calls(id, ai_request_id, tool_name, arguments JSONB, result TEXT, status, execution_time_ms)` |
| `P-35` | `document_chunks`, `documents.title/document_type/created_by/index_status/indexed_at/chunk_count` — xem L.4 |
| `P-36` | `vision_analyses` — xem L.5 |
| `P-37` | `CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;` |
| `P-38` | `notifications.deduplication_key` + `uq_notifications_dedup` + `uq_notification_deliveries_channel` — xem N.9 |
| `P-39` | Index cho 29 cột FK chưa có — xem bên dưới |
| `P-40` | `ALTER TABLE service_categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;` + index lọc theo `is_active` |
| `P-41` | `CREATE UNIQUE INDEX uq_time_slots_resource_start ON time_slots(resource_id, start_time) WHERE resource_id IS NOT NULL;` + `uq_time_slots_resource_end` — xem O.4 |
| `P-42` | `ALTER TABLE audit_logs ADD COLUMN actor_type VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (actor_type IN ('USER','SYSTEM','CRON'));` + `ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(64);` |

### `P-39` — Index cho các cột foreign key chưa có

⚠ **PostgreSQL KHÔNG tự tạo index cho cột foreign key.** Core V1 chỉ index 12 cột, trong đó `bookings.pet_id`, `bookings.customer_id` và `users.email` có index; **29 cột FK còn lại không có index**. Hậu quả trực tiếp với các endpoint đã đề xuất:

| Query | Cột FK bị thiếu index |
|---|---|
| `GET /pets?breedId=` | `pets.breed_id` |
| `GET /medical/records/pet/{petId}` | `medical_records.pet_id` |
| `GET /medical/vaccinations/pet/{petId}` | `vaccinations.pet_id` |
| `GET /schedules?staffId=` | `schedules.staff_id` |
| `GET /schedules/slots/available?staffId=` | `schedules.staff_id`, `time_slots.schedule_id` |
| `GET /staff/{id}/skills` | `staff_skills.staff_id`, `staff_skills.service_id` |
| `GET /services?categoryId=` | `services.category_id` |
| `GET /resources?branchId=` | `resources.branch_id` |
| `GET /staff?branchId=` | `staff.branch_id` |
| `GET /bookings?branchId=` | `bookings.branch_id` |
| `GET /bookings?promotionId=` | `bookings.promotion_id` |
| Load `booking_items` của booking | `booking_items.booking_id` |
| Filter booking theo staff/slot | `booking_items.staff_id`, `booking_items.time_slot_id` |
| `GET /invoices/by-booking/{bookingId}` | `invoices.booking_id` |
| Load `invoice_items` của invoice | `invoice_items.invoice_id` |
| `GET /loyalty/me/transactions` | `loyalty_transactions.account_id` — đã có ở `P-27` |
| `GET /reviews?customerId=` | `reviews.customer_id` |
| `GET /audit?actorUserId=` | `audit_logs.user_id` |
| `GET /ai/conversations` | `ai_conversations.user_id` |
| `GET /ai/conversations/{id}/messages` | `ai_messages.conversation_id` |

**DDL**

```sql
-- Pets / breeds
CREATE INDEX idx_pets_breed_id            ON pets(breed_id) WHERE breed_id IS NOT NULL;

-- Medical
CREATE INDEX idx_medical_records_pet      ON medical_records(pet_id, visit_date DESC);
CREATE INDEX idx_vaccinations_pet         ON vaccinations(pet_id, administered_date DESC);

-- Staff / skills
CREATE INDEX idx_staff_branch_id          ON staff(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_staff_skills_staff       ON staff_skills(staff_id);
CREATE INDEX idx_staff_skills_service     ON staff_skills(service_id);

-- Service catalog
CREATE INDEX idx_services_category_id     ON services(category_id) WHERE category_id IS NOT NULL;

-- Resources / schedules / slots
CREATE INDEX idx_resources_branch_id      ON resources(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_schedules_staff_date     ON schedules(staff_id, work_date);
CREATE INDEX idx_time_slots_schedule_id   ON time_slots(schedule_id) WHERE schedule_id IS NOT NULL;
CREATE INDEX idx_time_slots_resource_id   ON time_slots(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX idx_time_slots_booked        ON time_slots(start_time) WHERE is_booked = FALSE;

-- Bookings
CREATE INDEX idx_bookings_branch_id       ON bookings(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_bookings_promotion_id    ON bookings(promotion_id) WHERE promotion_id IS NOT NULL;
CREATE INDEX idx_booking_items_booking    ON booking_items(booking_id);
CREATE INDEX idx_booking_items_service    ON booking_items(service_id);
-- (uq_booking_items_staff_slot đã nằm trong P-8 — không tạo lại ở đây)

-- Invoice
CREATE INDEX idx_invoices_booking_id      ON invoices(booking_id);
CREATE INDEX idx_invoice_items_invoice    ON invoice_items(invoice_id);

-- Reviews / audit / AI
CREATE INDEX idx_reviews_customer         ON reviews(customer_id);
CREATE INDEX idx_audit_logs_user          ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_conversations_user    ON ai_conversations(user_id, updated_at DESC);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- Branches: tìm kiếm theo tên
CREATE INDEX idx_branches_name_trgm       ON branches USING gin (name gin_trgm_ops);  -- cần pg_trgm
```

⚠ `idx_branches_name_trgm` cần extension `pg_trgm` — đã được bật trong `infrastructure/postgres/init.sql` ✔.
⚠ Bỏ `CREATE INDEX idx_inventory_sku` nếu áp dụng quyết định loại inventory khỏi MVP (index này thừa vì `sku` đã UNIQUE).

⚠ **Không tạo trùng:** `idx_vaccinations_next_due` (P-12), `idx_bookings_created` (P-21), `idx_loyalty_transactions_account` (P-27) và `uq_booking_items_staff_slot` (P-8) đã được định nghĩa ở migration khác — `P-39` **chỉ** bổ sung những index còn thiếu.

### `P-41` — Chống double-book resource

Xem **O.4**. Chỉ chặn trùng mốc thời gian chính xác; chặn overlap thật sự cần denormalize `resource_id` + `start_at`/`end_at` xuống `booking_items` và dùng exclusion constraint (như `P-9`).

---

# PHẦN 6 — APPENDIX

## 6.1 Ma trận trạng thái implementation

### Core Backend

| Module | Endpoint | Trạng thái | Ghi chú |
|---|---|---|---|
| Auth | `POST /auth/register` | `Implemented` | |
| Auth | `POST /auth/login` | `Implemented` | |
| Auth | `POST /auth/refresh` | `Implemented` ⚠ | Cần `P-1` |
| Auth | `POST /auth/logout` | `Implemented` ⚠ | Cần `P-1`; ⚠ không kiểm tra chủ token |
| RBAC | `GET /rbac/roles` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `POST /rbac/roles` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `GET /rbac/roles/{id}` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `PUT /rbac/roles/{id}` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `DELETE /rbac/roles/{id}` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `GET /rbac/permissions` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `POST /rbac/permissions` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `POST /rbac/roles/{roleId}/permissions` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `DELETE /rbac/roles/{roleId}/permissions/{permissionId}` | `Implemented` ⚠ | Cần `P-2` |
| RBAC | `PUT /rbac/permissions/{id}` | **Bị gỡ** | Không có trong source |
| Users | `GET /users/me` | `Implemented` | |
| Users | `PUT /users/me` | `Implemented` | |
| Users | `GET /users` | `Implemented` | |
| Users | `GET /users/{id}` | `Implemented` | |
| Users | `PATCH /users/{id}/status` | `Implemented` | |
| Users | `POST /users/{id}/roles` | `Implemented` ⚠ | Cần `P-2` |
| Users | `DELETE /users/{id}/roles/{roleId}` | **Bị gỡ** | Không có trong source |
| Medical | `GET /medical/records/pet/{petId}` | `Implemented` ⚠ | Không kiểm tra quyền sở hữu; không bọc envelope |
| Medical | `GET /medical/vaccinations/pet/{petId}` | `Implemented` ⚠ | Như trên |
| Medical | `POST /medical/records`, `GET/PUT /medical/records/{id}` | `Schema-supported` | |
| Medical | `POST /medical/vaccinations`, `PUT /medical/vaccinations/{id}` | `Schema-supported` | |
| Loyalty | `GET /loyalty/customer/{customerId}` | `Implemented` ⚠ | Entity sai bảng; IDOR; trả `null` |
| Loyalty | `POST /loyalty` | `Implemented` ⚠ | **Cần loại bỏ** — không có auth/validation |
| Loyalty | `/loyalty/me`, `/transactions`, `/earn`, `/redeem` | `Schema-supported` | |
| AI | `POST /ai/tips` | `Implemented` (stub) | Không gọi AI service; NPE nếu thiếu `question` |
| AI | conversations / messages / documents / chat | `Schema-supported` | |
| AI | `POST /ai/vision/analyze` | `Proposed` | Cần `P-36` |
| Analytics | `GET /analytics/dashboard` | `Implemented` (stub) | Trả số 0 cố định |
| Audit | `GET /audit` | `Implemented` ⚠ | Entity sai cột; thiếu `@PreAuthorize`; không phân trang — xem O.5 |
| Audit | `GET /audit/{id}` | `Schema-supported` | O.5 |
| Pets / Breeds | CRUD | `Schema-supported` | Chỉ có DTO |
| Species | CRUD | `Proposed` | Không có bảng `pet_species` |
| Staff | CRUD + skills | `Schema-supported` | |
| Schedules / Time slots | CRUD + available | `Schema-supported` | |
| Bookings | CRUD + state transitions | `Schema-supported` | Cần `P-8` |
| Promotions | CRUD + validate/redeem | `Schema-supported` | |
| Invoices | CRUD | `Schema-supported` | Entity sai cột; cần `P-24` |
| Reviews | CRUD + publish | `Schema-supported` | |
| Search | `GET /search` | `Proposed` | `pg_trgm` đã bật |
| Medicines / Prescriptions | CRUD | `Proposed` | Cần `P-16` |
| Inventory items / Stock movements | — | **Ngoài MVP, không có API** | O.6; mâu thuẫn với routing key `inventory.low-stock` đang có trong source |
| Branches | `GET/POST/PUT /branches`, `GET /branches/{id}`, `PATCH /branches/{id}/active` | `Schema-supported` | O.1; `SecurityConfig` đã `permitAll` GET |
| Service categories | `GET/POST/PUT /service-categories`, `GET /service-categories/{id}`, `DELETE /service-categories/{id}` | `Schema-supported` | O.2; không có `is_active` → `P-40` |
| Services | `GET/POST/PUT /services`, `GET /services/{id}`, `PATCH /services/{id}/active` | `Schema-supported` | O.3; cột là `base_price`, không phải `price` |
| Resources | `GET/POST/PUT /resources`, `GET /resources/{id}`, `PATCH /resources/{id}/available` | `Schema-supported` | O.4; cần `P-41` |

### Payment Service / Notification Service

| Endpoint | Trạng thái |
|---|---|
| Toàn bộ `/payments/**` | `Proposed` — chưa có controller |
| Toàn bộ `/notifications/**` | `Proposed` — chưa có controller |

## 6.2 Mâu thuẫn giữa tài liệu và CSDL (đã xử lý trong tài liệu này)

`docs/csdl_pet_manager.docx`, `docs/erd.md` và `docs/sequence-diagrams.md` mô tả target design. Bảng dưới liệt kê các điểm lệch đã được sửa trong contract này theo hướng **bám Flyway + source**.

| Nội dung | Tài liệu target | CSDL / source thật |
|---|---|---|
| Tên bảng appointment | `appointments`, `appointment_services` | `bookings`, `booking_items` |
| Lịch bác sĩ | `veterinarian_schedules` | `schedules` + `staff` |
| Loài/giống | `pet_species`, `pet_breeds` | `breeds` (chỉ); không có `pet_species` |
| Dị ứng/thuốc pet | `pet_allergies`, `pet_medications` | ❌ không có |
| Hồ sơ bệnh án | `medical_records.veterinarian_id`, `.appointment_id` | ❌ không có (chỉ `vet_name` text) |
| Coupon | `coupons`, `coupon_usages` | ❌ không có |
| Membership | `membership_tiers`, `user_memberships` | `loyalty_accounts.tier` (text) |
| Loyalty entity | `loyalty` | `loyalty_accounts` + `loyalty_transactions` |
| Invoice | `invoice_code`, `status`, `tax_amount`, `membership_discount` | `invoice_number`, ❌ `status`, ❌ `tax_amount` |
| Invoice FK payment | `invoices.payment_id` | Đã **xoá** bởi `V2__extract_payment_and_notification.sql` |
| Payment | `payment_code`, `gateway_transaction_id`, `refund_reason` | `invoice_code`; gateway id nằm ở `payment_transactions` |
| Notification | Cột `message`, bảng `notification_outbox` | Cột `body`; `notification_deliveries` + `outbox_events` |
| Refresh tokens | Có trong ERD | ❌ không có trong migration |
| Roles/permissions | Có trong ERD | ❌ không có trong migration |
| Audit log | `BIGSERIAL`, `actor_user_id`, `actor_type`, `before_data`/`after_data` | `UUID`, `user_id`, `old_value`/`new_value`; **không có** `actor_type` → `P-42` |
| Service | `services.price` | `services.base_price` |
| Service category | có `is_active` | **không có** `is_active` → `P-40` |
| Branch | không có index | không có index trên tên/tọa độ → `P-39` |
| Tên cột notification | `message` | `body` |
| Notification template | không có trong ERD | `notification_templates` (append-only theo `version`) |
| FK index | — | ⚠ 29/37 cột FK trong Core DB **không có index** → `P-39` |
| AI requests / tool calls / vision | Có trong ERD | ❌ không có |
| Conversation | `conversations`, `conversation_messages`, có `status`, `pet_id` | `ai_conversations`, `ai_messages`, ❌ `status`, ❌ `pet_id` |
| Access token TTL | `expiresIn: 900` | `86400000` ms = `expiresIn: 86400` (24 giờ) |
| Register response | Trả token pair | Trả token pair ✔ (đúng) |
| Error body | `errors: [{field, message}]` | `data: { field: message }` |
| Pagination | `content` ở top level | `data.content` (bọc trong `ApiResponse`) |
| Loyalty redeem | `idempotencyKey` trong body | Header `Idempotency-Key` |
| Review | `status: PUBLISHED/HIDDEN/FLAGGED` | `is_published BOOLEAN` |
| Review request | Có `veterinarianId`, `serviceId` | ❌ không có cột |
| API Gateway | Được mô tả như đang có | Thư mục rỗng, không có trong `docker-compose.yml` |

## 6.3 HTTP status codes

| Code | Sử dụng |
|---|---|
| `200 OK` | Thành công (GET, PUT, PATCH) |
| `201 Created` | Tạo mới thành công (POST) |
| `202 Accepted` | Đã nhận, xử lý bất đồng bộ (webhook) |
| `204 No Content` | Xóa thành công (DELETE) |
| `400 Bad Request` | Validation error, JSON sai cú pháp, UUID sai định dạng *(hiện chưa xử lý đúng — §0.5)* |
| `401 Unauthorized` | Token hết hạn, thiếu token, chữ ký webhook sai |
| `403 Forbidden` | Đã xác thực nhưng không đủ quyền |
| `404 Not Found` | Resource không tồn tại |
| `409 Conflict` | Trùng lịch, duplicate resource, vi phạm unique, idempotency conflict |
| `413 Payload Too Large` | Upload vượt giới hạn |
| `415 Unsupported Media Type` | Content type không hợp lệ |
| `422 Unprocessable Entity` | Business rule violation (VD: booking chưa completed, account không ACTIVE) |
| `429 Too Many Requests` | Rate limit *(chưa cấu hình)* |
| `500 Internal Server Error` | Lỗi server không lọc được |
| `502 Bad Gateway` | AI service hoặc payment gateway lỗi *(cần handler riêng)* |
| `504 Gateway Timeout` | AI service hoặc payment gateway timeout *(cần handler riêng)* |

## 6.4 Common query parameters

Chỉ áp dụng cho endpoint **đã hỗ trợ** phân trang/sắp xếp. Endpoint `Implemented` chưa dùng các param này thì không được ghi vào contract của nó.

| Parameter | Kiểu | Mặc định | Mô tả |
|---|---|---|---|
| `page` | int | `0` | Trang hiện tại (0-indexed) |
| `size` | int | `20` | Số item/trang |
| `sortBy` | string | Theo endpoint | Tên field entity |
| `direction` | string | `desc` | `asc` / `desc` |
| `search` | string | — | Tìm kiếm chuỗi |
| `status` | string | — | Lọc theo trạng thái |
| `role` | string | — | `GET /users` |
| `isRead` | boolean | — | `GET /notifications` |
| `dateFrom` / `dateTo` | date | — | Khoảng thời gian |

⚠ Core **không** dùng format `sort=field,dir` như bảng cũ gợi ý — `UserController` dùng hai param riêng `sortBy` và `direction`.

## 6.5 Quy tắc nhất quán trạng thái giữa các module

| Aggregate | Trạng thái | Nguồn |
|---|---|---|
| `users.status` | `ACTIVE` / `INACTIVE` / `LOCKED` | ⚠ không CHECK; quy ước từ `UserPrincipal` |
| `bookings.status` | `PENDING` / `CONFIRMED` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED` / `NO_SHOW` | ⚠ chưa có CHECK → `P-8` |
| `booking_items.status` | như trên | ⚠ chưa có CHECK → `P-8` |
| `invoices.status` | `ISSUED` / `PENDING_PAYMENT` / `PAID` / `PARTIALLY_PAID` / `CANCELLED` / `REFUNDED` | ❌ chưa có cột → `P-24` |
| `payments.status` | `PENDING` / `PROCESSING` / `PAID` / `FAILED` / `PARTIALLY_REFUNDED` / `REFUNDED` / `CANCELLED` | ✔ CHECK trong Payment DB |
| `payment_transactions.status` | `PENDING` / `SUCCESS` / `FAILED` | ✔ CHECK |
| `payment_transactions.transaction_type` | `AUTHORIZE` / `CAPTURE` / `PAYMENT` / `REFUND` / `VOID` / `FAILURE` | ✔ CHECK |
| `notifications.status` | `PENDING` / `PROCESSING` / `SENT` / `PARTIALLY_SENT` / `FAILED` / `CANCELLED` | ✔ CHECK |
| `notification_deliveries.status` | `PENDING` / `PROCESSING` / `SENT` / `FAILED` / `DEAD_LETTERED` | ✔ CHECK |
| `notification_deliveries.channel` | `EMAIL` / `SMS` / `PUSH` / `IN_APP` | ✔ CHECK |
| `notification_templates.channel` | `EMAIL` / `SMS` / `PUSH` / `IN_APP` | ✔ CHECK |
| `loyalty_transactions.type` | `EARN` / `REDEEM` / `ADJUST` / `EXPIRE` | ⚠ chưa có CHECK → `P-27` |
| `reviews` trạng thái | `is_published BOOLEAN` | ✔ cột có, không có enum |

**Quy tắc bất biến**

1. **Trạng thái tiền thật chỉ nằm ở Payment Service.** Core chỉ suy ra trạng thái invoice qua event.
2. **Trạng thái notification chỉ nằm ở Notification Service.** Core không đọc Notification DB.
3. **Không có foreign key xuyên database.** `payments.invoice_id`, `notifications.user_id/invoice_id/payment_id` đều là UUID tham chiếu logic.
4. **Monotonicity:** payment status không bao giờ hạ trạng thái (M.8).
5. **Append-only:** `payment_transactions`, `loyalty_transactions`, `audit_logs` không có API sửa/xoá.

## 6.6 ID và quy tắc database ownership

| ID | Sinh bởi | Lưu ở | Ghi chú |
|---|---|---|---|
| `users.id` | Core DB | Core | FK thật trong Core |
| `pets.id` | Core DB | Core | FK thật |
| `staff.id` | Core DB | Core | FK thật |
| `schedules.id`, `time_slots.id` | Core DB | Core | FK thật |
| `bookings.id` | Core DB | Core; `payments.appointment_id`, `notifications.appointment_id` | Ở service khác chỉ là UUID |
| `invoices.id` | Core DB | Core; `payments.invoice_id` (UNIQUE), `notifications.invoice_id` | **Không FK** |
| `invoices.invoice_number` | Core DB | Core; `payments.invoice_code` | Dùng để đối soát |
| `payments.id` | Payment DB | Payment; `notifications.payment_id` | **Không FK** |
| `promotions.id` | Core DB | Core (`bookings.promotion_id` FK thật) | |
| `loyalty_accounts.id` | Core DB | Core | `user_id UNIQUE` |
| `documents.id`, `ai_conversations.id` | Core DB | Core | |

**Quy tắc bắt buộc**

- Core **không** được cấu hình DataSource trỏ tới Payment DB hoặc Notification DB (hiện `application.yml` chỉ có 1 datasource ✔).
- Payment/Notification **không** được thêm entity JPA trỏ tới bảng của Core.
- Xác minh cross-service ID **luôn** qua event đã xác minh hoặc gọi internal API — không dựa vào FK.
- `pets.owner_id` là FK thật; ai cũng phải kiểm tra nó khi tạo booking.

## 6.7 RabbitMQ — outbox, inbox, idempotency, retry

| Khái niệm | Core | Payment | Notification |
|---|---|---|---|
| `outbox_events` | ❌ | ✔ | ✔ |
| `inbox_events` | ❌ | ✔ | ✔ |
| Publisher (`RabbitTemplate`) | ✔ bean | ❌ | ❌ |
| Consumer (`@RabbitListener`) | ❌ | ❌ | ❌ |
| Listener retry config | ✔ (3 attempts) | ❌ | ❌ |
| DLX | ✔ `petcare.dlx` | ❌ | ❌ |
| Import definitions | ❌ (`definitions.json` rỗng) | — | — |

**Topology đã khai báo trong `RabbitMQQueues` + `RabbitMQConfig`**

| Exchange | Queue | Routing key |
|---|---|---|
| `petcare.booking` | `booking.created` | `booking.created` |
| `petcare.booking` | `booking.confirmed` | `booking.confirmed` |
| `petcare.booking` | `booking.cancelled` | `booking.cancelled` |
| `petcare.booking` | `booking.completed` | `booking.completed` |
| `petcare.booking` | `booking.started` | `booking.started` |
| `petcare.invoice` | `invoice.issued` | `invoice.issued` |
| `petcare.payment` | `payment.completed` | `payment.completed` |
| `petcare.payment` | `payment.failed` | `payment.failed` |
| `petcare.payment` | `payment.refunded` | `payment.refunded` |
| `petcare.notification` | `notification.send` | `notification.send` |
| `petcare.inventory` | `inventory.low-stock` | `inventory.low-stock` |
| `petcare.review` | `review.created` | `review.created` |
| `petcare.medical` | `vaccination.due` | `vaccination.due` |
| `petcare.loyalty` | `loyalty.points-earned` | `loyalty.points-earned` |

Tất cả exchange/queue là `durable` và không `auto-delete`. Mỗi queue khai báo `x-dead-letter-exchange = petcare.dlx` và `x-dead-letter-routing-key = <routing-key>.dlq`.

**Điểm nhất quán đã kiểm tra**

- ✅ Mỗi consumer có queue riêng — `RabbitMQQueues` khai báo từng queue riêng biệt.
- ✅ Idempotency DB-level: `inbox_events.event_id PK`, `payment_transactions.idempotency_key UNIQUE`, `uq_*_provider_event`, `uq_*_provider_tx`, `payments.invoice_id UNIQUE`.
- ✅ Retry: Core có `spring.rabbitmq.listener.retry`; Payment/Notification **chưa có**.
- ⚠ Publisher/consumer **chưa implement** — không được tuyên bố event đang chạy.
- ⚠ Core **chưa có** outbox ⇒ không thể phát event tin cậy từ Core ⇒ `P-20` là blocker cho toàn bộ event-driven flow.

## 6.8 API Gateway routing

⚠ **Chưa triển khai.** `services/api-gateway/` gồm 4 file 0 byte và không có trong `docker-compose.yml`.

**Routing đề xuất khi xây dựng (Spring Cloud Gateway):**

| Path prefix | Đích | Rewrite |
|---|---|---|
| `/api/v1/payments/**` | `http://payment-service:8082` | `/api/v1/payments/**` |
| `/api/v1/notifications/**` | `http://notification-service:8083` | `/api/v1/notifications/**` |
| `/api/v1/**` | `http://backend:8080` | `/api/v1/**` |
| `/actuator/health` | phục vụ container healthcheck | — |

⚠ Gateway phải **không** định tuyến `/payments/webhooks/**` qua auth JWT (webhook dùng chữ ký provider).

## 6.9 Chưa thể kết luận vì thiếu cấu hình/source

| Hạng mục | Vì sao chưa kết luận |
|---|---|
| Thời hạn access token "chính thức" | `AuthService` fallback `900000` vs `application.yml` `86400000` — cần chốt một giá trị |
| Tỉ lệ earn point theo tier | Không có `loyalty_tiers`, không có hằng số trong source |
| Tỉ lệ thuế invoice | Không có cột, không có cấu hình |
| Số giờ tối thiểu để hủy booking | Không có cấu hình, không có cột |
| Số lần retry tối đa cho notification | Không có cấu hình |
| Backoff schedule cho notification | Không có cấu hình |
| Giới hạn kích thước file upload (RAG / Vision) | Không có cấu hình |
| MIME type cho phép (RAG / Vision) | Không có cấu hình |
| Timeout gọi AI services / payment gateway | Không có cấu hình |
| Rate limit theo user/endpoint | Không có cấu hình |
| Cơ chế xác thực service-to-service cho Notification | Chưa chọn phương án (A/B/C) |
| Webhook secret provider | Không có cấu hình |
| Rate limit AI theo user | Không có |
| ~~`@EnableJpaAuditing`~~ | ✅ Đã bật trong `PetCareApplication`; `BaseEntity` được Spring Data quản lý `created_at`/`updated_at`/`version` |
| Số liệu validate `UpdateUserRequest` | Không có annotation nào |
| Có `PUT /rbac/permissions/{id}` không | Không có trong source — đã gỡ khỏi contract |
| Có `DELETE /users/{id}/roles/{roleId}` không | Không có trong source — đã gỡ khỏi contract |

## 6.10 Danh sách API chưa được triển khai

**Core Backend — schema có, API chưa có (ngoài các endpoint `Implemented` ở §6.1):**

`GET/POST/PUT /branches`, `GET /branches/{id}`, `PATCH /branches/{id}/active` (O.1) · `GET/POST/PUT /service-categories`, `GET /service-categories/{id}`, `DELETE /service-categories/{id}` (O.2) · `GET/POST/PUT /services`, `GET /services/{id}`, `PATCH /services/{id}/active` (O.3) · `GET/POST/PUT /resources`, `GET /resources/{id}`, `PATCH /resources/{id}/available` (O.4) · `GET/audit/{id}` (O.5) · `GET/POST/PUT /breeds`, `GET/POST/PUT /staff/**`, `GET/POST/PUT/PATCH /staff/{id}/skills/**`, `GET/POST/PUT/DELETE /schedules/**`, `GET /schedules/slots/available`, `GET/POST /bookings/**`, `POST /bookings/{id}/{confirm|cancel|start|complete}`, `GET/POST/PUT/PATCH /promotions/**`, `POST /promotions/validate`, `POST /promotions/redeem`, `GET/POST/PUT /invoices/**`, `GET /invoices/by-booking/{bookingId}`, `GET /audit/{id}`, `GET /analytics/{revenue|appointments|services|veterinarians}`, `GET /ai/conversations`, `POST /ai/conversations`, `GET /ai/conversations/{id}`, `GET /ai/conversations/{id}/messages`, `POST /ai/chat`, `GET/POST/DELETE /ai/documents`, `POST /medical/records`, `GET/PUT /medical/records/{id}`, `POST/PUT /medical/vaccinations`, `GET /loyalty/me`, `GET /loyalty/me/transactions`, `POST /loyalty/earn`, `POST /loyalty/redeem`, `GET/POST /reviews/**`, `PATCH /reviews/{id}/publish`, `PATCH /reviews/{id}/unpublish`.

**Core Backend — API và schema đều chưa có:**

`GET /api/v1/species`, `GET /api/v1/search`, `GET/POST/PUT /api/v1/medicines/**`, `GET/POST /api/v1/prescriptions/**`, `GET/POST/PUT /api/v1/coupons/**`, `POST /api/v1/coupons/validate`, `GET/POST/PUT /api/v1/membership/tiers`, `POST /api/v1/membership/redeem`, `GET /api/v1/ai/requests/**`, `POST /api/v1/ai/vision/analyze`.

**Payment Service:** toàn bộ — `POST /payments`, `GET /payments/{id}`, `GET /payments/by-invoice/{invoiceId}`, `GET /payments`, `GET /payments/{id}/transactions`, `POST /payments/{id}/refunds`, `POST /payments/webhooks/{provider}`.

**Notification Service:** toàn bộ — `GET /notifications`, `GET /notifications/{id}`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`, `GET /notifications/unread-count`, `POST /notifications`, `POST /notifications/{id}/retry`, `GET /notifications/{id}/deliveries`, `POST /notifications/deliveries/{deliveryId}/retry` (N.13), `GET/POST/PATCH /notification-templates` (N.12).

**Không có API (theo thiết kế):** `inventory_items` / `stock_movements` (ngoài MVP — O.6) · `inbox_events` / `outbox_events` (bảng kỹ thuật nội bộ — O.7).

**API Gateway:** toàn bộ.