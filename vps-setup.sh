#!/bin/bash

# WANISTREAM VPS Quick Setup Script
# Run this on fresh Ubuntu VPS

echo "🚀 WANISTREAM VPS Setup Starting..."

# Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
echo "📦 Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Create directory
echo "📁 Creating project directory..."
sudo mkdir -p /var/www
cd /var/www

echo "✅ Dependencies installed!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your WANISTREAM project to /var/www/wanistream"
echo "2. cd /var/www/wanistream/server && npm install"
echo "3. Copy .env.example to .env and configure"
echo "4. npm run init-db && npm run create-admin"
echo "5. cd ../client && npm install && npm run build"
echo "6. pm2 start ecosystem.config.js"
echo "7. Configure Nginx (see DEPLOYMENT.md)"
echo ""
echo "🎉 Setup script complete!"
