$ErrorActionPreference = 'Stop'
$projectDir = "C:\Users\aroma\Desktop\gmy-project\v1\gymapp"

Write-Host "🚀 Starting Lexus Gym Multi-Platform Dev Stack..." -ForegroundColor Cyan

# 1. Start FastAPI Backend (Port 8000)
Write-Host "-> Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectDir\backend'; ..\.venv\Scripts\python -m uvicorn api.index:app --reload --port 8000"

# 2. Start Vite Web Frontend (Port 5173 / Proxy to Backend)
Write-Host "-> Launching Vite React Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectDir\web'; npm run dev"

# 3. Start Expo React Native App
Write-Host "-> Launching Expo Mobile App..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectDir\mobile'; npm start"

Write-Host "✅ All dev environments launched in separate windows!" -ForegroundColor Green