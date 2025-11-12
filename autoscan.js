const { app } = require('electron')
const path = require('node:path')
const { Worker } = require('node:worker_threads')

let browserWindow = null //
let monitorWorker = null //

function attachWindow(win) {
  browserWindow = win || null //
}

function forwardToWindow(channel, payload) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return //
  }

  browserWindow.webContents.send(channel, payload) //
}

function startFileMonitor(win) {
  if (win) {
    attachWindow(win) //
  }

  if (monitorWorker) {
    return monitorWorker //
  }

  const downloadPath = app.getPath('downloads') //
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`) //

  monitorWorker = new Worker(path.join(__dirname, 'scanner-worker.js'), {
    workerData: { downloadPath }
  })

  monitorWorker.on('message', (message) => {
    const { channel, payload } = message || {}

    switch (channel) {
      case 'scan-started':
        forwardToWindow('scan-started', payload)
        break
      case 'scan-result':
        forwardToWindow('scan-result', payload)
        break
      case 'log':
        console.log(payload)
        break
      case 'error':
        console.error(payload)
        break
      case undefined:
        console.warn('[Monitor] Received empty message from worker')
        break
      default:
        console.warn(`[Monitor] Unknown message from worker: ${channel}`)
    }
  })

  monitorWorker.on('error', (err) => {
    console.error('[Monitor] Worker error:', err)
  })

  monitorWorker.on('exit', (code) => {
    console.log(`[Monitor] Worker exited with code ${code}`)
    monitorWorker = null
  })

  return monitorWorker //
}

module.exports = {
  startFileMonitor,
  attachWindow
}
