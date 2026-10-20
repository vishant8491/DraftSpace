import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  console.log(`
  ======================================================
  📝 DraftSpace Server running on http://localhost:${config.port}
  🌍 Environment: ${config.nodeEnv}
  🗄️  Database: ${config.databaseUrl}
  ======================================================
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
