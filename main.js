const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')
const { startMonitorWorker, attachWindow } = require('./monitor-runtime') //

let backgroundControllerModule = null
try {
  backgroundControllerModule = require('./background-controller')
} catch (err) {
  console.warn('[Background] Controller unavailable, continuing without tray integration.', err.message)
}

const fallbackBackgroundController = ({ createWindow }) => {
  let cachedWindow = null

  const getExistingWindow = () => {
    if (cachedWindow && !cachedWindow.isDestroyed()) {
      return cachedWindow
    }

    return null
  }

  const ensureWindow = () => {
    const existing = getExistingWindow()
    if (existing) {
      return existing
    }

    if (typeof createWindow === 'function') {
      cachedWindow = createWindow()
      return cachedWindow
    }

    return null
  }

  return {
    showWindow: () => {
      const win = ensureWindow()
      if (win && typeof win.show === 'function') {
        win.show()
        if (typeof win.focus === 'function') {
          win.focus()
        }
      }
      return win
    },
    hideWindow: () => {
      const win = getExistingWindow()
      if (win && typeof win.hide === 'function') {
        win.hide()
      }
    },
    toggleWindow: () => {
      let win = getExistingWindow()

      if (!win) {
        win = ensureWindow()
        if (!win) {
          return
        }
      }

      if (typeof win.isVisible === 'function' && win.isVisible()) {
        if (typeof win.hide === 'function') {
          win.hide()
        }
        return
      }

      if (typeof win.show === 'function') {
        win.show()
        if (typeof win.focus === 'function') {
          win.focus()
        }
      }
    }
  }
}

const setupBackgroundController =
  backgroundControllerModule && typeof backgroundControllerModule.setupBackgroundController === 'function'
    ? backgroundControllerModule.setupBackgroundController
    : fallbackBackgroundController

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
