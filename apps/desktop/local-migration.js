const fs = require('fs');
const path = require('path');

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Executes ordered, idempotent local migrations on launch.
 * Automatically backs up app state to userData/backups/<version>-<timestamp>
 * before migrating. Keeps the last 3 backups.
 */
function runLocalDataMigration(userDataPath, currentAppVersion) {
  const versionFile = path.join(userDataPath, 'schema_version.json');
  const backupsDir = path.join(userDataPath, 'backups');

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // 1. Read current version
  let recordedVersion = 0;
  try {
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      recordedVersion = Number(data.schemaVersion) || 0;
    }
  } catch {}

  if (recordedVersion >= CURRENT_SCHEMA_VERSION) {
    return { success: true, version: recordedVersion };
  }

  // 2. Create timestamped backup before migrating
  const backupFolder = path.join(
    backupsDir,
    `${currentAppVersion}-${new Date().toISOString().replace(/[:.]/g, '-')}`
  );
  try {
    fs.mkdirSync(backupFolder, { recursive: true });

    // Copy device id and secure store if present
    const deviceIdFile = path.join(userDataPath, 'device.id');
    if (fs.existsSync(deviceIdFile)) {
      fs.copyFileSync(deviceIdFile, path.join(backupFolder, 'device.id'));
    }

    const secureStoreDir = path.join(userDataPath, 'secure_store');
    if (fs.existsSync(secureStoreDir)) {
      const targetStore = path.join(backupFolder, 'secure_store');
      fs.mkdirSync(targetStore, { recursive: true });
      for (const f of fs.readdirSync(secureStoreDir)) {
        fs.copyFileSync(path.join(secureStoreDir, f), path.join(targetStore, f));
      }
    }

    // Prune backups beyond last 3
    const existingBackups = fs.readdirSync(backupsDir).sort();
    if (existingBackups.length > 3) {
      for (let i = 0; i < existingBackups.length - 3; i++) {
        const toDelete = path.join(backupsDir, existingBackups[i]);
        fs.rmSync(toDelete, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn('Backup creation warning (non-fatal):', err.message);
  }

  // 3. Run migration steps
  try {
    if (recordedVersion < 1) {
      // V1 Migration: Ensure directory integrity
      const secureStoreDir = path.join(userDataPath, 'secure_store');
      if (!fs.existsSync(secureStoreDir)) {
        fs.mkdirSync(secureStoreDir, { recursive: true });
      }
    }

    // Update recorded schema version
    fs.writeFileSync(
      versionFile,
      JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        appVersion: currentAppVersion,
        migratedAt: new Date().toISOString(),
      }, null, 2),
      'utf8'
    );

    return { success: true, version: CURRENT_SCHEMA_VERSION };
  } catch (err) {
    // Attempt rollback
    console.error('Local data migration failed. Rolling back:', err.message);
    try {
      const backupDeviceId = path.join(backupFolder, 'device.id');
      if (fs.existsSync(backupDeviceId)) {
        fs.copyFileSync(backupDeviceId, path.join(userDataPath, 'device.id'));
      }
    } catch {}
    return { success: false, error: err.message };
  }
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  runLocalDataMigration,
};
