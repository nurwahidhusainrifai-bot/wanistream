# 🚀 WANISTREAM - Deployment ke VPS dengan Stability Enhanced

## ✨ Apa yang Sudah Ditingkatkan?

### Anti-Crash Improvements ✅
1. **Raw FFmpeg Spawn** (bukan wrapper) - lebih stabil dan reliable
2. **Bulletproof Network Config**:
   - `-reconnect 1` - auto-reconnect kalau network drop
   - `-timeout 10000000` - prevent hanging forever  
   - `-rw_timeout 10000000` - read/write timeout
   - `-err_detect ignore_err` - ignore minor errors
   - `-fflags +genpts+discardcorrupt` - handle corrupt frames

3. **Process Isolation**: Stream independent dari server restart
4. **Enhanced Logging**: Per-stream logs di `./logs/stream-X.log`
5. **Improved Exit Handling**: Proper detect crash vs manual stop

### Already Existing (Kept) ✅
- Exponential backoff retry (2s → 4s → 8s ... → 60s)
- Health monitoring every 30s
- Auto-resume on server restart
- YouTube API integration
- Scheduler service
- Multi-account support

---

## 📋 Prerequisites

1. **VPS dengan Ubuntu 20.04+** (atau Debian-based distro)
2. **Root atau sudo access**
3. **YouTube API Credentials** (OAuth Client ID & Secret)
4. **Domain atau IP public** (optional tapi recommended)

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y git curl wget build-essential ffmpeg nginx

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v18+
ffmpeg -version
```

### Step 2: Upload Project ke VPS

**Option A: Via SCP (dari Windows/Local)**
```bash
# Dari folder lokal
cd C:\Users\husen\.gemini\antigravity\scratch\wanistream
tar -czf wanistream.tar.gz .

# Upload ke VPS (ganti IP dan user)
scp wanistream.tar.gz root@YOUR_VPS_IP:/tmp/

# Di VPS, extract
ssh root@YOUR_VPS_IP
cd /opt
tar -xzf /tmp/wanistream.tar.gz -C /opt/wanistream
```

**Option B: Via Git (jika sudah push ke repo)**
```bash
cd /opt
git clone https://github.com/youruser/wanistream.git
cd wanistream
```

### Step 3: Install Node Modules

```bash
cd /opt/wanistream/server
npm install
```

### Step 4: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit environment variables
nano .env
```

Set variabel berikut:
```env
NODE_ENV=production
PORT=5000
DATABASE_PATH=./database.db
JWT_SECRET=your_super_secret_key_change_this

# YouTube API
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_Secret=your_client_secret
YOUTUBE_REDIRECT_URI=https://YOUR_DOMAIN/api/youtube/callback

# Frontend URL (untuk CORS)
FRONTEND_URL=https://YOUR_DOMAIN
```

### Step 5: Initialize Database

```bash
# Create database and admin user
npm run init-db
npm run create-admin

# Will prompt for:
# - Email
# - Password  
# - Name
```

### Step 6: Build Frontend (jika perlu)

```bash
cd /opt/wanistream/client
npm install
npm run build
```

### Step 7: Setup PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start server with PM2
cd /opt/wanistream/server
pm2 start server.js --name wanistream

# Save PM2 configuration
pm2 save

# Enable auto-start on reboot
pm2 startup systemd
# Jalankan command yang diberikan PM2 (biasanya sudo ...)

# Check status
pm2 status
pm2 logs wanistream
```

Expected output:
```
╔═══════════════════════════════════════════╗
║                                           ║
║      🎬  WANISTREAM API SERVER  🎬        ║
║                                           ║
║  Server running on port 5000              ║
║  Environment: production                  ║
║                                           ║
╚═══════════════════════════════════════════╝

✓ All services initialized
📡 API: http://localhost:5000
📚 Health: http://localhost:5000/health
```

### Step 8: Setup Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/wanistream
```

Paste config berikut (ganti YOUR_DOMAIN):
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;  # atau IP VPS

    client_max_body_size 1G;  # Allow large video uploads

    # API routes
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Long timeouts for streaming
        proxy_connect_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
    }

    # Serve static frontend
    location / {
        root /opt/wanistream/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded videos
    location /uploads {
        alias /opt/wanistream/server/uploads;
        autoindex off;
    }
}
```

Enable dan test:
```bash
sudo ln -s /etc/nginx/sites-available/wanistream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Setup SSL dengan Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (ganti YOUR_DOMAIN)
sudo certbot --nginx -d YOUR_DOMAIN

