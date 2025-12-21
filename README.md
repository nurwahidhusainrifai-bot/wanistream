# WANIstream V2: Premium YouTube Streaming Manager 🔥

WANIstream V2 adalah solusi *all-in-one* untuk live streaming YouTube 24/7 non-stop dengan efisiensi tingkat tinggi. Dirancang agar ringan di VPS dan sangat mudah digunakan di laptop/PC lokal.

![WANIstream Banner](https://via.placeholder.com/1000x300?text=WANIstream+V2+Pro+Streaming+Panel)

---

## ✨ Fitur Unggulan
- **🚀 24/7 Non-Stop**: Auto-restart & Auto-resume menjamin live tetap jalan meski server reboot.
- **🧊 Ultra-Low CPU (Copy Mode)**: CPU usage hanya ~1-2% per stream (hemat biaya VPS).
- **🖥️ Desktop Mode**: Berjalan sebagai aplikasi Windows murni tanpa jendela CMD hitam.
- **📊 Real-time Mbps**: Pantau traffic upload data secara akurat di dashboard.
- **📅 Smart Scheduler**: Jadwalkan streaming di jam-jam prime time secara otomatis.
- **📱 Responsive UI**: Tampilan dashboard premium yang nyaman di semua perangkat.

---

## 🛒 Daftar Bahan (Wajib Download)
Sebelum instalasi, pastikan Anda sudah mendownload dan menginstal bahan berikut:

1. **Node.js (LTS)**: Mesin utama untuk menjalankan aplikasi.  
   👉 [Download Node.js](https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi)
2. **FFmpeg**: Mesin pengolah video untuk streaming.  
   👉 [Download FFmpeg Essentials](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
   > **Catatan Windows**: Setelah ekstrak, copy file `ffmpeg.exe` ke dalam folder `server` proyek ini.

---

## 💻 1. Instalasi di Laptop / PC (Windows)

Cara ini paling cocok bagi Anda yang ingin mencoba atau menggunakan laptop sendiri sebagai pusat streaming.

### A. Cara Cepat (One-Click)
1. Buka folder proyek WANIstream V2.
2. Klik kanan file **`SETUP_LAPTOP.bat`**, pilih **Run as Administrator**.
3. Tunggu sampai muncul tulisan "BERHASIL".

### B. Cara Menjalankan
- **Desktop Mode (Rekomendasi)**: Klik 2x file **`WANIstream.vbs`**. Aplikasi akan terbuka dalam jendela sendiri tanpa jendela CMD hitam.
- **Web Panel Mode**: Klik 2x file **`start_wanistream_local.bat`**, lalu buka `http://localhost:5173` di browser.

---

## ☁️ 2. Instalasi di VPS (Ubuntu 20.04/22.04)

Cocok untuk streaming 24 jam tanpa mematikan komputer pribadi.

### A. Setup Environment
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install ffmpeg git -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### B. Setup WANIstream
```bash
git clone https://github.com/your-username/wanistream-v2
cd wanistream-v2
# Instalasi Backend & Frontend
cd server && npm install
cd ../client && npm install && npm run build
```

### C. Jalankan dengan PM2
```bash
sudo npm install -g pm2
cd ../server
npm run init-db && node seed_admin.js
pm2 start server.js --name "wanistream"
pm2 save && pm2 startup
```
Akses panel melalui browser di: `http://IP_VPS_ANDA:5000`

---

## 🔐 Akun Default
- **Username**: `admin`
- **Password**: `admin123`

---

## ❓ Troubleshooting
- **Zombie Streams**: Jika ada stream yang "Error" tapi masih jalan, jalankan `node reset_db.js`.
- **Streaming Buffer**: Gunakan bitrate yang sesuai dengan kecepatan upload internet Anda.

---
## 💡 Panduan Tambahan
- 📘 [Panduan Detail untuk Pemula](file:///C:/Users/husen/.gemini/antigravity/scratch/wanistream/PANDUAN_NEWBIE_DETAIL.md)
- 🌐 [Panduan Web Panel Lokal & VPS](file:///C:/Users/husen/.gemini/antigravity/scratch/wanistream/PANDUAN_PANEL_V2.md)

---
*WANIstream V2 - Streaming Lancar, Hati Tenang.* 🎬🔥
