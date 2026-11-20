# Gộp AI và thanh toán, giữ giao diện PetCare

Nhánh tích hợp: `integration/minhduc-nguyentam`. Giữ landing, login và dashboard
khách hàng của `minhduc`; đưa nghiệp vụ từ `origin/nguyentam` vào các màn hình này.
Không chọn toàn bộ “ours” hoặc “theirs” cho frontend.

## Những điểm đã ghép

- AI giữ định dạng API `{ success, data }`, nhận người dùng từ phiên đăng nhập.
  Khách có thể hỏi AI; đề xuất đặt lịch yêu cầu đăng nhập và có hồ sơ thú cưng.
- Dashboard đọc `answer` và `bookingForm`. Đề xuất mở BookingWizard đang dùng;
  người dùng kiểm tra dịch vụ, ngày, giờ, ghi chú, giá và xác nhận trước khi tạo lịch.
  Giá lấy từ danh mục dịch vụ, không lấy giá ước tính của AI.
- Thêm quản lý khuyến mãi cho OWNER/ADMIN, hiển thị khoản giảm trong lịch hẹn,
  hủy lịch chưa thanh toán qua API hiện có. Backend tiếp tục quyết định quyền
  hủy và thời hạn cho phép hủy.
- Giữ VietQR/SePay và các sửa lỗi payment từ nhánh hiện tại. Hai commit mới bên
  `nguyentam` không có thay đổi trong `services/payment-service`.
- Giữ đủ thời lượng lịch: dịch vụ dài giữ nhiều ô liên tiếp và trả lại toàn bộ
  ô khi hủy. Xem [danh mục chăm sóc](care-services.md).
- Giữ cấu hình web gọi gateway qua `/api/v1`. Tăng thời gian chờ proxy lên 130 giây
  để phù hợp backend AI có thời gian chờ 120 giây.

## Cấu hình AI trên mỗi máy

Git không chuyển database, Docker volume hay API key của máy bạn kia sang máy này.

1. Điền `OPENROUTER_API_KEY` và `GROQ_API_KEY` trong `.env` cục bộ. Không gửi key
   qua chat, không commit `.env`.
2. Với volume PostgreSQL đã tồn tại, `init.sql` không tự chạy lại. Các lệnh dưới
   dùng tài khoản PostgreSQL mặc định; thay `petcare` nếu máy bạn dùng tên khác.

```powershell
Get-Content -Raw infrastructure/postgres/init.sql | docker exec -i petcare-backend-postgres psql -U petcare -d petcare -v ON_ERROR_STOP=1
Get-Content -Raw ai/rag/pgvector_bundle/pgvector_schema.sql | docker exec -i petcare-backend-postgres psql -U petcare -d pet_rag -v dim=2048 -v ON_ERROR_STOP=1
docker compose up -d --build --force-recreate ai-rag
```

3. Nạp tài liệu bằng cấu hình embedding cùng model và số chiều của dịch vụ RAG.
   Bước này gọi nhà cung cấp embedding, dùng quota API; chỉ chạy sau khi đã cấu
   hình key và thống nhất nguồn dữ liệu. Hoặc chuyển bản sao database `pet_rag`
   đã ingest từ máy bạn kia, kèm cấu hình model tương ứng.

```powershell
docker cp ai/rag/processed_pet_chunks.json petcare-ai-rag:/tmp/processed_pet_chunks.json
docker compose exec -T ai-rag python pgvector_bundle/embed_pgvector.py --chunks /tmp/processed_pet_chunks.json --skip-existing
```

Kiểm tra `http://localhost:8002/health`: `database=ok`, `docs>0`, hai giá trị
`configured` đều `true`, `status=ok`. Đây là kiểm tra cấu hình/dữ liệu; vẫn cần
hỏi thử một câu để kiểm chứng nhà cung cấp AI hoạt động. Container đang chạy
không có nghĩa là mô hình AI đã sẵn sàng.

Máy kiểm tra hiện đã tạo database `pet_rag` và bảng trống, chưa cấu hình hai key
và chưa ingest. Vì vậy health RAG báo `degraded` đúng trạng thái thực tế.

## Dữ liệu lịch và thanh toán

Không chạy `seed_full_schedule_8am_5pm.sql` trên dữ liệu đang dùng: script xóa
toàn bộ lịch/khung giờ, phân lại kỹ năng và đổi mọi dịch vụ thành 30 phút.
`seed_accounts.sql` chứa tài khoản demo; không chạy để ghi đè tài khoản hiện có.
`seed_services_and_schedules.sql` dùng ID nhân viên cố định và có thể cập nhật
giá dịch vụ theo dữ liệu mẫu. Các script này cần điều chỉnh cho dữ liệu thực tế
trước khi sử dụng. Chúng không được tự chạy trong bước gộp này.

