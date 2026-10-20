import { Router } from 'express';
import {
  getDemoUsers,
  createDemoSession,
  deleteSession,
  getMe,
} from '../controllers/demoSessionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Demo Identity Endpoints
router.get('/demo-users', getDemoUsers);
router.post('/demo-session', createDemoSession);
router.delete('/session', authMiddleware, deleteSession);
router.get('/me', authMiddleware, getMe);

// Backward-compatible auth route aliases
router.get('/auth/users', getDemoUsers);
router.post('/auth/login', createDemoSession);
router.get('/auth/me', authMiddleware, getMe);

export default router;
