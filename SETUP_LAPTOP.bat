@echo off
title WANIstream V2 - Easy Installer
color 0B

echo ==================================================
echo   WANIstream V2 - Automated Local Setup
echo ==================================================
echo.
echo [1/4] Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js belum terinstal! 
    echo Silakan download di: https://nodejs.org/
    pause
    exit
)

echo [2/4] Installing Backend Services...
cd server
call npm install
if not exist "database\wanistream.db" (
    echo    - Initializing Database...
    call npm run init-db
    echo    - Seeding Default Admin...
    node seed_admin.js
)
if not exist ".env" (
    echo    - Creating default .env...
    copy .env.example .env
)
cd ..

echo [3/4] Installing Frontend Dashboard...
cd client
call npm install
cd ..

echo [4/4] Creating Desktop Shortcut...
echo Done! 
echo.
echo ==================================================
echo   INSTALASI BERHASIL! 🚀
echo ==================================================
echo.
echo  Cara menjalankan:
echo  1. Klik 2x file "WANIstream.vbs"
echo  2. Login dengan: admin / admin123
echo.
echo ==================================================
pause
