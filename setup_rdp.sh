#!/bin/bash

# Script Install RDP (XFCE + XRDP) untuk Ubuntu VPS
# Jalankan script ini dengan: sudo bash setup_rdp.sh

echo "========================================="
echo "   Mulai Install RDP (XFCE Desktop)      "
echo "========================================="

# 1. Update System
echo "[1/5] Update system..."
sudo apt update && sudo apt upgrade -y

# 2. Install XFCE4 (Tampilan Desktop Ringan)
echo "[2/5] Install XFCE4 Desktop..."
sudo apt install -y xfce4 xfce4-goodies

# 3. Install XRDP (Server RDP)
echo "[3/5] Install XRDP..."
sudo apt install -y xrdp
sudo systemctl enable xrdp
sudo systemctl start xrdp

# 4. Konfigurasi XRDP agar pakai XFCE
echo "[4/5] Konfigurasi XRDP..."
echo "xfce4-session" > ~/.xsession
# Fix untuk beberapa versi Ubuntu agar tidak error screen blank
sudo sed -i.bak '/fi/a #xrdp multiple users configuration \n xfce4-session \n' /etc/xrdp/startwm.sh

# Izinkan user xrdp akses sertifikat ssl
sudo adduser xrdp ssl-cert

# 5. Buka Firewall Port 3389 (RDP) & 5000 (Web Panel)
echo "[5/5] Buka Firewall..."
sudo ufw allow 3389
sudo ufw allow 5000

# Restart XRDP
sudo systemctl restart xrdp

echo "========================================="
echo "   INSTALASI SELESAI!                    "
echo "========================================="
echo "Sekarang Anda bisa connect dari Windows:"
echo "1. Buka aplikasi 'Remote Desktop Connection'"
echo "2. Masukkan IP VPS Anda"
echo "3. Login dengan username & password VPS Anda"
echo "========================================="
