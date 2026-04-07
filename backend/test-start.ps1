# Test script to start backend and capture initial output
$ErrorActionPreference = "Continue"
Write-Host "Starting MedusaJS backend..."
Write-Host "This will capture first 30 seconds of output..."
Write-Host ""

$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\The Jaikar\agorich-pharma\backend"
    npm start 2>&1
}

Start-Sleep -Seconds 30

$output = Receive-Job $job
Write-Host "=== Output (first 30 seconds) ==="
$output | Select-Object -First 50

Stop-Job $job
Remove-Job $job
















