# 🐙 Panduan Upload WANIstream V2 ke GitHub (Gaya Pro)

Dengan mengupload kode ke GitHub, bos bisa membagikan aplikasi ini dengan cara yang lebih profesional (cukup kasih link), mempermudah update fitur, dan memastikan kode bos aman tersimpan di cloud.

---

## 🛠️ Langkah 1: Persiapan Akun & Alat

1. **Buat Akun GitHub**: Daftar gratis di [GitHub.com](https://github.com).
2. **Instal Git Bash**: Ini adalah alat untuk mengirim kode dari laptop ke GitHub.
   - [Download Git for Windows](https://git-scm.com/download/win)
   - Instal seperti biasa (Next sampai selesai).

---

## 📁 Langkah 2: Buat Wadah (Repository) di GitHub

1. Buka profil GitHub bos, klik tombol **New** (atau tanda plus `+` di pojok kanan atas).
2. **Repository Name**: Kasih nama, misal `wanistream-v2`.
3. **Public/Private**:
   - Pilih **Public** jika ingin semua orang bisa download/lihat.
   - Pilih **Private** jika hanya ingin untuk bos sendiri atau orang tertentu.
4. Klik **Create Repository**.
5. Simpan link repository-nya, formatnya akan seperti ini:  
   `https://github.com/username-bos/wanistream-v2.git`

---

## 🚀 Langkah 3: Kirim Kode ke GitHub (Pertama Kali)

Buka folder **wanistream** di laptop bos, klik kanan di area kosong, lalu pilih **"Git Bash Here"**. Masukkan perintah berikut satu per satu:

```bash
# 1. Inisialisasi folder sebagai folder Git
git init

# 2. Tandai semua file untuk dikirim (Otomatis skip file di .gitignore)
git add .

# 3. Beri label versi pertama
git commit -m "WANIstream V2 Pro Release - Gaskan!"

# 4. Hubungkan ke link repository bos tadi
git remote add origin https://github.com/username-bos/wanistream-v2.git

# 5. Kirim kodenya!
git branch -M main
git push -u origin main
```
*(Jika muncul jendela login, silakan login ke akun GitHub bos).*

---

## 🔄 Langkah 4: Cara Update Kode (Kalau Ada Fitur Baru)

Jika bos menambah fitur atau mengubah kode di laptop, bos gak perlu buat repo lagi. Cukup buka Git Bash di folder yang sama lalu ketik:

```bash
git add .
git commit -m "Update: Tambah fitur YouTube Spy"
git push
```
*(Otomatis link GitHub bos akan langsung ter-update).*

---

## 🔗 Langkah 5: Cara Teman Bos Instal dari GitHub

Kasih link GitHub bos tadi ke teman. Mereka cukup buka terminal di laptopnya lalu ketik:

```bash
git clone https://github.com/username-bos/wanistream-v2.git
cd wanistream-v2
# Lalu jalankan instalasi otomatis
./SETUP_LAPTOP.bat
```

---

## 💡 Keuntungan Pakai GitHub:
1. **Branding**: Kelihatan lebih expert dan niat.
2. **Versioning**: Kalau ada kode yang rusak, bos bisa balik ke versi sebelumnya dengan mudah.
3. **Open Collaboration**: Teman bos bisa ikut bantu ngembangin kodenya.

---
*Gaskan bos! Biar WANIstream V2 makin mendunia.* 🌍🚀🎬
