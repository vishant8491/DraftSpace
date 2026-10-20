import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { generateOpaqueToken, hashToken } from '../utils/crypto.js';
import { AuthenticatedRequest, SESSION_COOKIE_NAME } from '../middleware/auth.js';
import { config } from '../config.js';

export async function getDemoUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
      },
      orderBy: { displayName: 'asc' },
    });

    res.json({
      notice: 'Mocked demo authentication. Select an account to obtain a server-issued session.',
      users,
    });
  } catch (error) {
    next(error);
  }
}

export async function createDemoSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'userId is required to create a demo session.',
        code: 'MISSING_USER_ID',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        error: `Demo user not found with ID "${userId}".`,
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Generate opaque token (64 hex characters) and its SHA-256 hash for storage at rest
    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30-day expiry

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Set secure HttpOnly session cookie
    const isProduction = config.nodeEnv === 'production';
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    res.status(201).json({
      message: 'Mock demo session created successfully.',
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
      },
      sessionToken: rawToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.sessionToken) {
      const tokenHash = hashToken(req.sessionToken);
      await prisma.session.deleteMany({
        where: { tokenHash },
      });
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/',
    });

    res.json({
      message: 'Logged out successfully. Session revoked.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.json({
    user: {
      id: req.user!.id,
      displayName: req.user!.displayName,
      email: req.user!.email,
    },
    sessionExpiresAt: req.sessionToken ? 'Active' : undefined,
  });
}
