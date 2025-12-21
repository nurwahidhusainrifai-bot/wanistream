import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { login, getMe } from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getMe);

export default router;
