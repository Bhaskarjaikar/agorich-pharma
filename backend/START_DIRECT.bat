@echo off
echo ========================================
echo   MedusaJS - Direct Start
echo ========================================
echo.

cd /d "%~dp0"

echo Starting MedusaJS directly...
echo.
echo This might take 1-2 minutes...
echo.

REM Try using npx to bypass local CLI issues
npx --yes @medusajs/medusa start

pause
















