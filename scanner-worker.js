const { parentPort, workerData } = require('node:worker_threads')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const axios = require('axios')
const FormData = require('form-data')
const { getRandomDemoJson } = require('./jsonsamples') //

const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' //
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 //

const fileQueue = [] //
let isProcessing = false //

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)) //

function postLog(message) {
  parentPort.postMessage({ channel: 'log', payload: message })
}

function postError(message) {
  parentPort.postMessage({ channel: 'error', payload: message })
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
    processQueue()
  }
}

async function handleSmallFile(filePath, detectedFilename) {
  const uploadTask = async () => {
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
    await delay(10000)

    const scanResult = getRandomDemoJson(detectedFilename)

    postLog(`[Scan] Scan completed. (Triggered by ${detectedFilename})`)
    parentPort.postMessage({ channel: 'scan-result', payload: scanResult })
  }

  await Promise.all([
    uploadTask(),
    demoTask()
  ])
}

function setupWatcher(downloadPath) {
  postLog(`[Monitor] Watching for new files in: ${downloadPath}`)

  const watcher = chokidar.watch(downloadPath, {
    ignored: /(^|[\/\\])\..|.*\.tmp$|.*\.crdownload$/,
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  })

  watcher.on('add', (filePath) => {
    const detectedFilename = path.basename(filePath)
    postLog(`[Monitor] Detected new file: ${detectedFilename}`)

    parentPort.postMessage({ channel: 'scan-started', payload: detectedFilename })

    fileQueue.push(filePath)
    processQueue()
  })
}

setupWatcher(workerData.downloadPath)
