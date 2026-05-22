@echo off
echo ========================================
echo   CSV Product Import Tool
echo ========================================
echo.

cd /d "%~dp0"

if "%~1"=="" (
    echo Usage: Import_CSV.bat "path-to-your-csv-file.csv"
    echo.
    echo Example:
    echo   Import_CSV.bat "products.csv"
    echo   Import_CSV.bat "C:\Users\YourName\Desktop\products.csv"
    echo.
    pause
    exit /b 1
)

echo Importing products from: %~1
echo.

node import-csv-products.js "%~1"

echo.
pause

