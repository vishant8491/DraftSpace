import { Router } from 'express';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getShares,
  addShare,
  removeShare,
  importDocument,
} from '../controllers/documentController.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure Multer for UTF-8 .txt uploads (1 MiB limit, in-memory buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1 MiB transport limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt') {
      cb(null, true);
    } else {
      const err: any = new Error('Only UTF-8 plain text (.txt) files are supported.');
      err.statusCode = 400;
      err.code = 'UNSUPPORTED_FILE_TYPE';
      cb(err);
    }
  },
});

// All document routes require authenticated session
router.use(authMiddleware);

// Document collection & import
router.get('/', listDocuments);
router.post('/', createDocument);
router.post('/import', upload.single('file'), importDocument);

// Single document operations
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.put('/:id', updateDocument); // Backward-compatible alias
router.delete('/:id', deleteDocument);

// Collaborator sharing
router.get('/:id/shares', getShares);
router.post('/:id/shares', addShare);
router.delete('/:id/shares/:userId', removeShare);

export default router;
