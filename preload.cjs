const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getReleaseMeta: () => ipcRenderer.invoke('release-meta'),
  onAutoUpdate: (callback) => ipcRenderer.on('auto-update', (_event, value) => callback(value)),
  removeAutoUpdateListener: () => ipcRenderer.removeAllListeners('auto-update'),
  installUpdate: () => ipcRenderer.send('install-update')
});
