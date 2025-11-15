@echo off
echo ========================================
echo   MedusaJS Backend - Fresh Start
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Stopping any existing processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Checking environment...
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please copy ENV_EXAMPLE.txt to .env and fill in your database details
    pause
    exit /b 1
)

echo [3/4] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo [4/4] Starting MedusaJS backend...
echo.
echo ========================================
echo   Backend URLs:
echo   - API: http://localhost:9000
echo   - Admin: http://localhost:7001
echo ========================================
echo.
echo Press Ctrl+C to stop
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

call npm run dev

pause
















