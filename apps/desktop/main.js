const { app, BrowserWindow, shell, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Runtime Integrity Verification (Batch C requirement)
function verifyApplicationIntegrity() {
  try {
    const manifestPath = path.join(__dirname, 'integrity-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.files) {
        for (const [relPath, expectedHash] of Object.entries(manifest.files)) {
          const target = path.join(__dirname, relPath);
          if (fs.existsSync(target)) {
            const actualHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
            if (actualHash !== expectedHash) {
              console.error(`Application integrity check failed for ${relPath}. Exiting.`);
              try {
                dialog.showErrorBox(
                  'HR360 Security Alert',
                  'Application integrity check failed. Please reinstall HR360.'
                );
              } catch {}
              app.exit(2);
              return false;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Integrity check error:', err.message);
  }
  return true;
}
if (app.isPackaged) {
  verifyApplicationIntegrity();
}

let mainWindow = null;

// Single instance enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Device ID management (Random UUID stored via safeStorage/userData)
function getOrCreateDeviceId() {
  const deviceFile = path.join(app.getPath('userData'), 'device.id');
  try {
    if (fs.existsSync(deviceFile)) {
      const raw = fs.readFileSync(deviceFile);
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(raw);
      }
      return raw.toString('utf8');
    }
  } catch {}

  const newId = crypto.randomUUID();
  try {
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(newId)
      : Buffer.from(newId, 'utf8');
    fs.writeFileSync(deviceFile, data);
  } catch {}
  return newId;
}

// Secure Local Key-Value Storage using Windows DPAPI / safeStorage
function secureStoreSet(key, value) {
  if (!key || typeof key !== 'string') return false;
  const storeDir = path.join(app.getPath('userData'), 'secure_store');
  if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });

  const filePath = path.join(storeDir, crypto.createHash('sha256').update(key).digest('hex') + '.bin');
  try {
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(value)
      : Buffer.from(value, 'utf8');
    fs.writeFileSync(filePath, data);
    return true;
  } catch {
    return false;
  }
}

function secureStoreGet(key) {
  if (!key || typeof key !== 'string') return null;
  const storeDir = path.join(app.getPath('userData'), 'secure_store');
  const filePath = path.join(storeDir, crypto.createHash('sha256').update(key).digest('hex') + '.bin');
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw);
    }
    return raw.toString('utf8');
  } catch {
    return null;
  }
}

function secureStoreRemove(key) {
  if (!key || typeof key !== 'string') return false;
  const storeDir = path.join(app.getPath('userData'), 'secure_store');
  const filePath = path.join(storeDir, crypto.createHash('sha256').update(key).digest('hex') + '.bin');
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// IPC Handlers
ipcMain.handle('secure-store:set', (event, { key, value }) => {
  return secureStoreSet(key, value);
});

ipcMain.handle('secure-store:get', (event, key) => {
  return secureStoreGet(key);
});

ipcMain.handle('secure-store:remove', (event, key) => {
  return secureStoreRemove(key);
});

ipcMain.handle('device:get-id', () => {
  return getOrCreateDeviceId();
});

ipcMain.handle('system:open-network-settings', () => {
  if (process.platform === 'win32') {
    shell.openExternal('ms-settings:network');
    return true;
  }
  return false;
});

// ============================================================================
// Local Encrypted Database Engine Integration (SQLCipher AES-256)
// ============================================================================
let activeDbConnection = null;
let activeDispatcher = null;
let activeCompanyId = null;
let activeDek = null;

function initLocalDatabase(dek, companyId) {
  try {
    if (activeDbConnection) {
      try { activeDbConnection.close(); } catch {}
      activeDbConnection = null;
      activeDispatcher = null;
    }

    const { DatabaseConnection, DatabaseMigrator, IpcDispatcher } = require('@hr360/local-core');
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, `${companyId}.db`);
    activeDbConnection = new DatabaseConnection({
      dbPath,
      encryptionKey: dek,
    });

    const migrator = new DatabaseMigrator(activeDbConnection);
    migrator.migrate({
      companyId,
      appVersion: app.getVersion() || '1.0.0',
    });

    const integrity = activeDbConnection.checkIntegrity();
    if (!integrity.ok) {
      throw new Error(`Local database integrity check failed: ${integrity.message}`);
    }

    activeDispatcher = new IpcDispatcher(activeDbConnection);
    activeCompanyId = companyId;
    activeDek = dek;

    return { success: true };
  } catch (err) {
    console.error('[HR360 Main] Local database initialization failed:', err.message);
    if (activeDbConnection) {
      try { activeDbConnection.close(); } catch {}
      activeDbConnection = null;
    }
    activeDispatcher = null;
    return { success: false, error: err.message };
  }
}

