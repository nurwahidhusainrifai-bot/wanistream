#!/bin/bash

# Script Install RDP Hemat (XFCE + Chrome)
# Usage: sudo bash install_rdp.sh

echo "📦 Updating system..."
sudo apt update

echo "🖥️ Installing XFCE (Lightweight Desktop)..."
sudo apt install -y xfce4 xfce4-goodies

echo "🔌 Installing XRDP (Remote Desktop Server)..."
sudo apt install -y xrdp
sudo adduser xrdp ssl-cert
echo "xfce4-session" > ~/.xsession
sudo systemctl restart xrdp

echo "🌐 Installing Google Chrome..."
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
rm google-chrome-stable_current_amd64.deb

echo "✅ INSTALLATION COMPLETE!"
echo "================================================"
echo "Cara Pakai:"
echo "1. Buka 'Remote Desktop Connection' di Laptop Windows."
echo "2. Masukkan IP VPS ini."
echo "3. Login pakai username: root (atau user lain) & password VPS."
echo "================================================"
echo "⚠️ PENTING: Matikan Chrome kalau sudah selesai upload biar RAM lega!"
