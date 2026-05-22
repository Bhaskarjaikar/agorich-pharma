@echo off
title Agorich Pharma - Dev Server
color 0A
echo.
echo ========================================
echo   AGORICH PHARMA - STARTING SERVER...
echo ========================================
echo.
cd /d "%~dp0"
echo Current Directory: %CD%
echo.
echo Installing/Checking dependencies...
call npm install
echo.
echo ========================================
echo   STARTING NEXT.JS SERVER...
echo ========================================
echo.
echo Server will start on:
echo   - Local:   http://localhost:3000
echo   - Network: http://192.168.31.112:3000
echo.
echo Mobile Testing URL (Copy this):
echo   http://192.168.31.112:3000/retailer
echo.
echo ========================================
echo   PRESS CTRL+C TO STOP SERVER
echo ========================================
echo.
echo Starting server with network access enabled...
npx next@15.5.4 dev --hostname 0.0.0.0
pause


