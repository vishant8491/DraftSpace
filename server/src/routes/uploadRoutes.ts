import { Router } from 'express';
import { importTextFile, uploadMiddleware } from '../controllers/uploadController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Upload requires authentication
router.use(authMiddleware);

// Single file field named 'file'
router.post('/import', uploadMiddleware.single('file'), importTextFile);

export default router;
