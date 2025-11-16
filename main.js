const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const { startMonitorWorker, attachWindow } = require('./monitor-runtime') //
const { onMonitorEvent } = require('./monitor-runtime')
const { determinePeStatus } = require('./file-type-detector')

let backgroundControllerModule = null
let mainWindow = null
let cachedDownloadsPath = null
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

const pendingFileMetadata = new Map()

const getDownloadsPath = () => {
  if (!cachedDownloadsPath) {
    try {
      cachedDownloadsPath = app.getPath('downloads')
    } catch (err) {
      console.warn('[FileType] Failed to resolve downloads path:', err.message)
      cachedDownloadsPath = null
    }
  }

  return cachedDownloadsPath
}

const dispatchMetadataUpdate = (filename, metadata) => {
  if (!filename) {
    return
  }

  const payload = { filename, ...metadata }
  pendingFileMetadata.set(filename, payload)

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('scan-file-metadata', payload)
    } catch (err) {
      console.warn('[FileType] Failed to send metadata to renderer:', err.message)
    }
  }
}

const inspectFileForPe = async (filename) => {
  const downloadsPath = getDownloadsPath()
  if (!downloadsPath || !filename) {
    return
  }

  const fullPath = path.join(downloadsPath, filename)

  try {
    const status = await determinePeStatus(fullPath)
    dispatchMetadataUpdate(filename, status)
  } catch (err) {
    dispatchMetadataUpdate(filename, {
      isPe: false,
      error: err instanceof Error ? err.message : String(err)
    })
  }
}

const handleScanResultMetadata = (scanResult) => {
  if (!scanResult || typeof scanResult !== 'object') {
    return
  }

  const detectedFilename = scanResult.detected_filename
  if (!detectedFilename) {
    return
  }

  const metadata = pendingFileMetadata.get(detectedFilename)
  if (metadata) {
    dispatchMetadataUpdate(detectedFilename, metadata)
    pendingFileMetadata.delete(detectedFilename)
  }
}

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

  mainWindow = win

  win.on('ready-to-show', () => {
    if (!isBackgroundOnly) {
      win.show()
    }

    pendingFileMetadata.forEach((metadata) => {
      try {
        win.webContents.send('scan-file-metadata', metadata)
      } catch (err) {
        console.warn('[FileType] Failed to replay metadata to renderer:', err.message)
      }
    })
  })

  win.on('closed', () => {
    attachWindow(null)
    if (mainWindow === win) {
      mainWindow = null
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

ipcMain.handle('system-info:get-ip', async () => {
  return getPrimaryIPv4()
})

app.whenReady().then(() => {
  let win = null

  if (!isBackgroundOnly) {
    win = createWindow() //
  }

  startMonitorWorker(win) //

  onMonitorEvent((channel, payload) => {
    if (channel === 'scan-started') {
      inspectFileForPe(payload)
    } else if (channel === 'scan-result') {
      handleScanResultMetadata(payload)
    }
  })

  app.on('activate', () => { //
    backgroundController.showWindow()
  })
})

app.on('window-all-closed', () => { //
  if (process.platform !== 'darwin') { //
    app.quit() //
  }
})
