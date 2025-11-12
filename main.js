const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const { startMonitorWorker, attachWindow } = require('./monitor-runtime') //
const backgroundControllerModule = require('./background-controller')

const setupBackgroundController = typeof backgroundControllerModule.setupBackgroundController === 'function'
  ? backgroundControllerModule.setupBackgroundController
  : () => ({
    showWindow: () => {},
    hideWindow: () => {},
    toggleWindow: () => {}
  })

const isBackgroundOnly = process.argv.includes('--background') //

let backgroundController = null

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

  startMonitorWorker(win) //

  app.on('activate', () => { //
    backgroundController.showWindow()
  })
})

app.on('window-all-closed', () => { //
  if (process.platform !== 'darwin') { //
    app.quit() //
  }
})
