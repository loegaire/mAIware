const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const { startFileMonitor, attachWindow } = require('./autoscan.js') //

const isBackgroundOnly = process.argv.includes('--background') //

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1400, // Made window wider for the UI
    height: 900,
    show: !isBackgroundOnly,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.on('ready-to-show', () => {
    if (!isBackgroundOnly) {
      win.show()
    }
  })

  win.on('closed', () => {
    attachWindow(null)
  })

  win.loadFile('index.html') //

  attachWindow(win)

  return win
}

backgroundController = setupBackgroundController({
  app,
  createWindow,
  isBackgroundOnly
})

app.whenReady().then(() => {
  let win = null

  if (!isBackgroundOnly) {
    win = createWindow() //
  }

  startFileMonitor(win) //

  app.on('activate', () => { //
    if (BrowserWindow.getAllWindows().length === 0 && !isBackgroundOnly) { //
      win = createWindow() //
    }
  })
})

app.on('window-all-closed', () => { //
  if (process.platform !== 'darwin') { //
    app.quit() //
  }
})
