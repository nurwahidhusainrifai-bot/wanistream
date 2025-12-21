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
import { resumeActiveStreams, startHealthMonitoring } from './src/services/streamingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// dotenv.config(); // Loaded via import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
    // Serve Raw Client (No Build Check)
    const clientDistPath = path.join(__dirname, '../client/dist');
    app.use(express.static(clientDistPath));

    // SPA Fallback
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
} else {
    // 404 handler for API in dev mode
    app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
    });
}

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║      🎬  WANISTREAM API SERVER  🎬        ║
║                                           ║
║  Server running on port ${PORT}            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);

    // Start stream scheduler
    startScheduler();

    // Resume active streams (Auto-Resume)
    resumeActiveStreams();

    console.log('\n✓ All services initialized');
    console.log(`\n📡 API: http://localhost:${PORT}`);
    console.log(`📚 Health: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    try {
        const { stopAllStreams } = await import('./src/services/streamingService.js');
        await stopAllStreams();
        console.log('Cleanup finished. Exiting.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
