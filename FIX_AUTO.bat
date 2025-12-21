@echo off
echo ==========================================
echo      WANISTREAM AUTO-FIX (JANGAN DITUTUP)
echo ==========================================
echo.
echo 1. Mengupload Fix Jaringan (IPv4)...
echo Masukkan password VPS jika diminta:
scp "server\src\services\streamingService.js" root@46.224.60.192:~/wanistream/server/src/services/

echo.
echo 2. Membersihkan Zombie Stream & Restart...
echo Masukkan password VPS lagi:
ssh root@46.224.60.192 "pkill -9 ffmpeg; sqlite3 ~/wanistream/server/database/wanistream.db \"UPDATE streams SET status='completed', actual_end=datetime('now') WHERE status='active';\"; pm2 restart wanistream-api"

echo.
echo ==========================================
echo      SELESAI! SILAKAN REFRESH WEB
echo ==========================================
pause
