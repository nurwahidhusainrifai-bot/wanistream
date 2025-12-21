$VPS_IP = "46.224.60.192"
$REMOTE_DIR = "~/wanistream/server"
$LOCAL_BASE = "C:\Users\husen\.gemini\antigravity\scratch\wanistream\server"

Write-Host "Starting Final Deployment..."

# 1. Upload Controllers
Write-Host "Uploading streamController.js..."
scp "${LOCAL_BASE}\src\controllers\streamController.js" "root@${VPS_IP}:${REMOTE_DIR}/src/controllers/"

# 2. Upload Services
Write-Host "Uploading streamingService.js..."
scp "${LOCAL_BASE}\src\services\streamingService.js" "root@${VPS_IP}:${REMOTE_DIR}/src/services/"

# 3. Upload Routes
Write-Host "Uploading routes/streams.js..."
scp "${LOCAL_BASE}\src\routes\streams.js" "root@${VPS_IP}:${REMOTE_DIR}/src/routes/"

# 4. Restart Services
Write-Host "Restarting wanistream-api..."
ssh "root@${VPS_IP}" "pm2 restart wanistream-api"

Write-Host "Deployment Complete!"
