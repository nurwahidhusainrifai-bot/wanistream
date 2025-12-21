# WANISTREAM - VPS Deployment Guide (Copy-Paste Ready)

> **Panduan ini 100% copy-paste ready!** Setiap command bisa langsung di-copy paste ke terminal.

---

## 📋 Prerequisites Check

**Yang Anda Butuhkan:**
- [ ] VPS Ubuntu 20.04 atau 22.04 (minimal 2GB RAM)
- [ ] IP Address VPS (contoh: 103.123.45.67)
- [ ] SSH Password atau SSH Key
- [ ] YouTube Client ID & Secret (dari Google Cloud Console)
- [ ] Text editor (VSCode/Notepad++) untuk edit file .env

---

## 🚀 STEP 1: Connect ke VPS

### Windows (PowerShell):
```bash
ssh root@103.123.45.67
# Ganti dengan IP VPS Anda
# Masukkan password saat diminta
```

### Jika diminta fingerprint:
```
Type: yes
[Enter]
```

---

## 🚀 STEP 2: Update System (Copy Semua Sekaligus)

```bash
sudo apt update && sudo apt upgrade -y
```

**Tunggu sampai selesai** (2-5 menit)

---

## 🚀 STEP 3: Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

**Verify instalasi:**
```bash
node -v
```
Expected output: `v18.x.x`

```bash
npm -v
```
Expected output: `9.x.x` atau `10.x.x`

---

## 🚀 STEP 4: Install FFmpeg

```bash
sudo apt install -y ffmpeg
```

**Verify:**
```bash
ffmpeg -version
```
Should show FFmpeg version info.

---

## 🚀 STEP 5: Install PM2

```bash
sudo npm install -g pm2
```

**Verify:**
```bash
pm2 -v
```

---

## 🚀 STEP 6: Install Nginx

```bash
sudo apt install -y nginx
```

**Check status:**
```bash
sudo systemctl status nginx
```
Press `q` to exit.

---

## 🚀 STEP 7: Install Git

```bash
sudo apt install -y git
```

---

## 🚀 STEP 8: Upload Project ke VPS

### Option A: Via SCP dari Windows

**Di Windows PowerShell (BUKAN di VPS!):**

```powershell
cd C:\Users\husen\.gemini\antigravity\scratch

scp -r wanistream root@103.123.45.67:/var/www/
```
**Ganti `103.123.45.67` dengan IP VPS Anda!**

Tunggu upload selesai (tergantung ukuran & kecepatan internet).

### Option B: Via Git (jika project di GitHub)

**Di VPS:**
```bash
cd /var/www
git clone https://github.com/USERNAME/wanistream.git
```

**Skip ke Step 9 setelah upload selesai.**

---

## 🚀 STEP 9: Setup Project Directory

**Di VPS, jalankan:**

```bash
cd /var/www/wanistream
```

**Cek isi folder:**
```bash
ls -la
```
Should see: `client/`, `server/`, `README.md`, etc.

---

## 🚀 STEP 10: Install Backend Dependencies

```bash
cd /var/www/wanistream/server
```

```bash
npm install
```

**Tunggu sampai selesai** (2-3 menit).

---

## 🚀 STEP 11: Setup Environment Variables

### Copy template .env:
```bash
cp .env.example .env
```

### Edit .env:
```bash
nano .env
```

**Isi dengan data Anda:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://103.123.45.67

# YouTube OAuth Credentials
YOUTUBE_CLIENT_ID=PASTE_YOUR_CLIENT_ID_HERE
YOUTUBE_CLIENT_SECRET=PASTE_YOUR_CLIENT_SECRET_HERE
YOUTUBE_REDIRECT_URI=http://103.123.45.67/api/youtube/callback

