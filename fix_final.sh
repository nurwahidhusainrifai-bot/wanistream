#!/bin/bash
# Pastikan di root wanistream
cd /opt/wanistream

echo "=== FINAL FIX ==="

# 1. Fix index.html (tambah type="module" kalau belum ada)
# Kita tulis ulang saja biar pasti benar formatnya
cat << 'HTML' > client/index.html
<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WANISTREAM - YouTube Streaming Panel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div id="root"></div>
    <!-- PENTING: type="module" harus ada -->
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
HTML

# 2. Fix Server JS (Paksa arahkan ke dist)
# Kita gunakan sed yang sangat spesifik
sed -i "s|path.join(__dirname, '../client')|path.join(__dirname, '../client/dist')|g" server/server.js
# Backup plan kalau formatnya beda
sed -i "s|'../client'|'../client/dist'|g" server/server.js

# 3. Build Ulang
echo "Rebuilding..."
cd client
npm run build
cd ..

# 4. Restart Server
pm2 restart all

echo "=== SELESAI === "
