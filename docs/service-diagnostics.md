# Kiểm tra Docker và đăng nhập web — 19/11/2026

Sau lượt kiểm tra này, giao diện khách hàng và trang đăng nhập đã được thiết kế lại.
Hành vi và kết quả xác minh mới nằm ở [customer-ui-verification.md](customer-ui-verification.md):
đăng nhập khách hàng về trang chủ; mục **Bảng điều khiển** mở khu vực quản lý.

## Lỗi đăng nhập đã tái hiện và sửa

Mở web tại `http://192.168.100.155:3000`, bấm đăng nhập: trình duyệt
gọi `http://localhost:8000/api/v1/auth/login`. Preflight trả 403 và
`PreflightMissingAllowOriginHeader`. Giao diện hiển thị:
“Không thể kết nối đến máy chủ backend (http://localhost:8000). Vui lòng kiểm tra dịch vụ.”
Healthcheck vẫn UP vì nó không kiểm tra luồng này trong trình duyệt.

Bản Docker của web hiện dùng đường dẫn tương đối `/api/v1` cho core,
payment và notification. Nginx chuyển tiếp `/api/` đến `api-gateway:8000`;
trình duyệt gọi cùng origin của web. Cấu hình nằm ở `web/nginx.conf`,
`web/Dockerfile`, `docker-compose.yml`, `.env.example` và `.env` cục bộ.
Origin của trình duyệt không được chuyển tiếp vào mạng container;
các request qua web không cần CORS giữa trình duyệt và cổng 8000.
Nginx không cấp quyền đọc phản hồi cho website bên ngoài qua CORS.

Đã kiểm tra bằng Edge headless trên cả `localhost:3000` và IP LAN:

- Đăng ký tài khoản kiểm thử: HTTP 201.
- Đăng nhập: HTTP 200, có phiên đăng nhập và chuyển tới `/dashboard`.
- Đọc hồ sơ `/api/v1/users/me` và số thông báo chưa đọc: HTTP 200, `success: true`.
- Sai thông tin đăng nhập: HTTP 401 và thông báo đúng trên form.

Bốn tài khoản kiểm thử được tạo trong quá trình này đã được dọn cùng dữ liệu phiên.
Không thay đổi mật khẩu tài khoản có sẵn.

## Lỗi dashboard trắng sau đăng nhập

Sau lần kiểm tra kết nối đầu tiên, người dùng cung cấp lỗi
`ReferenceError: collapsed is not defined`. Đã tái hiện bằng `node web/test-dash.mjs`:
`Sidebar.NavItem` đọc biến `collapsed` ngoài phạm vi của nó, làm cả dashboard
ngừng render. Mọi mục điều hướng đều gặp lỗi, kể cả khi không có mục con.

Đã bỏ tham chiếu sai trong JSX và dùng selector `.sidebar--collapsed` có sẵn
để ẩn mũi tên điều hướng khi thu gọn. Kiểm tra render mở rộng/thu gọn,
có/không có mục con và toàn bộ portal đều đạt. Test SSR cũ chỉ in lỗi rồi
trả exit code 0; hiện test trả lỗi đúng nếu render thất bại.

Bài kiểm tra trình duyệt trước đó xác nhận URL, token và API nhưng chưa bắt
lỗi render. `scripts/check-web-login.mjs` hiện bắt uncaught exception và
kiểm tra nội dung dashboard/menu sau đăng ký, đăng nhập, và từ landing page
bấm đăng nhập khi đã lưu phiên. Đã chạy đạt trên bản web Docker mới,
kiểm tra trực quan ảnh `logs/dashboard-after-fix.png` ở 1440 × 900.

Việc tự chuyển `/login` sang `/dashboard` khi còn phiên đăng nhập là hành vi
hiện có của portal; nguyên nhân trang trắng là lỗi JSX nêu trên.

## Các lỗi cấu hình và phản hồi khác đã sửa

| Vấn đề | Thay đổi |
| --- | --- |
| CORS chỉ chấp nhận `localhost:3000`, chặn web ở cổng 80 và `127.0.0.1` | Đồng bộ cấu hình local cho các service, truyền biến CORS từ Compose |
| Swagger dùng `/api-docs` nhưng security chỉ cho `/v3/api-docs`; gateway không route `/api-docs` | Cho phép và route đúng đường dẫn tài liệu hiện tại |
| Image backend chứa tới V10 trong khi database đã tới V11 | Build lại image từ mã nguồn hiện tại, giữ nguyên database volume |
| `ResponseStatusException` ở API nội bộ bị catch-all đổi thành HTTP 500 | Giữ nguyên HTTP 401/404 và response envelope; payment phân biệt được bản ghi không tồn tại |
| Tạo hồ sơ khám/tiêm phòng trả HTTP 200 nhưng body ghi 201 | Trả HTTP 201, kiểm tra bằng test nghiệp vụ bác sĩ |
| Gateway có thể sẵn sàng trước payment-service | Chờ payment-service healthy |
| Healthcheck Java cách nhau 30 giây, script báo sẵn sàng quá sớm | Kiểm tra mỗi 5 giây; script dùng `--wait --wait-timeout 180` |
| Script PowerShell tiếng Việt không có BOM gây lỗi parse trên Windows PowerShell | Lưu UTF-8 BOM, kiểm tra lại bằng PowerShell parser |
| Build web gửi cả `node_modules`/`dist` vào Docker | Thêm `web/.dockerignore` |

## Kết quả xác minh

- 14 container đang chạy; 9 container có Docker healthcheck đều healthy.
- Bộ test backend: **30 test, 0 lỗi, 0 bỏ qua**, dùng database/broker Testcontainers riêng.
- `cd web; node test-dash.mjs`: các trường hợp sidebar và render portal đạt.
- `python scripts/check-services.py`: **42/42** kiểm tra đạt, gồm API qua cổng web.
- Kiểm tra cấu hình Compose, `nginx -t`, PowerShell parser và `git diff --check` đạt.
- Các request HTTP trong lượt kiểm tra cuối thường khoảng 2–109 ms trên máy này;
  đây là đo kiểm tra đơn lẻ, chưa phải kết quả kiểm thử tải.

`success: false` đi cùng HTTP 401 ở API cần token là kết quả từ chối truy cập đúng.
Mở `/api/v1` hoặc cổng API trực tiếp không thay thế thao tác đăng nhập.
Dùng `/actuator/health` để kiểm tra service và `/api/v1/services` để thử API công khai.

## Cách chạy lại

Mở Docker Desktop, chạy `start.bat` hoặc `start.ps1` từ thư mục dự án.
Web: `http://localhost:3000`. Swagger: `http://localhost:8000/swagger-ui.html`.
Sau khi nhận bản web mới, tải lại bằng Ctrl+F5 để thay bundle JavaScript cũ.

Khi cần kiểm tra riêng sau khi đã build:

```powershell
docker compose up -d --no-build --wait --wait-timeout 180
python scripts/check-services.py
```

Script `scripts/check-web-login.mjs` dùng Chrome DevTools Protocol trên cổng 9222,
không cần cài thư viện trình duyệt. Mặc định chỉ thử thông tin đăng nhập sai;
`--register` tạo một tài khoản kiểm thử mới, cần dọn tài khoản sau khi chạy.

## Giới hạn kiểm tra

Đây là kiểm tra khởi động, kết nối, một số luồng backend và đăng nhập web,
chưa phải xác nhận toàn bộ chức năng của dự án. Bốn AI service hiện trả dữ liệu
stub theo mã nguồn. Chưa thử thanh toán SePay thực tế, SMTP thực tế, ứng dụng mobile,
hoặc mọi luồng nghiệp vụ trên giao diện. Thông báo npm khi build còn báo 4 vấn đề
dependency (2 moderate, 2 high); chưa cập nhật dependency trong lượt sửa kết nối này.
