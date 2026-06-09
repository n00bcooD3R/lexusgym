@echo off
title Push Gym Members to eSSL Biometric Database
echo ==========================================================
echo       Syncing Gym App Members to Biometric Server
echo ==========================================================
echo.

echo [1/2] Checking python requirements...
pip install pyodbc httpx python-dotenv --quiet
if %errorlevel% neq 0 (
    echo.
    echo ❌ Error: Failed to check or install requirements.
    echo Please ensure Python and pip are in your PATH.
    echo.
    pause
    exit /b
)
echo.
echo [2/2] Running member sync tool...
echo.
python scripts/sync_members_to_essl.py
echo.
pause
