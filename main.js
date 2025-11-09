const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const { startFileMonitor } = require('./autoscan.js') //

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1400, // Made window wider for the UI
    height: 900,
    webPreferences: {
      // --- THIS IS THE CRITICAL FIX ---
      // This line loads your bridge
      preload: path.join(__dirname, 'preload.js') 
      // ---------------------------------
    }
  })

  win.loadFile('index.html') //
  
  // --- THIS IS ALSO A FIX ---
  // You must return the 'win' object
  return win
}

app.whenReady().then(() => {
  // --- CATCH THE 'win' OBJECT ---
  const win = createWindow() //

  // --- PASS 'win' TO THE MONITOR ---
  // This allows autoscan.js to send messages to the UI
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
