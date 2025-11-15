@echo off
echo ========================================
echo   Agorich Pharma - Saleor Backend
echo ========================================
echo.

cd /d "%~dp0"

echo Checking if node_modules exists...
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    echo.
)

echo Starting Saleor backend...
echo.
echo Backend will be available at:
echo   - GraphQL API: http://localhost:8000/graphql/
echo   - Dashboard: http://localhost:8000/dashboard/
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev


