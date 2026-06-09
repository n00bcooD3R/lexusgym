@echo off
title eSSL Biometric Attendance Sync Agent
echo ==========================================================
echo       eSSL Biometric Attendance Sync Tool
echo ==========================================================
echo.

echo [1/2] Checking and installing required Python packages...
pip install pyodbc httpx python-dotenv --quiet
if %errorlevel% neq 0 (
    echo.
    echo ❌ Error: Failed to install Python dependencies. 
    echo Please make sure Python and pip are installed and added to your system PATH.
    echo.
    pause
    exit /b
)
echo.
echo [2/2] Starting Biometric Sync Agent...
echo.
python scripts/essl_sync_agent.py
pause
