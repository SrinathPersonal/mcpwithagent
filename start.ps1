# Quick Start Script
Write-Host "Starting Setup..."
Write-Host ""

# Step 1: Check Ollama
Write-Host "Step 1: Checking Ollama..."
try {
    ollama --version
    Write-Host "Ollama is installed"
}
catch {
    Write-Host "Ollama is not installed"
    exit 1
}

# Step 2: Check Ollama RUNNING
Write-Host "Step 2: Checking Ollama service..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:11434" -UseBasicParsing -TimeoutSec 2
    Write-Host "Ollama service is running"
}
catch {
    Write-Host "Ollama service is not running. Starting..."
    Start-Process -FilePath "ollama" -ArgumentList "serve" -NoNewWindow
    Start-Sleep -Seconds 3
}

# Step 3: Check model
Write-Host "Step 3: Checking model..."
$m = "llama3.2"
$list = ollama list 2>&1 | Out-String
if ($list -match $m) {
    Write-Host "Model $m is ready"
}
else {
    Write-Host "Downloading $m..."
    ollama pull $m
}

# Step 4: .env
if (-not (Test-Path ".env")) {
    Write-Host ".env missing"
    exit 1
}

# Step 5: Start
Write-Host "Starting app..."
pnpm run dev-full
