# 📔 Panduan Instalasi WANIstream V2 (Edisi Super Detail)

Panduan ini dibuat khusus agar siapa pun, bahkan yang belum pernah ngoding, bisa menginstal WANIstream V2 di laptop/PC sendiri.

---

## 🛠️ Langkah 1: Persiapan Bahan (Wajib Download)

Silakan download 2 bahan utama berikut ini:

### 1. Mesin Node.js
Node.js adalah "bensin" agar aplikasi ini bisa berjalan.
- **Link**: [https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi](https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi)
- **Cara**: Klik link di atas, lalu instal seperti instal aplikasi biasa (Klik *Next* terus sampai selesai).

### 2. Mesin FFmpeg
FFmpeg adalah alat pengolah video agar streaming bos lancar.
- **Link**: [Download FFmpeg Essentials](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
- **Cara Instal (Penting!)**:
    1. Ekstrak file `.zip` yang sudah didownload.
    2. Masuk ke folder hasil ekstrak, cari folder bernama **`bin`**.
    3. Di dalam folder `bin`, bos akan melihat file **`ffmpeg.exe`**.
    4. **Tips Gampang**: Copy file `ffmpeg.exe` tersebut, lalu paste ke dalam folder **`server`** di proyek WANIstream bos. Ini cara paling gampang biar bos gak perlu ribet setting Environment Variables.

---

## 🚀 Langkah 2: Proses Instalasi Otomatis

Setelah bahan di atas siap, ikuti langkah ini:

1. Buka folder **`wanistream`** milik bos.
2. Cari file bernama 👉 **`SETUP_LAPTOP.bat`**.
3. Klik kanan file tersebut, lalu pilih **"Run as Administrator"** (biar lancar jaya).
4. Sebuah jendela hitam akan muncul. **Biarkan saja sampai selesai**. Dia sedang mendownload modul-modul yang diperlukan secara otomatis.
5. Jika muncul tulisan *"INSTALASI BERHASIL"*, bos tinggal tekan tombol apa saja untuk menutupnya.

---

## 🎬 Langkah 3: Cara Menjalankan Aplikasi

Sekarang WANIstream sudah siap dipakai. Cara bukanya:

1. Di folder utama, cari file bernama 👉 **`WANIstream.vbs`**.
2. Klik dua kali file tersebut.
3. Tunggu sekitar 5-10 detik (aplikasi sedang menyiapkan server di latar belakang).
4. Sebuah jendela aplikasi cantik akan muncul secara otomatis!

---

## 🔑 Langkah 4: Login & Penggunaan

- **Username**: `admin`
- **Password**: `admin123`

### 💡 Tips Cepat:
1. Masukkan video ke folder `server/videos` secara manual.
2. Buka **Video Library** di aplikasi untuk melihat daftar video.
3. Gunakan menu **Manual** untuk streaming pakai Stream Key.

---

## ❓ Tanya Jawab (Troubleshooting)

**Q: Kenapa aplikasinya gak muncul pas diklik WANIstream.vbs?**
*A: Pastikan bos sudah instal Node.js di Langkah 1. Cobalah restart laptop bos sekali.*

**Q: Kok streamingnya macet?**
*A: Gunakan internet yang stabil. Untuk laptop, disarankan pakai kabel LAN atau Wifi yang kencang.*

**Q: Cara ganti password gmana?**
*A: Masuk ke aplikasi, nanti ada menu pengaturan akun.*

---
*Gass streaming sekarang bos! Kalau bingung, tanya lagi ya.* 🎬🔥
