#!/bin/bash

# Pastikan dijalankan sebagai root atau sudo
if [ "$EUID" -ne 0 ]; then 
  echo "Tolong jalankan sebagai root (sudo su)"
  exit 1
fi

OLD_DIR="/opt/wanistream"
NEW_DIR="/opt/wanistream_v2"

echo "=================================================="
echo "   🚀 MEMULAI INSTALASI WANISTREAM V2 (FRESH) 🚀"
echo "=================================================="

# 1. Stop Proses Lama
echo "[1/6] Menghentikan Wanistream Lama..."
pm2 stop wanistream-api 2>/dev/null || pm2 stop all
pm2 delete wanistream-api 2>/dev/null

# 2. Siapkan Rumah Baru
echo "[2/6] Menyiapkan Folder Baru ($NEW_DIR)..."
if [ -d "$NEW_DIR" ]; then
    echo "      Folder v2 sudah ada, membackup..."
    mv "$NEW_DIR" "${NEW_DIR}_bak_$(date +%s)"
fi
mkdir -p "$NEW_DIR"

# 3. Copy Data (Source Code + DB + Uploads)
echo "[3/6] Mengcopy Data Penting..."
# Copy semua kecuali node_modules dan dist (biar bersih)
rsync -av --progress "$OLD_DIR/" "$NEW_DIR/" --exclude node_modules --exclude dist --exclude .git

cd "$NEW_DIR"

# 4. INJECT CODE FIX (PENTING!)
echo "[4/6] Menimpa File dengan Versi Perbaikan..."

# FIX A: Server (Paksa Dist)
cat << 'SERVER_JS' > server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/auth.js';
import youtubeRoutes from './src/routes/youtube.js';
import streamRoutes from './src/routes/streams.js';
import systemRoutes from './src/routes/system.js';
import videosRoutes from './src/routes/videos.js';
import { startScheduler } from './src/services/schedulerService.js';
import { resumeActiveStreams } from './src/services/streamingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/videos', videosRoutes);

// FORCE SERVE DIST
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({error: 'API Not Found'});
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`WANISTREAM V2 Running on Port ${PORT}`);
    startScheduler();
    resumeActiveStreams();
});
SERVER_JS

# FIX B: Index HTML
cat << 'HTML' > client/index.html
<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WANISTREAM V2</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
HTML

# FIX C: Manual Mode (Safe Version)
cat << 'JSX' > client/src/pages/ManualMode.jsx
import { useState, useEffect } from 'react';
import { videos } from '../utils/api';
import { useLocation } from 'react-router-dom';

export default function ManualMode() {
    const [videoList, setVideoList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [formData, setFormData] = useState({ streamKey: '', title: '', videoId: '' });

    useEffect(() => {
        videos.getAll()
          .then(res => setVideoList(Array.isArray(res.data) ? res.data : []))
          .catch(() => setVideoList([]));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setStatus({});
        try {
            const res = await fetch('/api/streams/manual-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+localStorage.getItem('token') },
                body: JSON.stringify(formData)
            });
            if(!res.ok) throw new Error('Gagal Start');
            setStatus({ type: 'success', msg: 'STREAM V2 BERHASIL JALAN!' });
        } catch (err) { setStatus({ type: 'error', msg: err.message }); }
        setLoading(false);
    };

    return (
        <div className="p-8 text-white">
            <h1 className="text-3xl font-bold mb-6 text-green-400">WANISTREAM V2 IS ACTIVE</h1>
            
            {status.msg && (
                <div className={`p-4 mb-4 rounded ${status.type === 'error' ? 'bg-red-900' : 'bg-green-900'}`}>
                    {status.msg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-6 rounded-xl">
                <div>
                    <label>Stream Key</label>
                    <input className="w-full bg-gray-700 p-3 rounded mt-1" type="password" required
                        value={formData.streamKey} onChange={e => setFormData({...formData, streamKey: e.target.value})} />
                </div>
                <div>
                    <label>Pilih Video</label>
                    <select className="w-full bg-gray-700 p-3 rounded mt-1" required
                        value={formData.videoId} onChange={e => setFormData({...formData, videoId: e.target.value})}>
                        <option value="">-- Pilih Video --</option>
                        {videoList.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 p-4 rounded font-bold mt-4">
                    {loading ? 'Sabar...' : 'GAS V2 LIVE!'}
                </button>
            </form>
        </div>
    );
}
JSX

# 5. Instalasi Bersih
echo "[5/6] Menginstall Dependencies (Agak Lama)..."
npm install --legacy-peer-deps

echo "      Membangun Frontend..."
cd client
npm install --legacy-peer-deps
npm run build
cd ..

# 6. Start V2
echo "[6/6] Menjalankan Wanistream V2..."
pm2 start ecosystem.config.js
pm2 save

echo "=================================================="
echo "   ✅ WANISTREAM V2 SIAP DIGUNAKAN! "
echo "   Silakan Refresh Browser Anda."
echo "=================================================="
