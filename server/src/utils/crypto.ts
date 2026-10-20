import crypto from 'crypto';

/**
 * Generate a cryptographically secure opaque token (64 hex characters)
 */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a session token for secure storage at rest
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