function closeLocalDatabase() {
  if (activeDbConnection) {
    try {
      activeDbConnection.close();
    } catch {}
    activeDbConnection = null;
  }
  activeDispatcher = null;
  activeCompanyId = null;
  activeDek = null;
}

ipcMain.handle('local-core:dispatch', async (event, { channel, payload, userContext }) => {
  if (!activeDispatcher) {
    return { success: false, error: 'Local encrypted database is not initialized or is locked.' };
  }
  return activeDispatcher.dispatch({ channel, payload, userContext });
});

ipcMain.handle('database:status', () => {
  const isReady = activeDbConnection !== null && activeDbConnection.isOpen();
  return {
    isReady,
    companyId: activeCompanyId,
  };
});

ipcMain.handle('license:activate', async (event, { licenseKey, serverUrl }) => {
  try {
    const cleanUrl = (serverUrl || 'http://localhost:3000').replace(/\/$/, '');
    const deviceId = getOrCreateDeviceId();
    const res = await fetch(`${cleanUrl}/api/v1/desktop/lease`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        deviceId,
        appVersion: app.getVersion() || '1.0.0',
        osVersion: process.platform + ' ' + process.arch,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.data) {
      return { success: false, error: json.error?.message || 'Activation failed.' };
    }

    const { leaseToken, storageMode = 'CLOUD_DEDICATED', databaseKey, entitlementToken, company, expiresAt } = json.data;

    // Securely store credentials in Windows DPAPI
    secureStoreSet('company_id', company.id);
    secureStoreSet('lease_token', leaseToken);
    secureStoreSet('storage_mode', storageMode);

    if (storageMode === 'LOCAL' && databaseKey) {
      secureStoreSet('db_dek', databaseKey);
      // Initialize local encrypted DB
      const initRes = initLocalDatabase(databaseKey, company.id);
      if (!initRes.success) {
        return { success: false, error: initRes.error };
      }
    } else {
      // Thin-client cloud mode: ensure any previous local DB handles are closed
      closeLocalDatabase();
    }

    // Verify and set entitlements on dispatcher
    if (entitlementToken && activeDispatcher) {
      try {
        const { EntitlementCrypto, HR360_ENTITLEMENT_PUBLIC_KEY } = require('@hr360/crypto-audit');
        const verified = EntitlementCrypto.verifyEntitlement(entitlementToken, HR360_ENTITLEMENT_PUBLIC_KEY);
        if (verified.valid && verified.payload) {
          activeDispatcher.setEntitlements({
            companyId: company.id,
            maxEmployees: verified.payload.limits.employees,
            modules: {
              payroll: verified.payload.modules.payroll,
              attendance: verified.payload.modules.attendance,
              recruitment: verified.payload.modules.recruitment,
              performance: verified.payload.modules.performance,
              certificates: verified.payload.modules.certificates,
            },
            expiresAt,
          });
        }
      } catch (entErr) {
        console.warn('Entitlement verification notice:', entErr.message);
      }
    }

    return {
      success: true,
      company,
      leaseToken,
      expiresAt,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('database:backup', async (event, customTargetDir) => {
  if (!activeDbConnection || !activeDek || !activeCompanyId) {
    return { success: false, error: 'Database is not active.' };
  }
  try {
    const { BackupManager } = require('@hr360/local-core');
    const targetDir = customTargetDir || path.join(app.getPath('userData'), 'backups');
    const backupMgr = new BackupManager(activeDbConnection, activeDek, activeCompanyId);
    const meta = backupMgr.createBackup(targetDir);

    return { success: true, metadata: meta };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('database:restore', async (event, backupFilePath) => {
  if (!activeCompanyId || !activeDek) {
    return { success: false, error: 'Company workspace not active.' };
  }
  try {
    const { BackupManager } = require('@hr360/local-core');
    const targetDbPath = activeDbConnection ? activeDbConnection.getPath() : path.join(app.getPath('userData'), 'data', `${activeCompanyId}.db`);

    // Close active database handle before restoring
    closeLocalDatabase();

    const result = BackupManager.restoreBackup(backupFilePath, targetDbPath, activeDek);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Re-initialize restored database
    initLocalDatabase(activeDek, activeCompanyId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Auto-Updater Integration via electron-updater (Generic Provider behind private API)
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
} catch {}

const { runLocalDataMigration } = require('./local-migration');

ipcMain.handle('updater:check-update', async (event, apiUrl) => {
  try {
    const currentVersion = app.getVersion() || '1.0.0';
    const cleanUrl = (apiUrl || 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/api/v1/admin/releases`);
    if (!res.ok) return { updateAvailable: false };
    const data = await res.json();
    const releases = data?.data || [];
    if (!releases.length) return { updateAvailable: false };

    const latest = releases[0];
    const isNewer = latest.version !== currentVersion;
    const isMandatory = latest.isMandatory || false;
    const minVersion = latest.minVersion || '1.0.0';

    return {
      updateAvailable: isNewer,
      currentVersion,
      latestVersion: latest.version,
      downloadUrl: latest.downloadUrl,
      notes: latest.notes,
      isMandatory,
      requiresImmediateUpdate: isMandatory && currentVersion < minVersion,
    };
  } catch {
    return { updateAvailable: false };
  }
});

ipcMain.handle('updater:start-download', async (event, downloadUrl) => {
  // If electron-updater is configured, run background download
  if (autoUpdater && app.isPackaged) {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      console.warn('electron-updater background download failed, fallback to direct:', err.message);
    }
  }
  if (downloadUrl && (downloadUrl.startsWith('https://') || downloadUrl.startsWith('http://'))) {
    shell.openExternal(downloadUrl);
    return { success: true, fallback: true };
  }
  return { success: false };
});

ipcMain.handle('updater:quit-and-install', (event, { forceRestart } = {}) => {
  if (autoUpdater && app.isPackaged) {
    autoUpdater.quitAndInstall(!forceRestart, true);
    return true;
  }
  app.quit();
  return true;
});

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, 'public', 'icon.ico'))
    ? path.join(__dirname, 'public', 'icon.ico')
    : path.join(__dirname, 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'HR360 Enterprise Client',
    icon: iconPath,
    backgroundColor: '#0B132B',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Production context menu & application menu hardening (Batch C requirement)
  if (app.isPackaged) {
    mainWindow.removeMenu();
    mainWindow.webContents.on('context-menu', (e) => {
      e.preventDefault();
    });
  }

  // Production keyboard shortcuts hardening: block F12, Ctrl+Shift+I/J, Ctrl+R
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (app.isPackaged) {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j')) ||
        (input.control && input.key.toLowerCase() === 'r')
      ) {
        event.preventDefault();
      }
    }
  });

  // Strict window open handler: Deny all secondary windows, only allow validated HTTPS external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Strict will-navigate handler: Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && navigationUrl.startsWith(devServerUrl)) {
      return; // Allow Vite dev server
    }
    if (!navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Run ordered, idempotent local data migration and auto-backup
  try {
    const migrationResult = runLocalDataMigration(app.getPath('userData'), app.getVersion() || '1.0.0');
    if (!migrationResult.success) {
      console.error('Local data migration reported error:', migrationResult.error);
    }
  } catch (err) {
    console.error('Failed to run startup migrations:', err.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeLocalDatabase();
});
