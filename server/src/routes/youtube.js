import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
    getAuthUrl,
    handleCallback,
    getAccounts,
    deleteAccount,
    setActiveAccount,
    uploadVideoHandler,
    syncStatsHandler,
    analyzeYouTubeStrategy
} from '../controllers/youtubeController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Get OAuth URL
router.get('/auth-url', authMiddleware, getAuthUrl);

// OAuth callback (no auth required)
router.get('/callback', handleCallback);

// Manage accounts
router.get('/accounts', authMiddleware, getAccounts);
router.delete('/accounts/:id', authMiddleware, deleteAccount);
router.put('/accounts/:id/active', authMiddleware, setActiveAccount);

// Upload Video
router.post('/upload', authMiddleware, upload.single('video'), uploadVideoHandler);

// Sync Stats
router.post('/sync', authMiddleware, syncStatsHandler);

// YouTube Spy (Analyze Strategy)
router.get('/spy', authMiddleware, analyzeYouTubeStrategy);

export default router;
