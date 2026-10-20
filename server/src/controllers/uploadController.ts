import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

// Multer memory storage configuration
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.md' || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error('Only plain text (.txt) and markdown (.md) files are supported.'));
    }
  },
});

function convertTextToHtml(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const htmlBlocks: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('# ')) {
      htmlBlocks.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      htmlBlocks.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      htmlBlocks.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      htmlBlocks.push(`<ul><li>${escapeHtml(trimmed.slice(2))}</li></ul>`);
    } else if (/^\d+\.\s/.test(trimmed)) {
      htmlBlocks.push(`<ol><li>${escapeHtml(trimmed.replace(/^\d+\.\s/, ''))}</li></ol>`);
    } else {
      htmlBlocks.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }

  return htmlBlocks.length > 0 ? htmlBlocks.join('\n') : '<p></p>';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function importTextFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        error: 'No file uploaded. Please upload a UTF-8 .txt or .md file.',
        code: 'MISSING_FILE',
      });
      return;
    }

    const textContent = file.buffer.toString('utf-8');

    // Derive document title from filename
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const title = (req.body.title && req.body.title.trim()) || baseName || 'Imported Document';

    // Format content into semantic HTML for Tiptap
    const htmlContent = convertTextToHtml(textContent);

    const document = await prisma.document.create({
      data: {
        title,
        content: htmlContent,
        ownerId: user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        shares: true,
      },
    });

    res.status(201).json({
      message: 'File imported successfully as a new document',
      document: {
        ...document,
        role: 'owner',
      },
    });
  } catch (error) {
    next(error);
  }
}
