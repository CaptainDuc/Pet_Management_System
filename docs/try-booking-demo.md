# Thử đặt lịch bằng dữ liệu DEMO

Máy hiện tại đã có tám dịch vụ chăm sóc đã duyệt và lịch trống cho nhân viên
kiểm thử trong 14 ngày tới. Bạn có thể đặt lịch từ ngày mai mà không cần chạy
`-Bootstrap` thêm. Xem [danh mục và hướng dẫn chăm sóc](care-services.md).
Phần bên dưới dành cho bước khởi tạo DEMO ban đầu.

Web cần có dịch vụ, nhân viên phụ trách và giờ làm việc trước khi nhận đặt lịch.
Máy hiện tại chưa có dữ liệu này; không cần thao tác từng API trong Swagger.

## Lần đầu trên máy local

Mở Docker Desktop, mở PowerShell trong thư mục dự án và chạy:

```powershell
cd C:\Study\HDV\Pet_Management_System
docker compose up -d --wait --wait-timeout 180
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-booking-demo.ps1 -Bootstrap
```

Lệnh cuối tạo tài khoản quản trị DEMO mới, hồ sơ nhân viên DEMO, một dịch vụ
`[DEMO] Kham thu cung - 30 phut` giá mẫu 150.000 đồng và các giờ từ 08:00 đến
10:00 vào hai ngày sau ngày chạy. Script chỉ dùng với Docker local, không đổi
mật khẩu, quyền hoặc lịch của tài khoản đang có. Dữ liệu DEMO dùng để kiểm thử.

Khi được hỏi, nhập email thử chưa đăng ký mà bạn nhận được thư, rồi đặt mật khẩu
DEMO từ 8 ký tự trở lên. Mật khẩu không hiển thị. Nhập mã xác nhận gửi về email
để hoàn tất tạo tài khoản; SMTP Gmail cần được cấu hình trong `.env`.
Cuối lệnh, ghi lại email quản trị DEMO và ngày đặt lịch được in ra; dùng email
này cùng mật khẩu vừa nhập nếu muốn thử giao diện quản trị/khuyến mãi.
Không chạy lại `-Bootstrap` nếu chỉ muốn dùng lại dữ liệu; mỗi lần bootstrap
tạo tài khoản và hồ sơ nhân viên DEMO riêng.

Sau đó:

1. Mở `http://localhost:3000`, dùng tài khoản **khách hàng** riêng. Có thể đăng ký
   mới trên web nếu chưa có; không dùng tài khoản quản trị DEMO làm khách hàng.
2. Vào **Bảng điều khiển → Thú cưng của tôi → Thêm thú cưng**, điền tên và lưu.
3. Nhấn **Đặt lịch**, chọn dịch vụ `[DEMO] Kham thu cung - 30 phut`.
4. Chọn đúng ngày được script in ra, rồi chọn một giờ trống.
5. Kiểm tra tổng tiền mẫu 150.000 đồng, ghi chú và xác nhận.
6. Mở **Lịch hẹn** để xem kết quả. Có thể hủy lịch thử chưa thanh toán theo
   thời hạn hủy của phòng khám. Không cần chuyển tiền thật để thử đặt lịch.

## Những lần sau

Dùng tài khoản quản trị đã tạo để bổ sung ngày thử khác, ví dụ:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-booking-demo.ps1 -Email EMAIL_QUAN_TRI_DEMO -Date 2026-12-01
```

Thay ngày ví dụ bằng một ngày trong tương lai. Script hỏi mật khẩu. Nếu cần
chọn nhân viên cụ thể, thêm `-StaffId ID_NHAN_VIEN` (ID được in ở lần chạy đầu).
Script dùng lại dịch vụ DEMO, không thay lịch hoặc kỹ năng đã gán.

## Ảnh thú cưng

Trong form thêm/sửa thú cưng, kéo một file từ thư mục trên máy vào vùng **Ảnh
của bé**, hoặc nhấn vùng đó để chọn file. Xem trước rồi nhấn **Lưu hồ sơ**.
JPG/PNG/WebP tối đa 5 MB; ảnh được thu nhỏ tối đa 640 px để làm ảnh hồ sơ.
**Bỏ ảnh đang chọn** chỉ có hiệu lực sau khi lưu. **Để sau** bỏ các thay đổi
chưa lưu. Đường dẫn ảnh HTTP/HTTPS vẫn dùng được trong mục mở rộng.

Ảnh lưu trong database cùng hồ sơ, không phụ thuộc thư mục tạm của container.

## Đã xác minh

37 kiểm thử backend qua, gồm lưu/đọc lại ảnh, quyền chủ sở hữu, giới hạn ảnh,
khởi tạo DEMO trên database Testcontainers riêng và chạy lại lệnh tạo dữ liệu
không thay lịch cũ. Trình duyệt đã kiểm tra kéo thả, chọn file, chặn sai định
dạng, lưu ảnh qua API thật và tải lại trang; giao diện 1440/390 px đã kiểm tra.
Kiểm tra service đạt 42/42. Kiểm tra giao diện độc lập kết luận `ship` cho lỗi
cắt ảnh sau khi chuyển thẻ hồ sơ sang hiển thị trọn ảnh.

Chưa khởi tạo tài khoản DEMO trong database đang dùng: bạn chạy lệnh `-Bootstrap`
ở trên và tự đặt mật khẩu. Hai tài khoản/hồ sơ ảnh kiểm thử đã được dọn.
