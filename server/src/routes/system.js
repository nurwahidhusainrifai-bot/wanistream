import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getCachedSystemStats } from '../controllers/systemController.js';

const router = express.Router();

router.get('/stats', authMiddleware, getCachedSystemStats);

export default router;
