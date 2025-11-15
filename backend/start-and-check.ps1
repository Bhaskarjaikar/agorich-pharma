# Start backend and check status
Write-Host "=== Starting MedusaJS Backend ===" -ForegroundColor Green
Write-Host ""

# Start backend in background
$job = Start-Job -ScriptBlock {
    Set-Location "C:\Users\The Jaikar\agorich-pharma\backend"
    npm start 2>&1 | ForEach-Object { Write-Output $_ }
}

Write-Host "Backend process started. Waiting for initialization..." -ForegroundColor Yellow
Write-Host ""

# Check status every 15 seconds
$maxAttempts = 12  # 3 minutes total
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Start-Sleep -Seconds 15
    
    Write-Host "[$attempt/$maxAttempts] Checking backend status..." -ForegroundColor Cyan
    
    # Check health endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9000/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host ""
        Write-Host "=== SUCCESS! Backend is RUNNING! ===" -ForegroundColor Green
        Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin Panel: http://localhost:7001" -ForegroundColor Yellow
        Write-Host "API Health: http://localhost:9000/health" -ForegroundColor Yellow
        Write-Host ""
        
        # Get latest job output
        $latestOutput = Receive-Job $job -ErrorAction SilentlyContinue | Select-Object -Last 10
        if ($latestOutput) {
            Write-Host "Latest output:" -ForegroundColor Gray
            $latestOutput | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
        }
        
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -ErrorAction SilentlyContinue
        exit 0
    }
    catch {
        # Not ready yet
        $latestOutput = Receive-Job $job -ErrorAction SilentlyContinue | Select-Object -Last 5
        if ($latestOutput) {
            Write-Host "Latest output:" -ForegroundColor Gray
            $latestOutput | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
        }
        Write-Host "Not ready yet. Continuing to wait..." -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host ""
Write-Host "=== Timeout: Backend didn't start in expected time ===" -ForegroundColor Red
Write-Host "Checking for errors..." -ForegroundColor Yellow

$allOutput = Receive-Job $job
Write-Host ""
Write-Host "Full output:" -ForegroundColor Yellow
$allOutput | ForEach-Object { Write-Host $_ }

Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue
















