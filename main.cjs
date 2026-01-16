const { app, BrowserWindow } = require('electron');
const pkg = require('./package.json');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Greenpan Design",
    icon: path.join(__dirname, 'dist', 'logo_app.ico'),
    webPreferences: {

      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true, // Ẩn thanh menu mặc định cho gọn
  });

  // Load file index.html từ thư mục dist (sau khi build xong)
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  sendUpdateStatus('version', { appVersion: app.getVersion() });
}

function sendUpdateStatus(event, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('auto-update', { event, ...payload, appVersion: app.getVersion() });
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
    setTimeout(() => autoUpdater.quitAndInstall(), 1200);
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

