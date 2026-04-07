# Capture MedusaJS startup errors
Write-Host "=== Capturing MedusaJS Startup Output ===" -ForegroundColor Cyan
Write-Host ""

Set-Location "C:\Users\The Jaikar\agorich-pharma\backend"

$outputFile = "startup-output.log"

# Start npm start and capture all output
Start-Process npm -ArgumentList "start" -NoNewWindow -Wait -RedirectStandardOutput $outputFile -RedirectStandardError "$outputFile.errors"

# Also try direct medusa command
Write-Host "Trying direct medusa command..." -ForegroundColor Yellow
npx medusa start 2>&1 | Tee-Object -FilePath "medusa-direct.log"

Write-Host ""
Write-Host "Output saved to:" -ForegroundColor Green
Write-Host "  - $outputFile" -ForegroundColor Yellow
Write-Host "  - $outputFile.errors" -ForegroundColor Yellow
Write-Host "  - medusa-direct.log" -ForegroundColor Yellow
















