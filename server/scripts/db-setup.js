const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment from server .env or root .env
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:');

console.log(`[DraftSpace DB Setup] Detected Database URL format: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

const schemaPath = isPostgres 
  ? path.join(__dirname, '..', 'prisma', 'schema.prisma')
  : path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');

console.log(`[DraftSpace DB Setup] Using schema: ${schemaPath}`);

try {
  const runEnv = { ...process.env, DATABASE_URL: dbUrl };
  console.log('[DraftSpace DB Setup] Generating Prisma Client...');
  execSync(`npx prisma generate --schema="${schemaPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..'), env: runEnv });

  console.log('[DraftSpace DB Setup] Pushing schema to database...');
  execSync(`npx prisma db push --schema="${schemaPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..'), env: runEnv });

  console.log('[DraftSpace DB Setup] Seeding database with demo users & starter documents...');
  execSync(`npx tsx prisma/seed.ts`, { stdio: 'inherit', cwd: path.join(__dirname, '..'), env: runEnv });

  console.log('[DraftSpace DB Setup] ✅ Database setup completed successfully!');
} catch (error) {
  console.error('[DraftSpace DB Setup] ❌ Error setting up database:', error.message);
  if (isPostgres) {
    console.warn('\nTip: If your PostgreSQL server is not running locally, you can run with SQLite for instant local dev & automated testing:');
    console.warn('Set DATABASE_URL="file:./dev.db" in server/.env and re-run "npm run db:setup"\n');
  }
  process.exit(1);
}
