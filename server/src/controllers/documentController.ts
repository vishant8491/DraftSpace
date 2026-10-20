import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { validateEditorContent, convertTextToEditorJson } from '../utils/editorValidator.js';
import path from 'path';

const DEFAULT_EMPTY_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

/**
 * GET /api/documents
 * List all documents accessible to the current user (strictly segregated into owned and shared)
 */
export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;

    // 1. Documents owned by current user
    const owned = await prisma.document.findMany({
      where: { ownerId: user.id },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 2. Documents shared with current user
    const shares = await prisma.documentShare.findMany({
      where: { userId: user.id },
      include: {
        document: {
          include: {
            owner: { select: { id: true, displayName: true, email: true } },
            shares: {
              include: {
                user: { select: { id: true, displayName: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const shared = shares.map((s) => ({
      ...s.document,
      role: 'editor' as const,
      sharedAt: s.createdAt,
    }));

    res.json({
      owned: owned.map((d) => ({ ...d, role: 'owner' as const })),
      shared,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents
 * Create a new document. The creating user is always the owner.
 */
export async function createDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { title, content } = req.body;

    let cleanTitle = 'Untitled Document';
    if (title !== undefined) {
      if (typeof title !== 'string') {
        res.status(400).json({ error: 'Title must be a string.', code: 'INVALID_TITLE' });
        return;
      }
      cleanTitle = title.trim();
      if (cleanTitle.length < 1 || cleanTitle.length > 120) {
        res.status(400).json({
          error: 'Document title must be between 1 and 120 characters.',
          code: 'INVALID_TITLE_LENGTH',
        });
        return;
      }
    }

    let initialContentJson = DEFAULT_EMPTY_DOC;
    if (content !== undefined) {
      const valResult = validateEditorContent(content);
      if (!valResult.valid) {
        res.status(400).json({
          error: `Invalid editor content: ${valResult.error}`,
          code: 'INVALID_CONTENT',
        });
        return;
      }
      initialContentJson = valResult.jsonString!;
    }

    const document = await prisma.document.create({
      data: {
        title: cleanTitle,
        content: initialContentJson,
        ownerId: user.id, // Strictly server-resolved identity
        version: 1, // Concurrency version starts at 1
      },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        shares: true,
      },
    });

    res.status(201).json({
      document: {
        ...document,
        role: 'owner',
      },
      version: document.version,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id
 * Retrieve a document by ID. Enforces strict read permission.
 */
export async function getDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    // Determine user's access role
    let role: 'owner' | 'editor' | null = null;
    if (document.ownerId === user.id) {
      role = 'owner';
    } else if (document.shares.some((s) => s.userId === user.id)) {
      role = 'editor';
    }

    if (!role) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to view this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    res.json({
      document,
      role,
      version: document.version,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/documents/:id (and PUT /api/documents/:id)
 * Optimistic concurrency control: updates document only if client version matches.
 * Owners can rename and edit content.
 * Shared editors can ONLY edit content; title renames are rejected atomically.
 */
export async function updateDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { version, title, content } = req.body;

    // Validate version presence for optimistic concurrency
    if (version === undefined || typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      res.status(400).json({
        error: 'An integer "version" is required for optimistic concurrency.',
        code: 'MISSING_VERSION',
      });
      return;
    }

    if (title === undefined && content === undefined) {
      res.status(400).json({
        error: 'At least one of "title" or "content" must be provided to update.',
        code: 'NO_UPDATE_DATA',
      });
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        shares: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    const isOwner = document.ownerId === user.id;
    const isEditor = document.shares.some((s) => s.userId === user.id);

    if (!isOwner && !isEditor) {
      res.status(403).json({
        error: 'Forbidden: You do not have permission to edit this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    // Role Rule: Only owners can rename documents.
    // If a shared editor attempts to update title (even in a mixed update), reject atomically.
    if (title !== undefined && !isOwner) {
      res.status(403).json({
        error: 'Forbidden: Only the document owner can rename this document.',
        code: 'FORBIDDEN_RENAME',
      });
      return;
    }

    // Validate title format if provided
    let cleanTitle: string | undefined;
    if (title !== undefined) {
      if (typeof title !== 'string') {
        res.status(400).json({ error: 'Title must be a string.', code: 'INVALID_TITLE' });
        return;
      }
      cleanTitle = title.trim();
      if (cleanTitle.length < 1 || cleanTitle.length > 120) {
        res.status(400).json({
          error: 'Document title must be between 1 and 120 characters.',
          code: 'INVALID_TITLE_LENGTH',
        });
        return;
      }
    }

    // Validate editor content if provided
    let contentJsonString: string | undefined;
    if (content !== undefined) {
      const valResult = validateEditorContent(content);
      if (!valResult.valid) {
        res.status(400).json({
          error: `Invalid editor content: ${valResult.error}`,
          code: 'INVALID_CONTENT',
        });
        return;
      }
      contentJsonString = valResult.jsonString!;
    }

    // Optimistic Concurrency Check: verify client version matches current version
    if (document.version !== version) {
      res.status(409).json({
        error: 'Conflict: Document has been modified by another session. Please reload to avoid overwriting.',
        code: 'CONCURRENCY_CONFLICT',
        currentVersion: document.version,
      });
      return;
    }

    // Atomic update incrementing version
    const updated = await prisma.document.update({
      where: {
        id,
        version, // Ensures atomic condition
      },
      data: {
        ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
        ...(contentJsonString !== undefined ? { content: contentJsonString } : {}),
        version: { increment: 1 },
      },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
      },
    });

    res.json({
      document: updated,
      version: updated.version,
      role: isOwner ? 'owner' : 'editor',
    });
  } catch (error: any) {
    // Catch potential race condition where version changed between read and write
    if (error.code === 'P2025') {
      res.status(409).json({
        error: 'Conflict: Document version mismatch during write.',
        code: 'CONCURRENCY_CONFLICT',
      });
      return;
    }
    next(error);
  }
}

/**
 * DELETE /api/documents/:id
 * Only the document owner can delete.
 */
export async function deleteDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Forbidden: Only the document owner can delete this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/documents/:id/shares
 * List active shares. Allowed only for the document owner.
 */
export async function getShares(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Forbidden: Only the document owner can list collaborators.',
        code: 'FORBIDDEN',
      });
      return;
    }

    const shares = await prisma.documentShare.findMany({
      where: { documentId: id },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(shares);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/:id/shares
 * Grant collaborator access. Owner only. Rejects self-sharing and unknown users.
 * Idempotent and duplicate-safe via database unique constraint.
 */
export async function addShare(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'Target "userId" is required.',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Forbidden: Only the document owner can grant sharing access.',
        code: 'FORBIDDEN',
      });
      return;
    }

    // Validation: Self-sharing rejection
    if (userId === user.id) {
      res.status(400).json({
        error: 'Cannot share document with yourself; you are already the owner.',
        code: 'SELF_SHARE_REJECTED',
      });
      return;
    }

    // Validation: Target user existence
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: `Target user with ID "${userId}" not found.`,
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Idempotent upsert preventing duplicate rows via @@unique([documentId, userId])
    const share = await prisma.documentShare.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId,
        },
      },
      update: {}, // Safe idempotent re-grant
      create: {
        documentId: id,
        userId,
      },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    res.status(200).json({
      message: 'Access granted successfully.',
      share,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/documents/:id/shares/:userId
 * Revoke collaborator access. Owner only.
 */
export async function removeShare(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id, userId } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Forbidden: Only the document owner can revoke access.',
        code: 'FORBIDDEN',
      });
      return;
    }

    await prisma.documentShare.deleteMany({
      where: {
        documentId: id,
        userId,
      },
    });

    res.json({
      success: true,
      message: 'Collaborator access revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/documents/import
 * Import UTF-8 .txt or .md file as a new document stored as validated editor JSON.
 */
export async function importDocument(
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

    // Title from body or original filename
    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    let title = (req.body.title && req.body.title.trim()) || baseName || 'Imported Document';
    if (title.length > 120) {
      title = title.substring(0, 120);
    }

    // Convert raw text into valid Tiptap ProseMirror JSON
    const editorJson = convertTextToEditorJson(textContent);
    const jsonString = JSON.stringify(editorJson);

    const document = await prisma.document.create({
      data: {
        title,
        content: jsonString,
        ownerId: user.id,
        version: 1,
      },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        shares: true,
      },
    });

    res.status(201).json({
      message: 'File imported successfully as a new document.',
      document: {
        ...document,
        role: 'owner',
      },
      version: document.version,
    });
  } catch (error) {
    next(error);
  }
}
