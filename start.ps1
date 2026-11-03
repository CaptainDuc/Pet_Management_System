Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       PETCARE PLATFORM - KHỞI ĐỘNG TOÀN HỆ THỐNG        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/3] Kiểm tra Docker Desktop..." -ForegroundColor Yellow
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
} catch {
    Write-Host "[LỖI] Docker chưa bật hoặc chưa được cài đặt!" -ForegroundColor Red
    Write-Host "Vui lòng mở ứng dụng Docker Desktop trên Windows trước khi chạy." -ForegroundColor Red
    exit 1
}

# Check .env
Write-Host "[2/3] Kiểm tra file cấu hình môi trường .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "Tạo file .env từ .env.example..." -ForegroundColor Green
    Copy-Item ".env.example" ".env"
}

# Start system
Write-Host "[3/3] Đang khởi động toàn bộ hệ thống bằng Docker Compose..." -ForegroundColor Yellow
Write-Host "(Quá trình build lần đầu có thể mất 2-3 phút, vui lòng chờ...)" -ForegroundColor Gray
Write-Host ""

docker compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "      KHỞI ĐỘNG THÀNH CÔNG! CÁC DỊCH VỤ SẴN SÀNG:       " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " - Web Frontend:      http://localhost:3000" -ForegroundColor White
    Write-Host "                      http://localhost" -ForegroundColor White
    Write-Host " - Backend Core API:  http://localhost:8080/api/v1" -ForegroundColor White
    Write-Host " - Swagger UI docs:   http://localhost:8080/swagger-ui.html" -ForegroundColor White
    Write-Host " - RabbitMQ UI:       http://localhost:15672 (petcare / petcare123)" -ForegroundColor White
    Write-Host " - Grafana Monitor:   http://localhost:3001 (admin / admin123)" -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "[LỖI] Có lỗi xảy ra trong quá trình khởi động container." -ForegroundColor Red
}
