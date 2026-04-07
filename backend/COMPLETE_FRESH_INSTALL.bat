@echo off
echo ========================================
echo   COMPLETE FRESH MEDUSAJS INSTALLATION
echo   100%% Working Setup
echo ========================================
echo.
echo This will take 5-10 minutes
echo Please wait...
echo.

cd /d "%~dp0"

REM Step 1: Stop everything
echo [1/8] Stopping all Node processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul

REM Step 2: Backup important files
echo [2/8] Backing up configuration files...
if exist ".env" copy .env .env.backup
if exist "medusa-config.js" copy medusa-config.js medusa-config.js.backup

REM Step 3: Complete clean
echo [3/8] Removing old installation...
if exist "node_modules" (
    echo    Removing node_modules... (this may take 1-2 minutes)
    rmdir /s /q node_modules
)
if exist "package-lock.json" del /f package-lock.json
if exist ".medusa" rmdir /s /q .medusa
if exist "dist" rmdir /s /q dist
if exist ".cache" rmdir /s /q .cache

REM Step 4: Fresh package.json
echo [4/8] Creating fresh package.json...
echo { > package.json
echo   "name": "agorich-pharma-backend", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "description": "MedusaJS backend for Agorich Pharma", >> package.json
echo   "scripts": { >> package.json
echo     "start": "medusa start", >> package.json
echo     "dev": "medusa develop", >> package.json
echo     "build": "medusa build", >> package.json
echo     "seed": "medusa seed", >> package.json
echo     "migrate": "medusa migrations run" >> package.json
echo   }, >> package.json
echo   "dependencies": { >> package.json
echo     "@medusajs/medusa": "1.20.0", >> package.json
echo     "@medusajs/admin": "7.1.0", >> package.json
echo     "medusa-fulfillment-manual": "1.1.38", >> package.json
echo     "medusa-payment-manual": "1.0.24", >> package.json
echo     "typeorm": "0.3.16", >> package.json
echo     "body-parser": "^1.20.2", >> package.json
echo     "cors": "^2.8.5", >> package.json
echo     "express": "^4.18.2", >> package.json
echo     "pg": "^8.11.3" >> package.json
echo   }, >> package.json
echo   "devDependencies": { >> package.json
echo     "@babel/cli": "7.23.4", >> package.json
echo     "@babel/core": "7.23.6", >> package.json
echo     "@babel/preset-typescript": "7.23.3", >> package.json
echo     "@types/express": "4.17.21", >> package.json
echo     "@types/node": "20.10.6", >> package.json
echo     "typescript": "5.3.3" >> package.json
echo   } >> package.json
echo } >> package.json

REM Step 5: Install dependencies
echo [5/8] Installing MedusaJS dependencies...
echo    This will take 3-5 minutes, please wait...
call npm install
if errorlevel 1 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

REM Step 6: Restore config
echo [6/8] Restoring configuration...
if exist ".env.backup" copy .env.backup .env
if exist "medusa-config.js.backup" copy medusa-config.js.backup medusa-config.js

REM Step 7: Create directories
echo [7/8] Creating required directories...
if not exist "src\api" mkdir src\api
if not exist "src\models" mkdir src\models
if not exist "src\services" mkdir src\services
if not exist "src\repositories" mkdir src\repositories
if not exist "uploads" mkdir uploads

REM Step 8: Verify installation
echo [8/8] Verifying installation...
if exist "node_modules\@medusajs\medusa" (
    echo    ✓ MedusaJS installed
) else (
    echo    ✗ MedusaJS installation failed
    pause
    exit /b 1
)

if exist "node_modules\.bin\medusa.cmd" (
    echo    ✓ Medusa CLI available
) else (
    echo    ✗ Medusa CLI missing
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅✅✅ INSTALLATION COMPLETE! ✅✅✅
echo ========================================
echo.
echo Next step: npm start
echo.
pause
















