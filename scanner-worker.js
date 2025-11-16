const { parentPort, workerData } = require('node:worker_threads')
let chokidar = null

try {
  chokidar = require('chokidar')
} catch (err) {
  // Fallback to fs.watch when chokidar is unavailable
}
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const crypto = require('node:crypto')
const axios = require('axios')
const FormData = require('form-data')
const { getRandomDemoJson } = require('./jsonsamples') //

const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' //
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 * 1024 //
const DEFAULT_SCAN_DELAY_MS = 10000

const fileQueue = [] //
let isProcessing = false //
let activeWatcher = null //
let shutdownRequested = false //

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)) //

const normalizeBoolean = (value) => {
  if (typeof value !== 'string') {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const skipUpload = normalizeBoolean(process.env.MAIWARE_SKIP_UPLOAD)
const customDelay = Number.parseInt(process.env.MAIWARE_SCAN_DELAY_MS || '', 10)
const SCAN_DELAY_MS = Number.isFinite(customDelay) ? Math.max(0, customDelay) : DEFAULT_SCAN_DELAY_MS

function postLog(message) {
  parentPort.postMessage({ channel: 'log', payload: message })
}

function postError(message) {
  parentPort.postMessage({ channel: 'error', payload: message })
}

async function waitForIdle(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs

  while ((isProcessing || fileQueue.length > 0) && Date.now() < deadline) {
    await delay(100)
  }

  if (isProcessing || fileQueue.length > 0) {
    postError('[Monitor] Shutdown timed out with pending work remaining.')
  }
}

async function processQueue() {
  if (isProcessing || fileQueue.length === 0) {
    return
  }

  isProcessing = true
  const filePath = fileQueue.shift()
  const detectedFilename = path.basename(filePath)

  postLog(`[Monitor] Processing: ${detectedFilename}`)

  try {
    const stats = await fsPromises.stat(filePath)

    if (stats.size < FILE_SIZE_THRESHOLD) {
      await handleSmallFile(filePath, detectedFilename)
    } else {
      postLog(`[Monitor] File ${detectedFilename} is large, skipping server push.`)
    }
  } catch (err) {
    postError(`[Monitor] Error processing ${filePath}: ${err.message}`)
  } finally {
    isProcessing = false
    if (!shutdownRequested) {
      processQueue()
    }
  }
}

async function handleSmallFile(filePath, detectedFilename) {
  const uploadTask = async () => {
    if (skipUpload) {
      postLog(`[Push] Skipping upload for ${detectedFilename} (MAIWARE_SKIP_UPLOAD).`)
      return
    }

    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))

    try {
      postLog(`[Push] Starting upload for ${detectedFilename}...`)
      const response = await axios.post(AI_APP_API_ENDPOINT, form, {
        headers: form.getHeaders(),
      })
      postLog(`[Push] AI App Response: ${response.status} ${JSON.stringify(response.data)}`)
    } catch (err) {
      postError(`[Push] AI app push failed: ${err.message}`)
    }
  }

  const demoTask = async () => {
    postLog(`[Scan] Scanning for ${detectedFilename}...`)
    await delay(SCAN_DELAY_MS)

    let fileHashes = null
    try {
      fileHashes = await computeFileHashes(filePath)
    } catch (err) {
      postError(`[Hash] Failed to compute hashes for ${detectedFilename}: ${err.message}`)
    }

    const scanResult = getRandomDemoJson(detectedFilename, fileHashes)

    postLog(`[Scan] Scan completed. (Triggered by ${detectedFilename})`)
    parentPort.postMessage({ channel: 'scan-result', payload: scanResult })
  }

  await Promise.all([
    uploadTask(),
    demoTask(),
  ])
}

function handleDetectedFile(filePath) {
  const detectedFilename = path.basename(filePath)
  postLog(`[Monitor] Detected new file: ${detectedFilename}`)

  parentPort.postMessage({ channel: 'scan-started', payload: detectedFilename })

  fileQueue.push(filePath)
  processQueue()
}

function setupWatcher(downloadPath) {
  postLog(`[Monitor] Watching for new files in: ${downloadPath}`)

  if (chokidar) {
    activeWatcher = chokidar.watch(downloadPath, {
      ignored: /(^|[\/\\])\..|.*\.tmp$|.*\.crdownload$/,
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })

    activeWatcher.on('add', handleDetectedFile)
    return
  }

  postLog('[Monitor] chokidar not available. Falling back to fs.watch (reduced accuracy).')

  const fallbackWatcher = fs.watch(downloadPath, { persistent: true }, async (eventType, filename) => {
    if (eventType !== 'rename' || !filename) {
      return
    }

    const candidatePath = path.join(downloadPath, filename)

    try {
      const stats = await fsPromises.stat(candidatePath)

      if (stats.isFile()) {
        handleDetectedFile(candidatePath)
      }
    } catch (err) {
      // Ignore ENOENT and similar errors when files are removed quickly
    }
  })

  activeWatcher = {
    close: () => {
      fallbackWatcher.close()
      return Promise.resolve()
    }
  }
}

async function closeWatcher() {
  if (!activeWatcher) {
    return
  }

  try {
    await activeWatcher.close()
    postLog('[Monitor] File watcher stopped.')
  } catch (err) {
    postError(`[Monitor] Failed to close watcher: ${err.message}`)
  } finally {
    activeWatcher = null
  }
}

function queueManualScan(filePath) {
  const normalized = path.resolve(filePath)
  fileQueue.push(normalized)
  postLog(`[Monitor] Manually queued file: ${normalized}`)
  processQueue()
}

function computeFileHashes(filePath) {
  return new Promise((resolve, reject) => {
    const sha256 = crypto.createHash('sha256')
    const md5 = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (chunk) => {
      sha256.update(chunk)
      md5.update(chunk)
    })

    stream.on('error', (err) => {
      reject(err)
    })

    stream.on('end', () => {
      try {
        resolve({
          sha256: sha256.digest('hex'),
          md5: md5.digest('hex')
        })
      } catch (err) {
        reject(err)
      }
    })
  })
}

async function handleShutdownRequest() {
  if (shutdownRequested) {
    return
  }

  shutdownRequested = true
  postLog('[Monitor] Shutdown requested.')

  await waitForIdle()
  await closeWatcher()

  parentPort.postMessage({ channel: 'shutdown-complete' })

  setImmediate(() => {
    try {
      if (typeof parentPort.close === 'function') {
        parentPort.close()
      }
    } catch (err) {
      postError(`[Monitor] Failed to close parent port: ${err.message}`)
    } finally {
      process.exit(0)
    }
  })
}

if (parentPort) {
  parentPort.on('message', (message) => {
    if (!message || typeof message !== 'object') {
      return
    }

    const { type, path: manualPath } = message

    switch (type) {
      case 'shutdown':
        handleShutdownRequest().catch((err) => {
          postError(`[Monitor] Shutdown handler failed: ${err.message}`)
        })
        break
      case 'flush-queue':
        processQueue()
        break
      case 'scan-path':
        if (typeof manualPath === 'string') {
          queueManualScan(manualPath)
        }
        break
      default:
        postLog(`[Monitor] Received unknown control message: ${type}`)
    }
  })
}

postLog(`[Monitor] Worker bootstrapped (pid ${process.pid}). Upload ${skipUpload ? 'disabled' : 'enabled'}, scan delay ${SCAN_DELAY_MS}ms.`)

setupWatcher(workerData.downloadPath)

parentPort.postMessage({ channel: 'ready', payload: { downloadPath: workerData.downloadPath } })
