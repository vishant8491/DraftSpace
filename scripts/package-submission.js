const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(ROOT_DIR, 'staging_package', 'DraftSpace');
const ZIP_OUTPUT = path.join(ROOT_DIR, 'DraftSpace_submission.zip');

console.log('[Packaging] Preparing clean assessment submission package...');

// 1. Clean previous staging or zip
if (fs.existsSync(path.join(ROOT_DIR, 'staging_package'))) {
  fs.rmSync(path.join(ROOT_DIR, 'staging_package'), { recursive: true, force: true });
}
if (fs.existsSync(ZIP_OUTPUT)) {
  fs.rmSync(ZIP_OUTPUT, { force: true });
}

fs.mkdirSync(STAGING_DIR, { recursive: true });

// List of allowed files and directories to copy
const INCLUDED_ROOT_ITEMS = [
  'client',
  'server',
  'package.json',
  'package-lock.json',
  '.env.example',
  '.gitignore',
  'README.md',
  'ARCHITECTURE.md',
  'AI_WORKFLOW.md',
  'SUBMISSION.md',
  'QA_REPORT.md',
  'DEPLOYMENT.md',
  'WALKTHROUGH_SCRIPT.md',
  'WALKTHROUGH_URL.txt',
  'render.yaml',
  'Dockerfile',
  'docker-compose.yml',
  'railway.toml',
];

const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.env$/,
  /\.env\.local$/,
  /\.db$/,
  /\.db-journal$/,
  /dist/,
  /\.system_generated/,
  /\.log$/,
];

function copyFiltered(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    const basename = path.basename(source);
    if (EXCLUDED_PATTERNS.some((pat) => pat.test(basename))) {
      return;
    }

    fs.mkdirSync(destination, { recursive: true });
    const items = fs.readdirSync(source);
    for (const item of items) {
      copyFiltered(path.join(source, item), path.join(destination, item));
    }
  } else {
    const filename = path.basename(source);
    if (EXCLUDED_PATTERNS.some((pat) => pat.test(filename))) {
      return;
    }
    fs.copyFileSync(source, destination);
  }
}

for (const item of INCLUDED_ROOT_ITEMS) {
  const srcPath = path.join(ROOT_DIR, item);
  if (fs.existsSync(srcPath)) {
    copyFiltered(srcPath, path.join(STAGING_DIR, item));
  }
}

console.log('[Packaging] Files staged. Creating ZIP archive...');

try {
  // Use PowerShell Compress-Archive for native cross-platform zip on Windows
  execSync(
    `powershell -Command "Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${ZIP_OUTPUT}' -Force"`,
    { stdio: 'inherit' }
  );

  const zipStat = fs.statSync(ZIP_OUTPUT);
  console.log(`[Packaging] ✅ Successfully created: DraftSpace_submission.zip (${(zipStat.size / 1024).toFixed(1)} KB)`);

  // Cleanup staging directory
  fs.rmSync(path.join(ROOT_DIR, 'staging_package'), { recursive: true, force: true });
} catch (error) {
  console.error('[Packaging] Error creating archive:', error.message);
  process.exit(1);
}
