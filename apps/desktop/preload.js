const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hr360Desktop', {
  platform: process.platform,
  version: '1.0.0',
  isDesktop: true,
  getDeviceId: () => ipcRenderer.invoke('device:get-id'),
  storeSecure: (key, value) => ipcRenderer.invoke('secure-store:set', { key, value }),
  getSecure: (key) => ipcRenderer.invoke('secure-store:get', key),
  removeSecure: (key) => ipcRenderer.invoke('secure-store:remove', key),
  openNetworkSettings: () => ipcRenderer.invoke('system:open-network-settings'),
  checkUpdate: (apiUrl) => ipcRenderer.invoke('updater:check-update', apiUrl),
  startDownload: (downloadUrl) => ipcRenderer.invoke('updater:start-download', downloadUrl),
  quitAndInstall: (options) => ipcRenderer.invoke('updater:quit-and-install', options),
  openDownload: (downloadUrl) => ipcRenderer.invoke('updater:start-download', downloadUrl),
  dispatchLocal: (channel, payload, userContext) => ipcRenderer.invoke('local-core:dispatch', { channel, payload, userContext }),
  activateLicense: (params) => ipcRenderer.invoke('license:activate', params),
  getDatabaseStatus: () => ipcRenderer.invoke('database:status'),
  backupDatabase: (targetDir) => ipcRenderer.invoke('database:backup', targetDir),
  restoreDatabase: (backupFilePath) => ipcRenderer.invoke('database:restore', backupFilePath),
});
