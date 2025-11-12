const { app } = require('electron')
const path = require('node:path')
const { Worker } = require('node:worker_threads')

let dashboardPublisher = null

function createSafeDashboardPublisher() {
  try {
    const { createDashboardPublisher } = require('./dashboard-publisher')
    return createDashboardPublisher()
  } catch (err) {
    console.warn('[Dashboard] Publisher unavailable, continuing without remote telemetry.', err.message)
    return {
      enqueue: () => {},
      flush: async () => {},
      close: async () => {},
    }
  }
}

dashboardPublisher = createSafeDashboardPublisher()

const DASHBOARD_CHANNELS = new Set([
  'scan-started',
  'scan-result',
  'log',
  'error',
  'ready',
  'shutdown-complete',
])

let monitorWorker = null
let attachedWindow = null
const monitorListeners = new Set()
let stoppingWorker = false

function attachWindow(win) {
  attachedWindow = win && !win.isDestroyed() ? win : null
}

function onMonitorEvent(listener) {
  if (typeof listener !== 'function') {
    return () => {}
  }

  monitorListeners.add(listener)
  return () => {
    monitorListeners.delete(listener)
  }
}

function notifyListeners(channel, payload) {
  if (attachedWindow && !attachedWindow.isDestroyed()) {
    attachedWindow.webContents.send(channel, payload)
  } else if (channel === 'scan-started') {
    console.log(`[Monitor] Headless scan started for: ${payload}`)
  } else if (channel === 'scan-result') {
    console.log('[Monitor] Headless scan result:', JSON.stringify(payload, null, 2))
  } else if (channel === 'ready') {
    console.log('[Monitor] Worker ready:', payload)
  } else if (channel === 'shutdown-complete') {
    console.log('[Monitor] Worker shutdown complete')
  } else if (channel === 'log') {
    console.log(payload)
  } else if (channel === 'error') {
    console.error(payload)
  }

  monitorListeners.forEach((listener) => {
    try {
      listener(channel, payload)
    } catch (err) {
      console.error('[Monitor] Listener error:', err)
    }
  })

  publishToDashboard(channel, payload)
}

function publishToDashboard(channel, payload) {
  if (!dashboardPublisher || !DASHBOARD_CHANNELS.has(channel)) {
    return
  }

  try {
    dashboardPublisher.enqueue({ channel, payload })

    if (channel === 'shutdown-complete') {
      dashboardPublisher.close().catch((err) => {
        console.error('[Dashboard] Failed to close publisher:', err)
      })
    }
  } catch (err) {
    console.error('[Dashboard] Failed to enqueue event:', err)
  }
}

function resolveDownloadPath() {
  try {
    return app.getPath('downloads')
  } catch (err) {
    console.error('[Monitor] Failed to resolve downloads path:', err)
    throw err
  }
}

function ensureWorker() {
  if (monitorWorker) {
    return monitorWorker
  }

  const workerPath = path.join(__dirname, 'scanner-worker.js')
  const downloadPath = resolveDownloadPath()

  monitorWorker = new Worker(workerPath, {
    workerData: { downloadPath }
  })

  monitorWorker.on('message', (message) => {
    if (!message || typeof message !== 'object') {
      return
    }

    const { channel, payload } = message

    if (!channel) {
      return
    }

    notifyListeners(channel, payload)
  })

  monitorWorker.on('error', (err) => {
    console.error('[Monitor] Worker error:', err)
  })

  monitorWorker.on('exit', (code) => {
    const wasStopping = stoppingWorker
    monitorWorker = null
    stoppingWorker = false

    if (dashboardPublisher && typeof dashboardPublisher.flush === 'function') {
      dashboardPublisher.flush().catch((err) => {
        console.error('[Dashboard] Failed to flush events after worker exit:', err)
      })
    }

    if (!wasStopping && code !== 0) {
      console.warn(`[Monitor] Worker exited unexpectedly with code ${code}. Restarting...`)
      ensureWorker()
    }
  })

  return monitorWorker
}

function startMonitorWorker(win) {
  if (win) {
    attachWindow(win)
  }

  return ensureWorker()
}

function stopMonitorWorker() {
  if (!monitorWorker) {
    return
  }

  stoppingWorker = true
  monitorWorker.postMessage({ type: 'shutdown' })

  if (dashboardPublisher && typeof dashboardPublisher.flush === 'function') {
    dashboardPublisher.flush().catch((err) => {
      console.error('[Dashboard] Failed to flush events during shutdown:', err)
    })
  }
}

module.exports = {
  attachWindow,
  onMonitorEvent,
  startMonitorWorker,
  stopMonitorWorker,
}

