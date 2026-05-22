@echo off
title UPI Configuration Setup
color 0B
echo.
echo =============================================
echo   AGORICH PHARMA - UPI PAYMENT SETUP
echo =============================================
echo.
echo This script will help you configure UPI payment.
echo.
echo WHY DO YOU NEED THIS?
echo - Default UPI ID (agorichpharma@paytm) is NOT real
echo - This causes "Cannot pay with QR code" error
echo - You need to use YOUR real UPI ID
echo.
echo =============================================
echo.

:get_upi_id
echo STEP 1: Get Your UPI ID
echo.
echo How to find your UPI ID:
echo   PhonePe:    Profile ^> My UPI ID (yourname@ybl)
echo   Google Pay: Settings ^> UPI IDs (mobile@okaxis)
echo   Paytm:      Profile ^> UPI ID (mobile@paytm)
echo.
set /p UPI_ID="Enter your UPI ID (e.g., 8409725206@paytm): "

if "%UPI_ID%"=="" (
    echo.
    echo ERROR: UPI ID cannot be empty!
    echo.
    goto get_upi_id
)

echo.
echo =============================================
echo.

:get_name
echo STEP 2: Enter Recipient Name
echo.
set /p RECIPIENT_NAME="Enter business/your name (e.g., Agorich Pharma): "

if "%RECIPIENT_NAME%"=="" (
    set RECIPIENT_NAME=Agorich Pharma
)

echo.
echo =============================================
echo.
echo CONFIGURATION SUMMARY:
echo.
echo   UPI ID:         %UPI_ID%
echo   Recipient Name: %RECIPIENT_NAME%
echo.
set /p CONFIRM="Is this correct? (Y/N): "

if /i not "%CONFIRM%"=="Y" (
    echo.
    echo Let's start over...
    echo.
    goto get_upi_id
)

echo.
echo =============================================
echo   CREATING .env.local FILE...
echo =============================================
echo.

(
echo # Supabase Configuration ^(Optional - skip for now^)
echo NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
echo.
echo # UPI Payment Configuration
echo NEXT_PUBLIC_UPI_ID=%UPI_ID%
echo NEXT_PUBLIC_UPI_RECIPIENT_NAME=%RECIPIENT_NAME%
echo.
echo # Generated on: %date% %time%
) > .env.local

if exist .env.local (
    echo.
    echo ✅ SUCCESS! .env.local file created!
    echo.
    echo =============================================
    echo   NEXT STEPS:
    echo =============================================
    echo.
    echo 1. Restart the development server
    echo    - Press Ctrl+C in the terminal
    echo    - Run: npm run dev
    echo.
    echo 2. Test on mobile:
    echo    - Open: http://192.168.31.112:3000/retailer/invoices
    echo    - Click "Pay with UPI"
    echo    - Your UPI app should open properly
    echo.
    echo 3. Payment should now work without errors!
    echo.
    echo =============================================
    echo.
    echo File location: %cd%\.env.local
    echo.
) else (
    echo.
    echo ❌ ERROR: Could not create .env.local file
    echo Please create it manually in the project root folder
    echo.
)

echo.
echo Press any key to exit...
pause >nul





























