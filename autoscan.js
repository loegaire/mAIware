const { app } = require('electron')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const axios = require('axios')
const FormData = require('form-data')
// 1. Import the new function from our updated demo-samples.js
const { getRandomDemoJson } = require('./jsonsamples')

// --- Configuration ---
const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan'
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 // 50 MB
// ---------------------

const fileQueue = []
let isProcessing = false

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function processQueue() {
  if (isProcessing || fileQueue.length === 0) {
    return
  }

  isProcessing = true
  const filePath = fileQueue.shift()
  const detectedFilename = path.basename(filePath)

  console.log(`[Monitor] Processing: ${detectedFilename}`)

  try {
    const stats = await fsPromises.stat(filePath)

    if (stats.size < FILE_SIZE_THRESHOLD) {
      await handleSmallFile(filePath, detectedFilename)
    } else {
      console.log(`[Monitor] File ${detectedFilename} is large, skipping server push.`)
    }

  } catch (err) {
    console.error(`[Monitor] Error processing ${filePath}:`, err.message)
  } finally {
    isProcessing = false
    processQueue()
  }
}

async function handleSmallFile(filePath, detectedFilename) {
  // 1. "Real Upload" task
  const uploadTask = async () => {
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))
    
    try {
      console.log(`[Push] Starting real upload for ${detectedFilename}...`)
      const response = await axios.post(AI_APP_API_ENDPOINT, form, {
        headers: form.getHeaders(),
      })
      console.log(`[Push] Real AI App Response: ${response.status}`, response.data)
    } catch (err) {
      console.error(`[Push] Real AI app push failed:`, err.message)
    }
  }

  // 2. "Demo Printout" task (This is the updated part)
  const demoTask = async () => {
    console.log(`[Demo] Starting 10s demo timer for ${detectedFilename}...`)
    await delay(10000)

    // 2a. Call the function to get a new, random, human-readable JSON
    const scanResult = getRandomDemoJson(detectedFilename)
    
    console.log(`[Demo] Scan complete. (Triggered by ${detectedFilename})`)
    console.log(`[Demo] Randomly generated sample: ${scanResult.classification} from ${scanResult.vendor_analysis}`)

    // 2b. Print the resulting JSON
    console.log("--- RANDOM SCAN RESULT (DEMO) ---")
    console.log(JSON.stringify(scanResult, null, 2))
    console.log("-------------------------------")
  }

  // 3. Run both in parallel
  await Promise.all([
    uploadTask(),
    demoTask()
  ])
}

function startFileMonitor() {
  const downloadPath = app.getPath('downloads')
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`)

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
    console.log(`[Monitor] Detected new file: ${path.basename(filePath)}`)
    fileQueue.push(filePath)
    processQueue()
  })
}

module.exports = {
  startFileMonitor
}
