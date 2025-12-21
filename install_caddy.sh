#!/bin/bash

# Script Install Caddy & Auto-Config HTTPS
# Jalankan dengan: sudo bash install_caddy.sh

echo "========================================="
echo "   Mulai Install HTTPS (Caddy)           "
echo "========================================="

# 1. Install Caddy
echo "[1/5] Install Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y

# 2. Deteksi IP & Domain
echo "[2/5] Deteksi IP..."
IP_ADDRESS=$(curl -s ifconfig.me)
DOMAIN="$IP_ADDRESS.nip.io"
echo "Domain Anda: $DOMAIN"

# 3. Buat Konfigurasi Caddy
echo "[3/5] Konfigurasi Caddy..."
sudo bash -c "cat > /etc/caddy/Caddyfile" <<EOF
$DOMAIN {
    reverse_proxy localhost:5000
}
EOF

# 4. Update File .env Otomatis
echo "[4/5] Update File .env..."
# Coba cari file .env di beberapa lokasi kemungkinan
ENV_FILE=""
if [ -f "/root/Desktop/wanistream/server/.env" ]; then
    ENV_FILE="/root/Desktop/wanistream/server/.env"
elif [ -f "/var/www/wanistream/server/.env" ]; then
    ENV_FILE="/var/www/wanistream/server/.env"
fi

if [ ! -z "$ENV_FILE" ]; then
    echo "File .env ditemukan di: $ENV_FILE"
    # Backup dulu
    cp "$ENV_FILE" "$ENV_FILE.bak"
    
    # Ganti URL lama dengan HTTPS baru
    # Hapus baris lama
    sed -i '/FRONTEND_URL=/d' "$ENV_FILE"
    sed -i '/YOUTUBE_REDIRECT_URI=/d' "$ENV_FILE"
    
    # Tambahkan baris baru
    echo "" >> "$ENV_FILE"
    echo "FRONTEND_URL=https://$DOMAIN" >> "$ENV_FILE"
    echo "YOUTUBE_REDIRECT_URI=https://$DOMAIN/api/youtube/callback" >> "$ENV_FILE"
    
    echo "File .env berhasil diupdate!"
else
    echo "WARNING: File .env tidak ditemukan otomatis."
    echo "Silakan edit manual nanti."
fi

# 5. Restart Semuanya
echo "[5/5] Restart Service..."
sudo systemctl restart caddy
pm2 restart wanistream-api

echo "========================================="
echo "   SUKSES! HTTPS AKTIF 🔒                "
echo "========================================="
echo "Sekarang buka di browser:"
echo "👉 https://$DOMAIN"
echo ""
echo "PENTING: Update Google Console Redirect URI jadi:"
echo "👉 https://$DOMAIN/api/youtube/callback"
echo "========================================="