# JWT Secret (ganti dengan string random panjang)
JWT_SECRET=wanistream_super_secret_key_ganti_dengan_yang_panjang_dan_acak_12345

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!Ganti
```

**⚠️ PENTING: Ganti semua nilai di atas!**
- Ganti `103.123.45.67` dengan IP VPS Anda
- Paste YouTube Client ID & Secret dari Google Cloud Console
- Ganti JWT_SECRET dengan string random panjang
- Ganti ADMIN_PASSWORD dengan password kuat

**Save & Exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

## 🚀 STEP 12: Initialize Database

```bash
npm run init-db
```

Expected output: `✓ Database initialized`

**Create admin user:**
```bash
npm run create-admin
```

**Ikuti prompt:**
```
Username: admin
Password: [masukkan password Anda]
Confirm: [ketik lagi password yang sama]
```

Expected: `✓ Admin user created`

---

## 🚀 STEP 13: Create Uploads Directory

```bash
mkdir -p uploads/videos uploads/thumbnails
```

```bash
chmod 755 -R uploads
```

---

## 🚀 STEP 14: Setup Frontend

```bash
cd /var/www/wanistream/client
```

```bash
npm install
```

**Build for production:**
```bash
npm run build
```

**Tunggu sampai selesai** (1-2 menit).

**Verify build:**
```bash
ls -la dist/
```
Should see `index.html`, `assets/`, etc.

---

## 🚀 STEP 15: Start Backend with PM2

```bash
cd /var/www/wanistream/server
```

```bash
pm2 start server.js --name wanistream-api
```

**Check status:**
```bash
pm2 list
```

Should show `wanistream-api` with status `online`.

**View logs:**
```bash
pm2 logs wanistream-api --lines 20
```

Should see: "WANISTREAM API SERVER" dan "Connected to SQLite database"

**Save PM2 config:**
```bash
pm2 save
```

**Setup auto-start on boot:**
```bash
pm2 startup
```

**Copy command yang muncul dan jalankan!** Contoh:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

---

## 🚀 STEP 16: Configure Nginx

### Create config file:
```bash
sudo nano /etc/nginx/sites-available/wanistream
```

### Paste config ini (ganti IP!):

```nginx
server {
    listen 80;
    server_name 103.123.45.67;  # GANTI DENGAN IP VPS ANDA!

    # Frontend (React build)
    location / {
        root /var/www/wanistream/client/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Max upload size 5GB
    client_max_body_size 5G;
}
```

**Save: Ctrl+X, Y, Enter**

### Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/wanistream /etc/nginx/sites-enabled/
```

### Remove default site:
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Test config:
```bash
sudo nginx -t
```

Expected: `syntax is ok` dan `test is successful`

### Reload Nginx:
```bash
sudo systemctl reload nginx
```

### Enable on boot:
```bash
sudo systemctl enable nginx
```

---

## 🚀 STEP 17: Configure Firewall

```bash
sudo ufw allow 22/tcp
```

```bash
sudo ufw allow 80/tcp
```

```bash
sudo ufw allow 443/tcp
```

**Enable firewall:**
```bash
sudo ufw --force enable
```

**Check status:**
```bash
sudo ufw status
```

---

## 🚀 STEP 18: Final Checks

### Check PM2:
```bash
pm2 list
```
Status should be `online`.

### Check Nginx:
```bash
sudo systemctl status nginx
```
Should be `active (running)`.

### Check logs:
```bash
pm2 logs wanistream-api --lines 10
```

---

## 🎉 STEP 19: Access Your Application!

**Open browser dan kunjungi:**
```
http://103.123.45.67
```
**Ganti dengan IP VPS Anda!**

**Login dengan:**
- Username: `admin` (atau yang Anda set)
- Password: (yang Anda set di Step 12)

---

## ✅ POST-DEPLOYMENT CHECKLIST

Test semua fitur:

- [ ] ✅ Login works
- [ ] ✅ Dashboard tampil
- [ ] ✅ Bisa upload video
- [ ] ✅ Video preview works
- [ ] ✅ Bisa start manual stream
- [ ] ✅ Real-time stats works

---

## 🛠 USEFUL COMMANDS (Copy Paste When Needed)

### View PM2 logs:
```bash
pm2 logs wanistream-api
```

### Restart backend:
```bash
pm2 restart wanistream-api
```

### Stop backend:
```bash
pm2 stop wanistream-api
```

### Start backend:
```bash
pm2 start wanistream-api
```

### View Nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Restart Nginx:
```bash
sudo systemctl restart nginx
```

### Check disk space:
```bash
df -h
```

### Check memory:
```bash
free -h
```

### Check CPU:
```bash
top
```
Press `q` to exit.

### Reboot VPS:
```bash
sudo reboot
```

After reboot, PM2 will auto-start the app!

---

## 🐛 TROUBLESHOOTING

### Backend not running?
```bash
pm2 logs wanistream-api
```
Cek error di logs.

### Port 5000 already in use?
```bash
sudo lsof -i :5000
sudo kill -9 PID_NUMBER
pm2 restart wanistream-api
```

### Nginx 502 Bad Gateway?
```bash
pm2 list
```
Pastikan `wanistream-api` status `online`.

### Can't upload video?
```bash
cd /var/www/wanistream/server
chmod 755 -R uploads
```

### Database error?
```bash
cd /var/www/wanistream/server
npm run init-db
npm run create-admin
```

---

## 🔄 UPDATE APPLICATION

**Jika ada update code:**

```bash
cd /var/www/wanistream
git pull  # Jika pakai Git

cd server
npm install
pm2 restart wanistream-api

cd ../client
npm install
npm run build
```

**No need restart Nginx!**

---

## 💾 BACKUP

### Manual backup database:
```bash
cp /var/www/wanistream/server/database/wanistream.db ~/backup-$(date +%Y%m%d).db
```

### Backup videos:
```bash
tar -czf ~/videos-backup.tar.gz /var/www/wanistream/server/uploads/videos/
```

### Download backup ke local (dari Windows):
```powershell
scp root@103.123.45.67:~/backup-*.db C:\backup\
```

---

## 🔒 OPTIONAL: Setup SSL (HTTPS)

**Jika punya domain (misal: stream.example.com):**

### Point domain ke VPS IP di DNS provider

### Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get certificate:
```bash
sudo certbot --nginx -d stream.example.com
```

**Follow prompts:**
- Email: masukkan email Anda
- Terms: `Y`
- Share email: `N`
- Redirect HTTP to HTTPS: `2`

### Update .env:
```bash
cd /var/www/wanistream/server
nano .env
```

Change:
```env
FRONTEND_URL=https://stream.example.com
YOUTUBE_REDIRECT_URI=https://stream.example.com/api/youtube/callback
```

### Restart:
```bash
pm2 restart wanistream-api
```

**Access via:** `https://stream.example.com` 🎉

---

## 📱 MONITORING

### Real-time monitor:
```bash
pm2 monit
```

### Setup log rotation:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎉 DEPLOYMENT COMPLETE!

**Your WANISTREAM is now LIVE!** 🚀

Access: `http://YOUR_VPS_IP`

**Next steps:**
1. Login dengan admin credentials
2. Connect YouTube account di menu Channels
3. Upload beberapa video
4. Test manual streaming
5. Test auto streaming
6. Start streaming! 📺

**Need help?** Check troubleshooting section atau PM2 logs!

---

## 📞 SUPPORT COMMANDS

```bash
# View all logs
pm2 logs

# Monitor resources
pm2 monit

# Process info
pm2 show wanistream-api

# System info
uname -a
free -h
df -h
```

**Happy Streaming!** 🎬✨
