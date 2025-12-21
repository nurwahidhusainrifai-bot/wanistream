# 🚀 WANIstream V2 - Ultimate YouTube Streaming Manager

WANIstream V2 adalah panel manajemen live streaming YouTube profesional yang dirancang untuk stabilitas 24/7, efisiensi CPU maksimal, dan analisis kompetitor (YouTube Spy).

## ✨ Fitur Unggulan
- **Non-Stop 24/7**: Auto-restart & Auto-resume jika server reboot.
- **Ultra Efficient**: Menggunakan `Copy Codec` (CPU usage hanya ~1-2% per stream).
- **YouTube Spy**: Bongkar tag, hashtag, dan strategi video kompetitor.
- **Multi-Account**: Kelola banyak channel YouTube dalam satu panel.
- **Desktop Mode**: Bisa dijalankan sebagai aplikasi desktop tanpa CMD (Windows).

---

## 🛠️ Persyaratan Sistem
1. **Node.js**: Versi 18 atau lebih baru.
2. **FFmpeg**: Terinstal di sistem (wajib untuk streaming).
3. **YouTube Data API Key**: Untuk fitur otomatisasi dan Spy.

---

## 💻 Cara Instalasi di Laptop / PC (Sangat Mudah!)

Ini adalah cara tercepat agar siapa pun bisa menjalankan WANIstream di laptop mereka sendiri.

### 1. Download & Persiapan
- Pastikan sudah instal **Node.js** (https://nodejs.org/).
- Pastikan sudah instal **FFmpeg**.
- Download folder proyek WANIstream V2 ini.

### 2. Instalasi Sekali Klik (Otomatis)
Di dalam folder proyek, cari file bernama:
👉 **`SETUP_LAPTOP.bat`**
- Klik dua kali file tersebut.
- Tunggu sampai selesai (ini akan menginstal semua keperluan secara otomatis).

### 3. Cara Menjalankan Aplikasi
Setelah instalasi selesai, cukup klik dua kali:
👉 **`WANIstream.vbs`**
- Aplikasi akan terbuka sebagai jendela desktop (Tanpa CMD hitam).
- Login dengan Username: `admin` | Password: `admin123`.

---

## ⚡ Fitur Khusus Laptop/PC
- **Silent Mode**: Berjalan di latar belakang tanpa mengganggu kerja Anda.
- **Low Resource**: Tidak memberatkan laptop jika video source sudah benar.
- **Auto-Recover**: Jika laptop mati lampu/restart, aplikasi bisa disetting auto-run saat login.

---

## ☁️ Cara Instalasi di VPS (Untuk Expert)
*(Gunakan cara ini jika ingin streaming 24 jam tanpa mematikan komputer)*

### 1. Update & Instal FFmpeg
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install ffmpeg -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Instal WANIstream
```bash
mkdir wanistream && cd wanistream
# Upload file proyek ke sini
cd server && npm install
cd ../client && npm install && npm run build
```

### 3. Jalankan dengan PM2 (Agar Jalan Terus)
```bash
sudo npm install -y pm2 -g
cd ../server
pm2 start server.js --name "wanistream-api"
pm2 save
pm2 startup
```

---

## 🔑 Login Default
- **Username**: `admin`
- **Password**: `admin123`

---

## 💡 Tips Streaming 24/7
Untuk menghemat CPU VPS, pastikan video yang Anda upload sudah memiliki format **H.264**. Aplikasi akan otomatis menggunakan mode `Copy` yang tidak memakan beban CPU saat streaming.

---

*WANIstream V2 - Streaming Lancar, Hati Tenang.*
