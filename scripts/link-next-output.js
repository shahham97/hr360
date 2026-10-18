const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'apps', 'web', '.next');
const link = path.join(__dirname, '..', '.next');

if (fs.existsSync(target)) {
  if (fs.existsSync(link)) {
    fs.rmSync(link, { recursive: true, force: true });
  }
  try {
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    console.log('[build:vercel] Linked apps/web/.next -> .next');
  } catch (err) {
    console.log('[build:vercel] Symlink fallback to copy:', err.message);
    fs.cpSync(target, link, { recursive: true });
    console.log('[build:vercel] Copied apps/web/.next -> .next');
  }
} else {
  console.warn('[build:vercel] Warning: apps/web/.next not found, skipping link.');
}
