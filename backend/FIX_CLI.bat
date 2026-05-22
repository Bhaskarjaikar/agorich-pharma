@echo off
echo ========================================
echo   Fixing Saleor CLI Issues
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Stopping any running processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Cleaning node_modules...
if exist "node_modules" (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist "package-lock.json" (
    del /f package-lock.json
)

echo [3/4] Reinstalling dependencies...
call npm install

echo.
echo [4/4] Creating required directories...
if not exist "saleor" mkdir saleor
if not exist "src\api" mkdir src\api
if not exist "src\models" mkdir src\models
if not exist "src\services" mkdir src\services

echo.
echo ========================================
echo   ✅ Fix Complete!
echo ========================================
echo.
echo Now try starting Saleor:
echo   npm run dev
echo   or
echo   saleor dev
echo.
pause


