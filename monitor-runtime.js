const { app } = require('electron')
const path = require('node:path')
const { Worker } = require('node:worker_threads')

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
    const startedFile = typeof payload === 'object' && payload !== null
      ? payload.filename || payload.fullPath || '[unknown]'
      : payload
    console.log(`[Monitor] Headless scan started for: ${startedFile}`)
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

function requestManualScan(filePath) {
  if (!filePath) {
    return
  }

  const worker = ensureWorker()
  worker.postMessage({ type: 'scan-path', path: filePath })
}

function stopMonitorWorker() {
  if (!monitorWorker) {
    return
  }

  stoppingWorker = true
  monitorWorker.postMessage({ type: 'shutdown' })
}

module.exports = {
  attachWindow,
  onMonitorEvent,
  startMonitorWorker,
  requestManualScan,
  stopMonitorWorker,
}

