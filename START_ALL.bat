@echo off
echo ========================================
echo   Agorich Pharma - Full Stack Starter
echo ========================================
echo.

echo Starting MedusaJS Backend...
start "MedusaJS Backend" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Both servers are starting...
echo ========================================
echo.
echo   MedusaJS Backend:
echo     - API: http://localhost:9000
echo     - Admin Panel: http://localhost:7001
echo.
echo   Next.js Frontend:
echo     - App: http://localhost:3000
echo.
echo   To stop: Close both terminal windows
echo ========================================
echo.

pause
















