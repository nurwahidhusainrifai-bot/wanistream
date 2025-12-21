@echo off
title WANIstream DESKTOP (Upload Manager)
color 0B

echo ==================================================
echo   WANIstream DESKTOP - Local Manager
echo ==================================================
echo.

echo [1/4] Checking Server Dependencies...
cd server
if not exist node_modules (
    echo    - Installing Server modules...
    call npm install
)
cd ..

echo [2/4] Checking Client Dependencies...
cd client
if not exist node_modules (
    echo    - Installing Client modules...
    call npm install
)
cd ..

echo [3/4] Starting API Server...
start "WANIstream SERVER" cmd /k "cd server && npm start"

echo [4/4] Starting Dashboard...
start "WANIstream CLIENT" cmd /k "cd client && npm run dev"

echo.
echo ==================================================
echo   System RUNNING.
echo   Check the opened windows for logs.
echo ==================================================
echo.
echo   Please access: http://localhost:5173
echo.
pause
