#!/bin/bash

echo "==========================================="
echo "   MEMPERBAIKI TAMPILAN WANISTREAM VPS"
echo "==========================================="

# 1. Perbaiki server.js (Mengarah ke folder dist)
echo "[1/3] Memperbaiki konfigurasi server.js..."
if grep -q "../client'" server/server.js; then
    sed -i "s|../client'|../client/dist'|g" server/server.js
    echo "Using single quotes fix"
elif grep -q '../client"' server/server.js; then
    sed -i 's|../client"|../client/dist"|g' server/server.js
    echo "Using double quotes fix"
else
    echo "server.js mungkin sudah benar atau beda format. Melanjutkan..."
fi

# 2. Build Frontend
echo "[2/3] Melakukan Build Frontend (proses ini agak lama)..."
cd client
if [ ! -d "node_modules" ]; then
    echo "Menginstall library frontend..."
    npm install
fi

echo "Compiling assets..."
npm run build

if [ ! -d "dist" ]; then
    echo "ERROR: Gagal membuat folder dist. Cek error di atas."
    exit 1
fi
cd ..

# 3. Restart Server
echo "[3/3] Merestart Aplikasi..."
if command -v pm2 &> /dev/null; then
    pm2 restart wanistream-api || pm2 restart all
else
    echo "PM2 tidak ditemukan. Silakan restart manual."
fi

echo "==========================================="
echo "   SELESAI! SILAKAN CEK WEB ANDA SEKARANG"
echo "==========================================="
