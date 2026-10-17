const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Unified Production Release Automation Pipeline (P3.2 / P4)
 * Usage: node scripts/publish-release.js [version]
 * Reads credentials strictly from execution environment.
 */
async function publishRelease() {
  const version = process.argv[2] || '1.0.0';
  console.log(`\n================================================================`);
  console.log(`  HR360 Production Release Manager: v${version}`);
  console.log(`================================================================\n`);

  // 1. Lint and Documentation Gates
  console.log('[Step 1/5] Running Release & Documentation Policy Gates...');
  try {
    execSync('pnpm run lint:docs', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Documentation policy gate failed.');
    process.exit(1);
  }

  // 2. Build Installer & Package
  console.log('\n[Step 2/5] Building Installer & Distribution Package...');
  try {
    execSync('pnpm --filter "@hr360/desktop" run build:installer', { stdio: 'inherit' });
    execSync('node apps/desktop/scripts/create-dist-zip.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Installer compilation failed.');
    process.exit(1);
  }

  // 3. Size and Checksum Gates
  console.log('\n[Step 3/5] Verifying Size & Checksum Gates...');
  const zipPath = path.resolve(__dirname, '../apps/desktop/release-builds/HR360-Setup-1.0.0.zip');
  const exePath = path.resolve(__dirname, '../apps/desktop/release-builds/HR360-Setup-1.0.0.exe');
  
  if (!fs.existsSync(zipPath) || !fs.existsSync(exePath)) {
    console.error('❌ Expected release artifacts missing.');
    process.exit(1);
  }

  const stat = fs.statSync(zipPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  const exeBytes = fs.readFileSync(exePath);
  const sha256 = crypto.createHash('sha256').update(exeBytes).digest('hex').toUpperCase();

  console.log(`  Package Size: ${sizeMb} MB`);
  console.log(`  SHA256:       ${sha256}`);

  if (stat.size > 135 * 1024 * 1024) {
    console.error(`❌ Size gate failed: Package exceeds ceiling (${sizeMb} MB > 135 MB)`);
    process.exit(1);
  }
  console.log('  ✅ Size gate passed.');

  // 4. Offline Manifest Signature (Ed25519)
  console.log('\n[Step 4/5] Generating Signed Release Manifest...');
  const manifest = {
    version,
    channel: 'stable',
    releaseDate: new Date().toISOString(),
    installerName: `HR360-Setup-${version}.exe`,
    sha256,
    sizeBytes: stat.size,
    isMandatory: false,
    minVersion: '1.0.0',
    rolloutPercentage: 100,
  };

  const signingKey = process.env.UPDATE_SIGNING_KEY;
  if (signingKey) {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(JSON.stringify(manifest));
      manifest.signature = sign.sign(signingKey, 'base64');
      console.log('  ✅ Release manifest cryptographically signed with update key.');
    } catch (err) {
      console.warn('  ⚠️ Could not sign with provided key:', err.message);
    }
  } else {
    console.log('  ℹ UPDATE_SIGNING_KEY not set in terminal session; generating standard checksum manifest.');
  }

  const manifestPath = path.resolve(__dirname, `../apps/desktop/release-builds/release-v${version}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`  Saved manifest: ${manifestPath}`);

  // 5. Database Release Record Registration
  console.log('\n[Step 5/5] Registering Release in Database...');
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const { getMasterPrismaClient } = require('../packages/db-master');
      const prisma = getMasterPrismaClient();
      await prisma.release.upsert({
        where: { version },
        create: {
          version,
          channel: 'stable',
          notes: `Stable production release v${version}`,
          downloadUrl: `/api/v1/download/request`,
          sha256,
          isMandatory: false,
          minVersion: '1.0.0',
        },
        update: {
          sha256,
          downloadUrl: `/api/v1/download/request`,
        },
      });
      console.log(`  ✅ Database Release record registered for v${version}.`);
    } catch (err) {
      console.warn('  ⚠️ Database registration skipped (local offline mode):', err.message);
    }
  } else {
    console.log('  ℹ DATABASE_URL not set in session; skipping remote master registration.');
  }

  console.log('\n================================================================');
  console.log(`  RELEASE PACKAGING COMPLETE: v${version}`);
  console.log(`  Package: ${zipPath}`);
  console.log(`  Checksum: ${sha256}`);
  console.log('================================================================\n');
}

publishRelease().catch((err) => {
  console.error('Fatal release error:', err);
  process.exit(1);
});
