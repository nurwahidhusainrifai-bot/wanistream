import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
    upload,
    createManualStream,
    getActiveStreams,
    getScheduledStreams,
    getStreamHistory,
    endStreamController,
    editStream,
    restreamController,
    getStreamStats,
    startManualKeyStream,
    stopManualKeyStream,
    createAutoStream,
    deleteStream,
    emergencyCleanupController
} from '../controllers/streamController.js';

const router = express.Router();

// Manual stream with stream key (from YT Studio)
router.post('/manual-key', authMiddleware, startManualKeyStream);
router.post('/stop-manual', authMiddleware, stopManualKeyStream);

// Auto stream with YouTube API
router.post('/auto', authMiddleware, upload.single('thumbnail'), createAutoStream);

// Legacy manual stream with file upload
router.post(
    '/manual',
    authMiddleware,
    upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
    createManualStream
);

router.get('/active', authMiddleware, getActiveStreams);
router.get('/scheduled', authMiddleware, getScheduledStreams);
router.get('/history', authMiddleware, getStreamHistory);
router.get('/stats', authMiddleware, getStreamStats);

router.put('/:id/end', authMiddleware, endStreamController);
router.put('/:id/edit', authMiddleware, editStream);
router.post('/:id/restream', authMiddleware, restreamController);
router.delete('/:id', authMiddleware, deleteStream);
router.get('/emergency-clear', authMiddleware, emergencyCleanupController);

export default router;
