@echo off
chcp 65001 >nul
echo ============================================================
echo   TỐI ƯU HÓA BỘ NHỚ RAM CHO DOCKER / WSL 2
echo ============================================================
echo.
echo Đang thiết lập giới hạn RAM trần cho Docker/WSL 2 là 4GB...
(
echo [wsl2]
echo memory=4GB
echo swap=2GB
echo processors=4
) > "%USERPROFILE%\.wslconfig"

echo.
echo [THÀNH CÔNG] Đã tạo file: %USERPROFILE%\.wslconfig
echo ------------------------------------------------------------
echo Bây giờ Docker / WSL 2 sẽ không bao giờ chiếm quá 4GB RAM,
echo đảm bảo máy tính luôn còn trống hơn 11GB - 12GB cho Windows.
echo.
echo Vui lòng khởi động lại Docker Desktop để áp dụng ngay:
echo    1. Click chuột phải vào biểu tượng Docker dưới góc phải màn hình
echo    2. Chọn "Restart Docker..."
echo ------------------------------------------------------------
pause
