const { app } = require('electron')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const axios = require('axios')
const FormData = require('form-data')
const { getRandomDemoJson } = require('./jsonsamples') //

// --- Configuration ---
const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' //
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 //

const fileQueue = [] //
let isProcessing = false //

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)) //

async function processQueue(win) {
  if (isProcessing || fileQueue.length === 0) { //
    return
  }

  isProcessing = true //
  const filePath = fileQueue.shift() //
  const detectedFilename = path.basename(filePath) //

  console.log(`[Monitor] Processing: ${detectedFilename}`) //

  try {
    const stats = await fsPromises.stat(filePath) //

    if (stats.size < FILE_SIZE_THRESHOLD) { //
      await handleSmallFile(win, filePath, detectedFilename) //
    } else {
      console.log(`[Monitor] File ${detectedFilename} is large, skipping server push.`) //
    }

  } catch (err) { //
    console.error(`[Monitor] Error processing ${filePath}:`, err.message) //
  } finally {
    isProcessing = false //
    processQueue(win) //
  }
}

async function handleSmallFile(win, filePath, detectedFilename) {
  // 1. "Real Upload" task
  const uploadTask = async () => { //
    const form = new FormData() //
    form.append('file', fs.createReadStream(filePath)) //
    
    try {
      console.log(`[Push] Starting upload for ${detectedFilename}...`) //
      const response = await axios.post(AI_APP_API_ENDPOINT, form, { //
        headers: form.getHeaders(), //
      })
      console.log(`[Push] AI App Response: ${response.status}`, response.data) //
    } catch (err) {
      console.error(`[Push] AI app push failed:`, err.message) //
    }
  }

  // 2. "Printout" 
  const demoTask = async () => { //
    console.log(`[Scan] Scanning for ${detectedFilename}...`) //
    await delay(10000) //

    const scanResult = getRandomDemoJson(detectedFilename) //
    
    console.log(`[Scan] Scan completed. (Triggered by ${detectedFilename})`) //

    console.log("--- SCAN RESULT ---") //
    console.log(JSON.stringify(scanResult, null, 2)) //
    console.log("-------------------------------") //
    
    win.webContents.send('scan-result', scanResult)
  }

  // 3. Run both in parallel
  await Promise.all([ //
    uploadTask(), //
    demoTask() //
  ])
}

function startFileMonitor(win) {
  const downloadPath = app.getPath('downloads') //
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`) //

  const watcher = chokidar.watch(downloadPath, { //
    ignored: /(^|[\/\\])\..|.*\.tmp$|.*\.crdownload$/, //
    persistent: true, //
    ignoreInitial: true, //
    depth: 0, //
    awaitWriteFinish: { //
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  })

  watcher.on('add', (filePath) => { //
    const detectedFilename = path.basename(filePath)
    console.log(`[Monitor] Detected new file: ${detectedFilename}`) //
    
    // Send the "started" message to the UI immediately
    win.webContents.send('scan-started', detectedFilename)
    
    fileQueue.push(filePath) //
    processQueue(win) //
  })
  // ----------------------------------------------
} 

module.exports = {
  startFileMonitor //
}
const { Worker } = require('node:worker_threads') //

let attachedWindow = null //
let monitorWorker = null //
const monitorListeners = new Set() //

function attachWindow(win) {
  attachedWindow = win || null //
}

function notifyListeners(channel, payload) {
  if (attachedWindow && !attachedWindow.isDestroyed()) {
    attachedWindow.webContents.send(channel, payload) //
  } else if (channel === 'scan-result') {
    console.log('[Monitor] Headless scan result:', JSON.stringify(payload, null, 2)) //
  } else if (channel === 'scan-started') {
    console.log(`[Monitor] Headless scan started for: ${payload}`) //
  }

  monitorListeners.forEach((listener) => {
    try {
      listener(channel, payload) //
    } catch (err) {
      console.error('[Monitor] Listener error:', err) //
    }
  })
}

function onMonitorEvent(listener) {
  if (typeof listener === 'function') {
    monitorListeners.add(listener) //
    return () => monitorListeners.delete(listener) //
  }

  return () => {} //
}

function startMonitorWorker(win) {
  if (win) {
    attachWindow(win) //
  }

  if (monitorWorker) {
    return monitorWorker //
  }

  const downloadPath = app.getPath('downloads') //
  const workerPath = path.join(__dirname, 'scanner-worker.js') //

  monitorWorker = new Worker(workerPath, {
    workerData: { downloadPath }
  })

  monitorWorker.on('message', (message) => {
    const { channel, payload } = message || {} //

    if (!channel) {
      console.warn('[Monitor] Worker sent empty message') //
      return
    }

    if (channel === 'log') {
      console.log(payload) //
      return
    }

    if (channel === 'error') {
      console.error(payload) //
      return
    }

    notifyListeners(channel, payload)
  })

  monitorWorker.on('error', (err) => {
    console.error('[Monitor] Worker error:', err) //
  })

  monitorWorker.on('exit', (code) => {
    console.log(`[Monitor] Worker exited with code ${code}`) //
    monitorWorker = null
  })

  return monitorWorker //
}

function stopMonitorWorker() {
  if (!monitorWorker) {
    return //
  }

  const workerToStop = monitorWorker
  monitorWorker = null //

  workerToStop.terminate().catch((err) => {
    console.error('[Monitor] Failed to terminate worker:', err) //
  })
}

module.exports.attachWindow = attachWindow //
module.exports.startMonitorWorker = startMonitorWorker //
module.exports.stopMonitorWorker = stopMonitorWorker //
module.exports.onMonitorEvent = onMonitorEvent //
