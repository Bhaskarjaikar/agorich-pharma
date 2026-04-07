@echo off
echo ========================================
echo   MedusaJS Backend Status Check
echo ========================================
echo.

echo [1] Checking Node processes...
tasklist | findstr node.exe
echo.

echo [2] Checking ports...
netstat -ano | findstr ":9000 :7001"
echo.

echo [3] Testing backend health...
curl http://localhost:9000/health 2>nul
if errorlevel 1 (
    echo   ❌ Backend not responding
) else (
    echo   ✅ Backend is running!
)
echo.

echo [4] Testing admin panel...
curl http://localhost:7001 2>nul | findstr /i "medusa" >nul
if errorlevel 1 (
    echo   ❌ Admin panel not accessible
) else (
    echo   ✅ Admin panel is accessible!
)
echo.

echo ========================================
echo   To start backend, run:
echo   npm run start
echo ========================================
pause
















