import { Router } from 'express';
import { getUsers, getMe, switchUser } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const switchUserSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

// Public endpoint to get list of available demo users
router.get('/users', getUsers);

// Switch active demo user (server-issued session)
router.post('/login', validateBody(switchUserSchema), switchUser);

// Protected: get current authenticated user
router.get('/me', authMiddleware, getMe);

export default router;
