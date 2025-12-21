#!/bin/bash
echo "=== TIMPA TOTAL SERVER.JS ==="
cd /opt/wanistream

# Backup dulu biar aman
cp server/server.js server/server.js.bak

# Tulis ulang file server.js dari nol
cat << 'JS' > server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/auth.js';
import youtubeRoutes from './src/routes/youtube.js';
import streamRoutes from './src/routes/streams.js';
import systemRoutes from './src/routes/system.js';
import videosRoutes from './src/routes/videos.js';

// Import services
import { startScheduler } from './src/services/schedulerService.js';
import { resumeActiveStreams } from './src/services/streamingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // Allow all for debugging
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/videos', videosRoutes);

// === BAGIAN KRUSIAL: SERVE FRONTEND ===
// Kita hapus pengecekan "process.env.NODE_ENV"
// Langsung paksa baca folder '../client/dist'
const clientDistPath = path.join(__dirname, '../client/dist');

console.log('Static files path:', clientDistPath);

app.use(express.static(clientDistPath));

// SPA Fallback - Semua route lain lari ke index.html
app.get('*', (req, res) => {
    // Jangan redirect API call ke index.html (biar ketahuan kalau 404)
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API Route not found' });
    }
    
    // Kirim file index.html
    res.sendFile(path.join(clientDistPath, 'index.html'));
});
// ======================================

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving Frontend from: ${clientDistPath}`);
    
    // Start services
    startScheduler();
    resumeActiveStreams();
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    try {
        const { stopAllStreams } = await import('./src/services/streamingService.js');
        await stopAllStreams();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
JS

# Restart PM2
pm2 restart all

echo "=== SELESAI. SERVER SUDAH DIPAKSA. SILAKAN REFRESH. ==="
