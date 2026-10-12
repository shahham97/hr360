// @ts-check
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { runLocalDataMigration, CURRENT_SCHEMA_VERSION } = require('./local-migration');

console.log('[Test: Local Data Migration & Auto-Backup] Starting tests...');

const tmpUserData = path.join(__dirname, 'test-userData-tmp');
if (fs.existsSync(tmpUserData)) fs.rmSync(tmpUserData, { recursive: true, force: true });
fs.mkdirSync(tmpUserData, { recursive: true });

try {
  // 1. Seed dummy device ID and secure store item
  fs.writeFileSync(path.join(tmpUserData, 'device.id'), 'mock-hardware-device-uuid-1234');
  const storeDir = path.join(tmpUserData, 'secure_store');
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(path.join(storeDir, 'token.bin'), Buffer.from('mock-encrypted-dpapi-token'));

  // 2. Run migration to current schema version
  const res1 = runLocalDataMigration(tmpUserData, '1.0.0');
  assert.strictEqual(res1.success, true, 'Migration to current version should succeed');
  assert.strictEqual(res1.version, CURRENT_SCHEMA_VERSION, `Should record version ${CURRENT_SCHEMA_VERSION}`);
  console.log('  ✔ Fresh migration succeeded and recorded schema version 1.');

  // 3. Verify backup creation
  const backupsDir = path.join(tmpUserData, 'backups');
  assert.strictEqual(fs.existsSync(backupsDir), true, 'Backups directory must exist');
  const backups = fs.readdirSync(backupsDir);
  assert.strictEqual(backups.length, 1, 'Exactly 1 backup folder should exist');
  console.log('  ✔ Pre-migration backup successfully created at:', backups[0]);

  // 4. Verify idempotent no-op when re-run
  const res2 = runLocalDataMigration(tmpUserData, '1.0.0');
  assert.strictEqual(res2.success, true);
  const backupsAfter = fs.readdirSync(backupsDir);
  assert.strictEqual(backupsAfter.length, 1, 'No unnecessary backup created when schema version already current');
  console.log('  ✔ Idempotent rerun correctly bypassed migration.');

  console.log('✅ [Local Migration Test Passed] 100% assertions satisfied.');
} finally {
  fs.rmSync(tmpUserData, { recursive: true, force: true });
}
