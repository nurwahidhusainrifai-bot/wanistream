# 🌐 Panduan Instalasi WANIstream V2 (Web Panel Edition)

Panduan ini menjelaskan cara menginstal **WANIstream V2** sebagai Web Panel yang bisa diakses melalui browser, baik di laptop lokal maupun di VPS (Cloud Server).

---

## 🛠️ Persyaratan Utama (Wajib)

Sebelum memulai, pastikan perangkat Anda sudah terinstal:
1. **Node.js (v20+)**: Mesin untuk menjalankan aplikasi. [Download di sini](https://nodejs.org/).
2. **FFmpeg**: Mesin untuk memproses video & streaming. [Download di sini](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip).
   - *Tips untuk Windows*: Copy `ffmpeg.exe` ke folder `server` agar aplikasi langsung mengenalnya.

---

## 💻 1. Instalasi di Laptop / PC Lokal

Cara ini digunakan jika Anda ingin menjadikan laptop Anda sendiri sebagai pusat kendali streaming.

### Langkah-Langkah:
1. **Ekstrak File**: Buka folder proyek WANIstream V2.
2. **Instalasi Otomatis**:
   - Double-klik file **`SETUP_LAPTOP.bat`**.
   - Tunggu hingga proses selesai (muncul tulisan "BERHASIL").
3. **Menjalankan Panel**:
   - Double-klik file **`start_wanistream_local.bat`**.
   - Akan muncul dua jendela CMD (Backend & Frontend). **Jangan ditutup!**
4. **Akses Dashboard**:
   - Browser Anda akan otomatis terbuka ke alamat: **`http://localhost:5173`**.
   - Jika tidak terbuka otomatis, ketik alamat tersebut secara manual di Chrome/Edge.

---

## ☁️ 2. Instalasi di VPS (Ubuntu 20.04/22.04)

Gunakan cara ini jika Anda ingin streaming jalan terus 24 jam tanpa harus menyalakan laptop.

### Langkah-Langkah:
1. **Persiapan Sistem**:
   Ketik perintah berikut di terminal SSH Anda:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install ffmpeg git -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. **Kloning & Instalasi**:
   ```bash
   git clone https://github.com/user/wanistream-v2
   cd wanistream-v2
   # Instal Backend
   cd server && npm install
   # Instal Frontend
   cd ../client && npm install && npm run build
   ```

3. **Konfigurasi Database & Admin**:
   ```bash
   cd ../server
   npm run init-db
   node seed_admin.js
   ```

4. **Menjalankan dengan PM2 (Background Mode)**:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "wanistream-api"
   pm2 save && pm2 startup
   ```

5. **Akses Panel**:
   - Web Panel Production (setelah build) akan dilayani oleh Backend di port **5000**.
   - Buka browser dan ketik: **`http://IP_VPS_ANDA:5000`**.

---

## ⚙️ Konfigurasi .env (Penting!)

Agar fitur YouTube otomatis berjalan, Anda wajib mengisi kredensial di file **`server/.env`**:
- `YOUTUBE_CLIENT_ID`: ID dari Google Cloud Console.
- `YOUTUBE_CLIENT_SECRET`: Secret dari Google Cloud Console.
- `JWT_SECRET`: Isi dengan kode acak bebas.

---

## 🔑 Detail Login Default
- **Halaman Login**: `http://localhost:5173` (Lokal) atau `http://IP-VPS:5000` (VPS).
- **Username**: `admin`
- **Password**: `admin123`

---

## 💡 Tips Streaming Panel
- **Browser**: Gunakan Google Chrome versi terbaru untuk performa terbaik.
- **Port**: Pastikan port 5000 (Backend) dan 5173 (Dev Frontend) tidak diblokir oleh Firewall/UFW.
- **Monitoring**: Cek kartu "Internet Mbps" di Dashboard untuk melihat beban upload secara real-time.

---
*WANIstream V2 Panel - Kendali Streaming dalam Genggaman.* 🎬🔥
