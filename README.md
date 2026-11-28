# PetCare — hệ thống đặt lịch và chăm sóc thú cưng

PetCare là đồ án quản lý phòng khám/chăm sóc thú cưng. Khách hàng tạo hồ sơ thú cưng, đặt và theo dõi lịch, thanh toán, xem bệnh án và hóa đơn. Lễ tân tiếp đón và thu ngân; bác sĩ xử lý ca khám; Owner quản lý nhân sự, ca, dịch vụ và khuyến mãi; Admin quản lý tài khoản, vai trò và audit.

## Cấu trúc dự án

| Thư mục | Nội dung |
| --- | --- |
| `web/` | React + Vite; giao diện khách hàng và các vai trò vận hành |
| `mobile/` | Ứng dụng Expo/React Native; chạy riêng, không nằm trong Docker Compose |
| `services/backend/` | Spring Boot core: tài khoản, thú cưng, lịch, y tế, hóa đơn, ưu đãi |
| `services/payment-service/` | Thanh toán VietQR và webhook SePay |
| `services/notification-service/` | Thông báo trong ứng dụng và email |
| `services/api-gateway/` | Cổng API cho web |
| `ai/` | RAG và các dịch vụ AI đang phát triển |
| `infrastructure/`, `scripts/` | Cấu hình cơ sở dữ liệu, dữ liệu kiểm thử và công cụ hỗ trợ |
| `docs/` | Kiến trúc, hợp đồng API và hướng dẫn kiểm thử chi tiết |

PostgreSQL của core, payment và notification dùng ba volume Docker riêng. Backend dùng Flyway để cập nhật schema. RabbitMQ chuyển sự kiện giữa các service; Redis phục vụ backend.

## Chạy local bằng Docker Desktop

Yêu cầu: Docker Desktop với Docker Compose. Mở terminal tại thư mục gốc dự án:

```powershell
Copy-Item .env.example .env
```

Sửa `.env` trước khi chạy: đặt mật khẩu database/RabbitMQ, `JWT_SECRET` và `INTERNAL_API_KEY` riêng. Để gửi mã đăng ký/quên mật khẩu bằng Gmail, điền `MAIL_USERNAME` và **Mật khẩu ứng dụng Google** vào `MAIL_PASSWORD`. Để thanh toán VietQR, điền tài khoản nhận tiền và `SEPAY_API_KEY`; webhook SePay cần URL công khai trỏ tới `/api/v1/webhooks/sepay` trên payment service. Không commit `.env` hay mật khẩu tài khoản kiểm thử.

```powershell
docker compose up -d --build --wait
```

| Địa chỉ local | Mục đích |
| --- | --- |
| `http://localhost:3000` | Web (cũng có tại cổng 80) |
| `http://localhost:8000` | API Gateway |
| `http://localhost:8080/swagger-ui.html` | Tài liệu API core |
| `http://localhost:15672` | RabbitMQ Management |
| `localhost:5432`, `5433`, `5434` | PostgreSQL core, payment, notification |

Các cổng 8080, 8082 và 8083 lần lượt là core, payment và notification. Có thể xem trạng thái bằng `docker compose ps` hoặc chạy kiểm tra chỉ đọc:

```powershell
python scripts/check-services.py
```

`start.ps1` hoặc `start.bat` cũng có thể dùng trên Windows; cả hai gọi Docker Compose. Dữ liệu nằm trong volume Docker, nên `docker compose down` không xóa database. Không dùng `down -v` nếu muốn giữ dữ liệu.

## Tài khoản và kiểm thử

- Khách hàng có thể đăng ký trên web; tài khoản chỉ được tạo sau khi nhập mã gửi qua email.
- Các vai trò là `CUSTOMER`, `STAFF`, `VETERINARIAN`, `OWNER`, `ADMIN`. Tài khoản vận hành không được tạo từ form đăng ký công khai; Admin gán vai trò trong bảng điều khiển.
- Nếu cần khởi tạo dữ liệu demo trên máy local, xem [hướng dẫn đặt lịch thử](docs/try-booking-demo.md). Script bootstrap trong tài liệu có thể tạo Admin demo sau khi cấu hình SMTP.
- `TAI_KHOAN_KIEM_THU.local.txt` và `.env` bị Git bỏ qua. Mỗi máy cần tự chuẩn bị tài khoản kiểm thử; repo không chứa mật khẩu thật.

Build mã nguồn mà không cần khởi chạy lại Docker:

```powershell
npm.cmd --prefix web ci
npm.cmd --prefix web run build
cd services/backend
.\mvnw.cmd -DskipTests test-compile
```

Web cần Node.js 20; backend cần Java 21. Khi muốn chạy test tích hợp, vào `services/backend/` và chạy `.\mvnw.cmd test`; Testcontainers sẽ tạo container tạm nên Docker Desktop phải đang hoạt động. Kiểm thử web bổ sung: chạy `node test-dash.mjs` từ thư mục `web/`; `node scripts/check-web-login.mjs` chạy từ thư mục gốc và cần môi trường web/backend phù hợp.

## Trạng thái AI

Core đã có `/api/v1/ai/tips` để nhận câu hỏi và chuẩn bị gợi ý đặt lịch. Dịch vụ `ai/rag` có truy xuất pgvector và gọi mô hình, nhưng cần API key cùng dữ liệu embedding để hoạt động. `ai/agent`, `ai/vision` và `ai/recommendation` hiện là stub; kết quả mẫu của chúng không được xem là chẩn đoán hay gợi ý thật.

## Tài liệu thêm

- [Kiến trúc](docs/architecture.md) · [Hợp đồng API](docs/api-contracts.md) · [Sơ đồ dữ liệu](docs/erd.md)
- [Danh mục dịch vụ](docs/care-services.md) · [Xác nhận email](docs/email-verification.txt) · [Thanh toán và AI](docs/merge-ai-payment.md)
