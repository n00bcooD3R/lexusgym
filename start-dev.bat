@echo off
cd /d "%~dp0"
echo Starting Gym Management App...
echo.
powershell -ExecutionPolicy Bypass -Command "cd '%CD%'; npm run dev"
pause