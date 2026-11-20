# Danh mục chăm sóc đã duyệt

| Dịch vụ | Phút | Giá mẫu (đồng) |
|---|---:|---:|
| Tắm vệ sinh | 60 | 200.000 |
| Cắt tỉa tạo kiểu | 60 | 250.000 |
| Vệ sinh tai | 30 | 50.000 |
| Cắt móng | 30 | 50.000 |
| Cạo lông vệ sinh | 30 | 100.000 |
| Combo cơ bản | 90 | 200.000 |
| Combo đầy đủ | 120 | 300.000 |
| Combo cao cấp | 150 | 450.000 |

Đây là giá cố định để kiểm thử, chưa tính giá theo cân nặng/giống/độ dài lông.
Hai nhóm mới là **Chăm sóc cơ bản** và **Combo chăm sóc**. Dịch vụ DEMO cũ được
giữ nguyên. V14 thêm danh mục với ID cố định và không ghi đè danh mục đã có.

## Dùng ngay trên máy hiện tại

Đăng nhập khách hàng ở `http://localhost:3000/login`, thêm/chọn thú cưng rồi chọn
**Đặt lịch**. Chọn một trong tám dịch vụ và ngày từ **ngày mai** để thấy giờ trống.
Nhân viên kiểm thử `staff.test@petcare.invalid` đã được gán đủ tám kỹ năng và các
ca 08:00–17:00 trong 14 ngày tiếp theo. Các ca đã có được giữ nguyên.

Sau 14 ngày, hoặc trên máy local khác có cùng bộ tài khoản kiểm thử, chạy lại:

```powershell
Get-Content -Raw infrastructure/postgres/seed_care_test_schedule.sql | docker exec -i petcare-backend-postgres psql -U petcare -d petcare -v ON_ERROR_STOP=1
```

Lệnh chỉ bổ sung kỹ năng còn thiếu và ngày chưa có ca cho tài khoản STAFF kiểm
thử này. Không đổi quyền, mật khẩu, giá, lịch cũ hoặc mức kỹ năng đã gán. Với
nhân viên khác, dùng API quản lý nhân viên/lịch để gán dịch vụ và tạo ca tương ứng.

## Giữ đủ thời lượng khi đặt lịch

Client vẫn gửi `timeSlotId` đầu tiên cho mỗi dịch vụ. Backend chọn đủ các ô liên
tiếp trong cùng ca, cùng tài nguyên, khớp chính xác thời lượng. Ví dụ combo 150
phút bắt đầu lúc 08:00 giữ 5 ô 30 phút đến 10:30. Giờ trả về cho trình duyệt là
toàn bộ buổi hẹn, không phải chỉ ô đầu tiên.

Mọi ô được giữ nguyên tử theo cùng thứ tự khóa. Nếu một ô đã bị giữ, toàn bộ
giao dịch đặt lịch bị hoàn tác. Các mục dịch vụ chồng giờ trong cùng yêu cầu cũng
bị từ chối. Giá được tính một lần mỗi dịch vụ và chụp lại tại thời điểm đặt.

V13 lưu liên kết ô giờ trong `booking_item_slots`, bổ sung liên kết cho lịch
một ô đã có. Hủy lịch trả lại tất cả ô đã giữ. Thay thời lượng/giá danh mục sau
đó không thay khoảng giờ hoặc giá đã lưu trên lịch hẹn.

AI ưu tiên tên dịch vụ được nhắc trực tiếp trước các từ khóa chung: yêu cầu đặt
`Combo cao cấp` trả đúng dịch vụ 150 phút/450.000 đồng. Đây chỉ là đề xuất, người
dùng vẫn xác nhận trong quy trình đặt lịch. AI tư vấn từ mô hình vẫn cần key và
dữ liệu RAG như hướng dẫn trước.

## Xác minh

- 50 kiểm thử backend qua: mọi thời lượng 30/60/90/120/150 phút; giá một lần;
  giữ và trả đủ ô; khoảng trống; ô giữa đã đặt; hai yêu cầu đồng thời với giờ bắt
  đầu khác nhau nhưng chồng nhau; nhiều mục chồng giờ; đọc/hủy lịch cũ; danh mục;
  đề xuất AI đúng combo; chạy lại dữ liệu lịch không ghi đè ca cũ.
- 42/42 kiểm tra kết nối service/gateway/CORS qua sau cập nhật Docker.
- Trình duyệt kiểm tra danh mục thật, giờ trống thật 150 phút và tổng tạm tính
  450.000 đồng trên desktop/mobile. Không dùng phản hồi service/slot giả lập và
  không bấm xác nhận tạo lịch trong database đang dùng. Luồng tạo/hủy đã được
  kiểm tra bằng HTTP thật trong PostgreSQL Testcontainers riêng.

Chạy lại kiểm tra trình duyệt với Edge kiểm thử ở cổng 9222:

```powershell
node scripts/check-web-login.mjs http://localhost:3000 --register --customer-flow --care-services
```

Lệnh tạo tài khoản/hồ sơ tạm và in email để dọn sau. Bằng chứng nằm trong
`.impeccable/review/care-*.png`; không có thay đổi phong cách giao diện.
