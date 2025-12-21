# WANIstream - Deploy All Fixes to VPS
# Jalankan di PowerShell: .\deploy_all_fixes.ps1

$VPS = "root@46.224.60.192"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYING WANISTREAM FIXES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Kamu akan diminta password SSH beberapa kali." -ForegroundColor Yellow
Write-Host "Siapkan password SSH-nya ya!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Tekan ENTER untuk lanjut"

# Step 1: Upload Backend Controller
Write-Host ""
Write-Host "[1/7] Uploading streamController.js..." -ForegroundColor Green
scp ".\server\src\controllers\streamController.js" "${VPS}:~/wanistream/server/src/controllers/"

# Step 2: Upload Backend Service
Write-Host ""
Write-Host "[2/7] Uploading streamingService.js..." -ForegroundColor Green
scp ".\server\src\services\streamingService.js" "${VPS}:~/wanistream/server/src/services/"

# Step 3: Upload Cleanup Script
Write-Host ""
Write-Host "[3/7] Uploading cleanup-stuck-streams.js..." -ForegroundColor Green
scp ".\server\cleanup-stuck-streams.js" "${VPS}:~/wanistream/server/"

# Step 4: Upload Frontend
Write-Host ""
Write-Host "[4/7] Uploading Dashboard.jsx..." -ForegroundColor Green
scp ".\client\src\pages\Dashboard.jsx" "${VPS}:~/wanistream/client/src/pages/"

# Step 5: Rebuild Frontend
Write-Host ""
Write-Host "[5/7] Building frontend..." -ForegroundColor Green
ssh $VPS "cd ~/wanistream/client && npm run build"

# Step 6: Cleanup Stuck Streams
Write-Host ""
Write-Host "[6/7] 🧹 Cleaning up 11 stuck streams..." -ForegroundColor Green
ssh $VPS "cd ~/wanistream/server && node cleanup-stuck-streams.js"

# Step 7: Restart Server
Write-Host ""
Write-Host "[7/7] 🔄 Restarting PM2..." -ForegroundColor Green
ssh $VPS "pm2 restart wanistream"

# Done!
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Buka browser: https://46.224.60.192.nip.io" -ForegroundColor White
Write-Host "  2. Cek 'Active Streams' harusnya jadi 0" -ForegroundColor White
Write-Host "  3. Coba start stream baru" -ForegroundColor White
Write-Host "  4. Coba end stream - harusnya jalan!" -ForegroundColor White
Write-Host ""
Write-Host "Check logs:" -ForegroundColor Yellow
Write-Host "  ssh $VPS 'pm2 logs wanistream --lines 50'" -ForegroundColor White
Write-Host ""
