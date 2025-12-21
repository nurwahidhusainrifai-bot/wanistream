@echo off
title WANIstream Pro Launcher
color 0A

echo ==================================================
echo   WANIstream Pro - Local Launcher
echo ==================================================
echo.

echo [1/3] Starting Backend Server...
start "WANIstream Backend" cmd /k "cd server && npm install && npm start"

echo [2/3] Starting Frontend Client...
start "WANIstream Frontend" cmd /k "cd client && npm install && npm run dev"

echo Waiting for services to start...
timeout /t 5 >nul

echo [3/3] Opening Dashboard in Browser...
start http://localhost:5173

echo.
echo ==================================================
echo   SUCCESS! WANIstream is running.
echo   - Backend: http://localhost:5000
echo   - Frontend: http://localhost:5173
echo.
echo   NOTE: Please DO NOT CLOSE the black command windows.
echo   Minimize them to keep the server running.
echo ==================================================
pause
