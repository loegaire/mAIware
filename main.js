const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
// Import the file monitoring module we are about to create
const { startFileMonitor } = require('./autoscan.js')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // It's good practice to use a preload script for security
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  // --- ADD THIS LINE ---
  // Start the file monitor after the app is ready
  startFileMonitor()
  // --------------------

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
