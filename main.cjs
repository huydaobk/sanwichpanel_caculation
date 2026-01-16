const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');


function createWindow() {
  const win = new BrowserWindow({
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
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
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

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
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
