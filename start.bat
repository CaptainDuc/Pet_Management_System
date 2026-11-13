@echo off
chcp 65001 >nul
echo ========================================================
echo        PETCARE PLATFORM - KHOI DONG TOAN HE THONG
echo ========================================================
echo.

echo [1/3] Kiem tra Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Docker chua duoc bat hoac chua duoc cai dat!
    echo Vui long mo ung dung Docker Desktop tren Windows truoc khi chay script nay.
    echo.
    pause
    exit /b 1
)

echo [2/3] Kiem tra file cau hinh moi truong .env...
if not exist ".env" (
    echo Tao file .env tu .env.example...
    copy .env.example .env >nul
)

echo [3/3] Dang khoi dong toan bo he thong bang Docker Compose...
echo (Qua trinh build lan dau co the mat 2-3 phut, vui long cho...)
echo.

docker compose up -d --build

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo      KHOI DONG THANH CONG! CAC DICH VU SAN SANG:
    echo ========================================================
    echo  - Web Frontend:       http://localhost:3000
    echo                        http://localhost
    echo  - Backend Core API:   http://localhost:8080/api/v1
    echo  - Swagger UI docs:    http://localhost:8080/swagger-ui.html
    echo  - RabbitMQ UI:        http://localhost:15672 (petcare / petcare123)
    echo  - Grafana Monitor:    http://localhost:3001 (admin / admin123)
    echo ========================================================
    echo.
    echo Bam phim bat ky de thoat cua so nay (cac dich vu van chay ngam)...
) else (
    echo.
    echo [LOI] Co loi xay ra khi khoi dong container.
)

pause
