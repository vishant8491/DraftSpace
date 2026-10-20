import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { hashToken } from '../utils/crypto.js';
import { User } from '@prisma/client';
import { config } from '../config.js';

export const SESSION_COOKIE_NAME = 'draftspace_session';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

/**
 * Validates request origin on state-changing requests to protect against CSRF
 */
export function originCheckMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stateChangingMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    // Non-browser or direct API clients (curl, test runners)
    return next();
  }

  const allowedOrigins = [
    config.corsOrigin,
    'http://localhost:5173',
    'http://localhost:4000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4000',
  ];

  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  if (!isAllowed) {
    res.status(403).json({
      error: 'Forbidden: Request origin does not match trusted host.',
      code: 'CSRF_REJECTED',
    });
    return;
  }

  next();
}

/**
 * Authentication middleware resolving user identity from server-issued session token
 * Tokens are hashed at rest via SHA-256
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Read from HttpOnly cookie
    if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      token = req.cookies[SESSION_COOKIE_NAME];
    }

    // 2. Read from Authorization: Bearer <token>
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 3. Read from x-session-token header
    if (!token && req.headers['x-session-token']) {
      token = String(req.headers['x-session-token']).trim();
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required. Please select a demo account to start a session.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const tokenHash = hashToken(token);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({
        error: 'Invalid or revoked session. Please choose a demo account to continue.',
        code: 'INVALID_SESSION',
      });
      return;
    }

    // Check expiry
    if (session.expiresAt <= new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        path: '/',
      });
      res.status(401).json({
        error: 'Session expired. Please select a demo account to start a new session.',
        code: 'SESSION_EXPIRED',
      });
      return;
    }

    // Explicitly enforce that identity comes from the verified session,
    // not from any caller-supplied ownerId or acting userId
    req.user = session.user;
    req.sessionToken = token;

    next();
  } catch (error) {
    next(error);
  }
}
