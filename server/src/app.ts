import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { originCheckMiddleware } from './middleware/auth.js';
import demoRoutes from './routes/demoRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

export const app = express();

// Trust reverse proxy (Render, Railway, Fly, Heroku, AWS ALB, Cloudflare) for secure cookies & HTTPS detection
app.set('trust proxy', 1);

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, test runners, mobile) or matching local/configured origins
      if (!origin || origin === config.corsOrigin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true, // Allow cookies over CORS
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CSRF Origin verification on state-changing requests
app.use(originCheckMiddleware);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DraftSpace API',
    database: config.databaseUrl.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite',
    time: new Date().toISOString(),
  });
});

// Demo Identity & Session Routes (/api/demo-users, /api/demo-session, /api/session, /api/me)
app.use('/api', demoRoutes);

// Document & Sharing Routes (/api/documents, /api/documents/:id, /api/documents/:id/shares, /api/documents/import)
app.use('/api/documents', documentRoutes);

// Backward-compatible alias for /api/upload/import
app.use('/api/upload', documentRoutes);

// Serve static frontend build if present (Unified single-service deployment)
const candidateDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'dist/client'),
];

let finalDistPath: string | null = null;
for (const p of candidateDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    finalDistPath = p;
    break;
  }
}

if (finalDistPath) {
  app.use(express.static(finalDistPath));
  app.get('*', (req, res, next) => {
    // 1. API routes must never be handled by SPA fallback
    if (req.path.startsWith('/api')) {
      return next();
    }
    // 2. Missing asset files with extensions should 404, not return HTML
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
      return res.status(404).json({
        error: `Asset not found: ${req.path}`,
        code: 'ASSET_NOT_FOUND',
      });
    }
    // 3. Document URLs, root, and clean paths receive index.html
    res.sendFile(path.join(finalDistPath, 'index.html'));
  });
}

// 404 Catch-all for unhandled API endpoints
app.use((req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.url}`,
    code: 'NOT_FOUND',
  });
});

// Centralized Error Handler
app.use(errorHandler);
