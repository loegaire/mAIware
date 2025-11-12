const { Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')

function setupBackgroundController({ app, createWindow, isBackgroundOnly }) {
  const noop = () => {}
  const singleInstance = app.requestSingleInstanceLock()

  if (!singleInstance) {
    app.quit()
    return {
      showWindow: noop,
      hideWindow: noop,
      toggleWindow: noop
    }
  }

  let tray = null
  let mainWindow = null
  let isQuitting = false

  const iconPath = path.join(__dirname, 'assets', 'icon.png')
  let trayIcon = iconPath

  try {
    const iconImage = nativeImage.createFromPath(iconPath)
    if (!iconImage.isEmpty()) {
      trayIcon = iconImage
    }
  } catch (err) {
    console.warn('[Background] Failed to load tray icon, falling back to path.', err.message)
  }

  const ensureTray = () => {
    if (tray) {
      return tray
    }

    tray = new Tray(trayIcon)
    tray.setToolTip('mAIware')

    tray.on('click', toggleWindow)
    tray.on('double-click', showWindow)
    tray.on('right-click', () => {
      updateContextMenu()
    })

    updateContextMenu()
    return tray
  }

  const destroyTray = () => {
    if (tray) {
      tray.destroy()
      tray = null
    }
  }

  const windowIsUsable = () => mainWindow && !mainWindow.isDestroyed()

  const hideDockIfNeeded = () => {
    if (process.platform === 'darwin' && app.dock && typeof app.dock.hide === 'function') {
      app.dock.hide()
    }
  }

  const showDockIfNeeded = () => {
    if (process.platform === 'darwin' && app.dock && typeof app.dock.show === 'function') {
      app.dock.show()
    }
  }

  const updateContextMenu = () => {
    if (!tray) {
      return
    }

    const hasWindow = windowIsUsable()
    const isVisible = hasWindow && mainWindow.isVisible()

    const template = [
      {
        label: isVisible ? 'Hide Window' : 'Show Window',
        enabled: hasWindow || typeof createWindow === 'function',
        click: toggleWindow
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: quitApplication
      }
    ]

    tray.setContextMenu(Menu.buildFromTemplate(template))
  }

  const showWindow = () => {
    if (windowIsUsable()) {
      showDockIfNeeded()
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
      updateContextMenu()
      return mainWindow
    }

    if (typeof createWindow !== 'function') {
      return null
    }

    let newWindow
    try {
      newWindow = createWindow()
    } catch (err) {
      console.error('[Background] Failed to create window:', err)
      return null
    }

    if (isBackgroundOnly && newWindow && typeof newWindow.once === 'function') {
      newWindow.once('ready-to-show', () => {
        newWindow.show()
        newWindow.focus()
        updateContextMenu()
      })
    }

    return newWindow || null
  }

  const hideWindow = () => {
    if (!windowIsUsable()) {
      updateContextMenu()
      return
    }

    mainWindow.hide()
    hideDockIfNeeded()
    updateContextMenu()
  }

  const toggleWindow = () => {
    if (!windowIsUsable()) {
      showWindow()
      return
    }

    if (mainWindow.isVisible()) {
      hideWindow()
    } else {
      showWindow()
    }
  }

  const quitApplication = () => {
    isQuitting = true
    showDockIfNeeded()
    destroyTray()
    if (windowIsUsable()) {
      mainWindow.close()
    }
    app.quit()
  }

  const handleWindowCreated = (window) => {
    mainWindow = window

    ensureTray()
    updateContextMenu()

    window.on('close', (event) => {
      if (isQuitting) {
        return
      }

      event.preventDefault()
      hideWindow()
    })

    window.on('minimize', (event) => {
      if (isQuitting) {
        return
      }

      event.preventDefault()
      hideWindow()
    })

    window.on('show', () => {
      showDockIfNeeded()
      updateContextMenu()
    })

    window.on('hide', () => {
      hideDockIfNeeded()
      updateContextMenu()
    })

    window.on('closed', () => {
      mainWindow = null
      updateContextMenu()

      if (!isQuitting) {
        hideDockIfNeeded()
      }
    })
  }

  app.on('browser-window-created', (_event, window) => {
    handleWindowCreated(window)
  })

  app.on('before-quit', () => {
    isQuitting = true
    destroyTray()
  })

  app.on('second-instance', () => {
    showWindow()
  })

  app.whenReady().then(() => {
    if (isBackgroundOnly) {
      ensureTray()
      updateContextMenu()
      hideDockIfNeeded()
    }
  })

  return {
    showWindow,
    hideWindow,
    toggleWindow
  }
}

module.exports = { setupBackgroundController }