# Auto-renewal sudah ter-setup via cron
```

### Step 10: Configure Firewall

```bash
# Allow HTTP,  HTTPS, SSH
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Verification

### 1. Check PM2 Status
```bash
pm2 status
pm2 monit  # Real-time monitoring
pm2 logs wanistream
```

### 2. Check Health Endpoint
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123
}
```

### 3. Access Web UI
- Open browser: `https://YOUR_DOMAIN`
- Login dengan credentials yang dibuat di Step 5

### 4. Test Stream Creation
1. Upload test video
2. Connect YouTube account via OAuth
3. Create manual stream
4. Monitor logs: `pm2 logs wanistream`

Expected logs:
```
[STREAM 1] Starting stream...
[STREAM 1] FFmpeg command: ffmpeg ...
[STREAM 1] ✅ Started - PID: 12345
[STREAM 1] Transitioned to live on YouTube
[Health Check] Stream 1 healthy
```

---

## 🔧 Maintenance Commands

```bash
# View logs
pm2 logs wanistream

# Restart server
pm2 restart wanistream

# Stop server
pm2 stop wanistream

# Monitor resource usage
pm2 monit

# View specific stream log
tail -f ./logs/stream-1.log

# Check active FFmpeg processes
ps aux | grep ffmpeg

# Check disk space
df -h

# Check memory
free -h
```

---

## 🐛 Troubleshooting

### Stream Berhenti Sendiri?
1. Check stream log: `tail -100 ./logs/stream-X.log`
2. Check server log: `pm2 logs wanistream`
3. Verify RTMP URL benar
4. Test network: `ping a.rtmp.youtube.com`

### Port 5000 Sudah Dipakai?
```bash
# Check what uses port
sudo lsof -i :5000

# Kill process
sudo kill -9 PID
```

### Database Lock Error?
```bash
# Stop server
pm2 stop wanistream

# Remove lock (if exists)
rm /opt/wanistream/server/database.db-journal

# Restart
pm2 restart wanistream
```

### OAuth Callback Error?
- Verify `YOUTUBE_REDIRECT_URI` di `.env` match dengan Google Cloud Console
- Format: `https://YOUR_DOMAIN/api/youtube/callback`

---

## 📊 Performance Tuning

### Untuk Multiple Concurrent Streams
Edit `/opt/wanistream/server/src/services/streamingService.js`:

```javascript
// Tuning bitrate untuk save bandwidth
'-b:v', '2000k',      // Dari 2500k ke 2000k
'-maxrate', '2000k',
'-bufsize', '4000k',  // Reduce buffer
```

### Untuk High Quality Streams
```javascript
'-b:v', '3500k',      // Increase bitrate
'-maxrate', '3500k',
'-bufsize', '7000k',
'-preset', 'fast',    // Better quality, slower encoding
```

---

## 🔒 Security Best Practices

1. **Change Default Admin Password**: Via web UI > Settings
2. **Use Strong JWT_SECRET**: Generate via `openssl rand -base64 32`
3. **Enable Firewall**: Only allow 80, 443, 22
4. **Regular Updates**: `sudo apt update && sudo apt upgrade`
5. **Backup Database**: `cp database.db database.backup-$(date +%Y%m%d).db`
6. **Monitor Logs**: Check for suspicious activity

---

## 📈 Monitoring & Alerts (Optional)

### Setup Email Alerts for PM2
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Setup System Monitoring
```bash
# Install htop
sudo apt install -y htop

# Monitor
htop
```

---

## 🎯 Expected Performance

- **Uptime**: 99.9% dengan auto-restart
- **Stream Stability**: Berjalan berhari-hari tanpa intervensi
- **Auto-Recovery**: Crash/network drop → restart within 5-60s
- **Resource Usage** (per stream):
  - CPU: 20-35%
  - Memory: 150-300MB

---

## 📞 Support

Kalau ada masalah:
1. Check logs: `pm2 logs wanistream`
2. Check stream logs: `tail -f ./logs/stream-X.log`
3. Check FFmpeg processes: `ps aux | grep ffmpeg`
4. Restart: `pm2 restart wanistream`

---

**🎉 Done! Panel sudah siap 24/7 nonstop streaming!**
