import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // Fallback: x-session-token header
    if (!token && req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }

    // Direct user ID header fallback for quick testing/scripting
    const directUserId = req.headers['x-user-id'] as string;

    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        req.user = session.user;
        req.sessionToken = token;
        return next();
      }
    }

    if (directUserId) {
      const user = await prisma.user.findUnique({
        where: { id: directUserId },
      });
      if (user) {
        req.user = user;
        return next();
      }
    }

    res.status(401).json({
      error: 'Authentication required. Please provide a valid session token.',
      code: 'UNAUTHORIZED',
    });
  } catch (error) {
    next(error);
  }
}