Danh mục dịch vụ và lịch nhân viên phải được cấu hình trong database. Luồng đặt
lịch trên trình duyệt đã được kiểm tra bằng phản hồi dịch vụ/giờ trống có kiểm
soát, không phải bằng cách tạo thêm dịch vụ hay lịch mẫu trong dữ liệu hiện tại.

Payment cần cấu hình tài khoản ngân hàng và webhook SePay riêng từng môi trường.
Đã kiểm tra các API payment qua gateway và nghiệp vụ tính giá, áp mã, ghi nhận
thanh toán tại quầy ở backend; chưa kiểm thử chuyển tiền ngân hàng thật hoặc
webhook SePay trực tiếp.

## Xác minh và hoàn tất merge

- Frontend build và kiểm tra render landing, dashboard, quản lý khuyến mãi qua.
- 50/50 kiểm thử backend qua sau khi bổ sung dịch vụ chăm sóc, gồm quyền sở hữu lịch, đặt trùng giờ, hóa đơn, thanh toán
  tại quầy kết hợp mã giảm giá, hủy lịch và ba trường hợp hồi quy AI/thời lượng mới.
- 42/42 kiểm tra service, gateway và CORS qua. Các kiểm tra này không khẳng định
  RAG đã có key, tri thức hoặc kết nối được nhà cung cấp mô hình.
- Trình duyệt kiểm tra đăng nhập, tạo/sửa thú cưng bằng API thật; đặt/hủy lịch
  và đề xuất AI bằng phản hồi có kiểm soát. Giao diện kiểm tra ở 1440 và 390 px.
- AI khách nhận yêu cầu đặt lịch bằng backend thật và trả hướng dẫn đăng nhập.
- Kiểm tra giao diện độc lập kết luận `ship` cho lỗi hiển thị câu trả lời/nút đề
  xuất AI sau khi sửa. Nút đề xuất được kiểm tra nằm trọn trong khung chat trên
  điện thoại; cuộn lên đọc lịch sử sẽ tạm dừng việc tự cuộn.
- Detector chỉ ghi nhận gradient chữ có sẵn ở landing; giữ theo yêu cầu bảo toàn
  thiết kế landing của người dùng. Ba tài khoản và ba hồ sơ thú cưng kiểm thử đã dọn.

- Payment giữ nguyên V1/V2/V3 từ `origin/nguyentam`, thay baseline V4 cũ bằng
  marker không tạo lại bảng. Bảy kiểm thử PostgreSQL qua, bao gồm nâng cấp dữ liệu
  từ hai nhánh và sửa các thiết lập cột còn thiếu cho callback SePay. Hướng dẫn
  chuyển tiếp database cũ: [payment migration](flyway-baseline-payment-service.md).

### File đã dọn

- Bỏ `web/src/components/AiBookingForm.jsx`: không có nơi gọi; luồng đề xuất AI
  đã dùng BookingWizard hiện tại.
- Bỏ `web/public/corgi-bg.png`: không có tham chiếu trong mã nguồn; giữ ảnh landing
  và ảnh nền husky đang dùng.
- Đưa V2/V3 từ đuôi `.sql.bak` về đúng tên migration, chuyển V4 cũ ra thư mục chạy
  Flyway để lưu đối chiếu/kiểm thử. Không xóa migration đã áp dụng.
- Bỏ mục `.github` bị lặp trong `.gitignore`. Backup database ở `.local-backups/`
  và file tài khoản kiểm thử cục bộ được giữ ngoài Git.

### Các bước còn lại

Nhánh đang tích hợp `origin/nguyentam` tại commit `4abfed0`. Sau khi cả hai xem lại
nhánh tích hợp và hoàn tất cấu hình/dữ liệu cần dùng, kiểm tra không còn file xung
đột và lỗi khoảng trắng:

```powershell
git status
git diff --name-only --diff-filter=U
git diff --cached --check
git commit -m "Merge PetCare AI and payments while preserving portal design"
git push -u origin integration/minhduc-nguyentam
```

Mở Pull Request vào nhánh mà cả hai thống nhất, cùng duyệt UI và nghiệp vụ trước
khi merge. Nếu hai người tiếp tục làm trên `minhduc`, chọn base `minhduc`, compare
`integration/minhduc-nguyentam`; nếu dùng `main`, chọn base `main` theo thỏa thuận.
Không chọn lại `ours`/`theirs` cho cả dự án. Cả hai cần tự cấu hình `.env` và kiểm
tra lịch sử database trên máy mình. Sau đó tạo nhánh tính năng mới từ nhánh chung
đã gộp. Commit, push và merge Pull Request là các bước chưa thực hiện tự động.
