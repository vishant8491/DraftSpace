import { Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function listDocuments(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;

    // Owned documents
    const owned = await prisma.document.findMany({
      where: { ownerId: user.id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Shared with me documents
    const sharedShares = await prisma.documentShare.findMany({
      where: { userId: user.id },
      include: {
        document: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            shares: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const shared = sharedShares.map((s) => ({
      ...s.document,
      role: s.role,
      shareId: s.id,
      sharedAt: s.createdAt,
    }));

    res.json({
      owned: owned.map((d) => ({ ...d, role: 'owner' })),
      shared,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { title, content } = req.body;

    const document = await prisma.document.create({
      data: {
        title: (title && title.trim()) || 'Untitled Document',
        content: content || '<p></p>',
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
      document: {
        ...document,
        role: 'owner',
      },
    });
  } catch (error) {
    next(error);
  }
}

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
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    // Determine current user's role
    let role: 'owner' | 'editor' | 'viewer' | null = null;
    if (document.ownerId === user.id) {
      role = 'owner';
    } else {
      const share = document.shares.find((s) => s.userId === user.id);
      if (share) {
        role = share.role as 'editor' | 'viewer';
      }
    }

    if (!role) {
      res.status(403).json({
        error: 'You do not have permission to view this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    res.json({
      document,
      role,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDocument(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { title, content } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        shares: true,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    // Check permissions
    let canEdit = false;
    let role: 'owner' | 'editor' | 'viewer' = 'viewer';

    if (document.ownerId === user.id) {
      canEdit = true;
      role = 'owner';
    } else {
      const share = document.shares.find((s) => s.userId === user.id);
      if (share && share.role === 'editor') {
        canEdit = true;
        role = 'editor';
      } else if (share && share.role === 'viewer') {
        role = 'viewer';
      }
    }

    if (!canEdit) {
      res.status(403).json({
        error:
          role === 'viewer'
            ? 'Viewers cannot edit this document.'
            : 'You do not have edit permission for this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    // Build update payload
    const updateData: { title?: string; content?: string } = {};
    if (title !== undefined) {
      const trimmed = title.trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Document title cannot be empty', code: 'INVALID_TITLE' });
        return;
      }
      updateData.title = trimmed;
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    res.json({
      document: updated,
      role,
    });
  } catch (error) {
    next(error);
  }
}

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
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Only the document owner can delete this document.',
        code: 'FORBIDDEN',
      });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

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
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Only the document owner can view sharing settings.',
        code: 'FORBIDDEN',
      });
      return;
    }

    const shares = await prisma.documentShare.findMany({
      where: { documentId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(shares);
  } catch (error) {
    next(error);
  }
}

export async function addOrUpdateShare(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { userId, role } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Only the document owner can manage collaborators.',
        code: 'FORBIDDEN',
      });
      return;
    }

    if (userId === user.id) {
      res.status(400).json({
        error: 'You cannot share a document with yourself; you are already the owner.',
        code: 'SELF_SHARE_INVALID',
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Collaborator user not found', code: 'USER_NOT_FOUND' });
      return;
    }

    const validRole = role === 'viewer' ? 'viewer' : 'editor';

    const share = await prisma.documentShare.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId,
        },
      },
      create: {
        documentId: id,
        userId,
        role: validRole,
      },
      update: {
        role: validRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.json(share);
  } catch (error) {
    next(error);
  }
}

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
      res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });
      return;
    }

    if (document.ownerId !== user.id) {
      res.status(403).json({
        error: 'Only the document owner can remove collaborators.',
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

    res.json({ success: true, message: 'Collaborator removed successfully' });
  } catch (error) {
    next(error);
  }
}
