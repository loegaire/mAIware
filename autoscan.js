const { app } = require('electron')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs') // Use 'fs' for createReadStream
const fsPromises = require('node:fs').promises // Use promises for 'stat'
const axios = require('axios')
const FormData = require('form-data')
const { allSamples } = require('./jsonsamples') // Import the demo JSON list

// --- Configuration ---
const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' // Real AI app endpoint
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 // 50 MB
// ---------------------

const fileQueue = []
let isProcessing = false

/**
 * A helper function to simulate a non-blocking delay.
 * @param {number} ms - Milliseconds to wait.
 */
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

    // Triage Logic
    if (stats.size < FILE_SIZE_THRESHOLD) {
      // File is SMALL: Run both the real push AND the demo simulation
      await handleSmallFile(filePath, detectedFilename)
    } else {
      // File is LARGE: (Logic ignored for now)
      console.log(`[Monitor] File ${detectedFilename} is large, skipping server push.`)
    }

  } catch (err) {
    console.error(`[Monitor] Error processing ${filePath}:`, err.message)
  } finally {
    isProcessing = false
    processQueue() // Check for the next file
  }
}

/**
 * Handles small files by running the real upload and demo printout in parallel.
 * @param {string} filePath - The full path to the file.
 * @param {string} detectedFilename - The name of the file.
 */
async function handleSmallFile(filePath, detectedFilename) {
  // 1. Create the "Real Upload" task
  const uploadTask = async () => {
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))
    
    try {
      console.log(`[Push] Starting upload for ${detectedFilename}...`)
      const response = await axios.post(AI_APP_API_ENDPOINT, form, {
        headers: form.getHeaders(),
      })
      console.log(`[Push] AI App Response: ${response.status}`, response.data)
    } catch (err) {
      console.error(`[Push] AI app push failed:`, err.message)
    }
  }

  // 2. Create the "Demo Printout" task
  const demoTask = async () => {
    await delay(10000) // Wait 10 seconds

    // Get a random sample
    const randomIndex = Math.floor(Math.random() * allSamples.length)
    const scanResult = allSamples[randomIndex]
    
    console.log(`[Scan] Scan complete. (Triggered by ${detectedFilename})`)

    // Print the random JSON
    console.log("--- SCAN RESULT ---")
    console.log(JSON.stringify(scanResult, null, 2)) // Pretty-prints
    console.log("-------------------------------")
  }

  // 3. Run both tasks in parallel and wait for both to finish
  // This ensures the queue doesn't move on until everything is done.
  await Promise.all([
    uploadTask(),
    demoTask()
  ])
}

function startFileMonitor() {
  const downloadPath = app.getPath('downloads')
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`)

  const watcher = chokidar.watch(downloadPath, {
    ignored: /(^|[\/\\])\..|.*\.tmp$|.*\.crdownload$/, // Ignore dotfiles, .tmp, and .crdownload
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { // Wait for file to finish writing
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
