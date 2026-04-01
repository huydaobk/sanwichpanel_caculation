const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const packageJson = require('./package.json');

const APP_DISPLAY_NAME = packageJson?.build?.productName || packageJson?.productName || 'Greenpan Design';
const APP_VERSION = packageJson?.version || app.getVersion();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: `${APP_DISPLAY_NAME} v${APP_VERSION}`,
    icon: path.join(__dirname, 'dist', 'logo_app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true, // Ẩn thanh menu mặc định cho gọn
  });

  // Load file index.html từ thư mục dist (sau khi build xong)
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('release-meta', () => ({
  appDisplayName: APP_DISPLAY_NAME,
  appVersion: app.getVersion(),
  releaseChannel: app.getVersion().includes('-') ? 'pre-release' : 'stable',
  releaseStamp: `${APP_DISPLAY_NAME} v${app.getVersion()}`,
}));

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});


function sendUpdateStatus(event, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('auto-update', {
    event,
    ...payload,
    appVersion: app.getVersion(),
    appDisplayName: APP_DISPLAY_NAME,
    releaseChannel: app.getVersion().includes('-') ? 'pre-release' : 'stable',
    releaseStamp: `${APP_DISPLAY_NAME} v${app.getVersion()}`,
  });
}

function initAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'huydaobk',
    repo: 'sanwichpanel_caculation',
  });

  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('available', { version: info?.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus('not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('download-progress', { percent: progress?.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', { version: info?.version });
    // Dừng ở đây, đợi user trigger qua IPC
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus('error', { message: err?.message || String(err) });
  });

  autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();

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

