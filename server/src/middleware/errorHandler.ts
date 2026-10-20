import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Multer upload errors
  if ((err as any).name === 'MulterError' || (err as any).code === 'LIMIT_FILE_SIZE') {
    const isSize = (err as any).code === 'LIMIT_FILE_SIZE';
    res.status(400).json({
      error: isSize ? 'File size exceeds the 1 MiB limit.' : err.message,
      code: isSize ? 'FILE_TOO_LARGE' : ((err as any).code || 'MULTER_ERROR'),
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    error: message,
    code,
    ...(err.details ? { details: err.details } : {}),
  });
}
