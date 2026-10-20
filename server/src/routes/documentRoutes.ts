import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getShares,
  addOrUpdateShare,
  removeShare,
} from '../controllers/documentController.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// All document routes require authentication
router.use(authMiddleware);

const createDocSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
});

const updateDocSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  content: z.string().optional(),
});

const shareSchema = z.object({
  userId: z.string().min(1, 'Target userId is required'),
  role: z.enum(['editor', 'viewer'], {
    errorMap: () => ({ message: 'Role must be either "editor" or "viewer"' }),
  }),
});

router.get('/', listDocuments);
router.post('/', validateBody(createDocSchema), createDocument);
router.get('/:id', getDocument);
router.put('/:id', validateBody(updateDocSchema), updateDocument);
router.delete('/:id', deleteDocument);

// Collaborator sharing routes
router.get('/:id/shares', getShares);
router.post('/:id/shares', validateBody(shareSchema), addOrUpdateShare);
router.delete('/:id/shares/:userId', removeShare);

export default router;
