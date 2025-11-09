const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const { startFileMonitor } = require('./autoscan.js') //

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200, // Made window wider for the UI
    height: 900,
    webPreferences: {
      // --- THIS IS THE CRITICAL CHANGE ---
      // Tell Electron to use your new preload script
      preload: path.join(__dirname, 'preload.js') //
      // ---------------------------------
    }
  })

  win.loadFile('index.html') //
  
  // --- ADD THIS ---
  // Return the win object so we can pass it to the monitor
  return win
  // ----------------
}

app.whenReady().then(() => {
  // --- CATCH THE 'win' OBJECT ---
  const win = createWindow() //

  // --- PASS 'win' TO THE MONITOR ---
  startFileMonitor(win) //
  // ---------------------------------

  app.on('activate', () => { //
    if (BrowserWindow.getAllWindows().length === 0) { //
      createWindow() //
    }
  })
})

app.on('window-all-closed', () => { //
  if (process.platform !== 'darwin') { //
    app.quit() //
  }
})
