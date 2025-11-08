const { app } = require('electron')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs').promises // Use promises for async file stats
const axios = require('axios')
const FormData = require('form-data') // Needed to send files in a POST request

// --- Configuration ---
// The local API endpoint of your AI app
const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' 
// Files larger than this (in bytes) will be pushed to the server (logic ignored for now)
const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024 // 50 MB
// ---------------------

// This queue will hold file paths, ensuring we process them one-by-one
const fileQueue = []
let isProcessing = false // Flag to ensure only one file is processed at a time

/**
 * Processes the next file in the queue.
 * This function is the core of your "one-by-one" logic.
 */
async function processQueue() {
  if (isProcessing || fileQueue.length === 0) {
    return // Either busy or nothing to do
  }

  isProcessing = true
  const filePath = fileQueue.shift() // Get the oldest file from the queue

  console.log(`[Monitor] Processing: ${path.basename(filePath)}`)

  try {
    // 1. Get file stats (size)
    const stats = await fs.stat(filePath)

    // 2. Triage Logic
    if (stats.size < FILE_SIZE_THRESHOLD) {
      // File is SMALL: Push to the local AI app
      await pushToAIApp(filePath)
    } else {
      // File is LARGE: Push to the server (logic ignored for now)
      console.log(`[Monitor] File is large, pushed to server.`)
    }

  } catch (err) {
    // Handle errors (e.g., file was deleted before we could process it)
    console.error(`[Monitor] Error processing ${filePath}:`, err.message)
  } finally {
    // 3. Mark as no longer processing and check the queue again
    isProcessing = false
    processQueue() // Check for next item
  }
}

/**
 * Pushes the file to your local AI application's API endpoint.
 * @param {string} filePath - The full path to the file.
 */
async function pushToAIApp(filePath) {
  // We use FormData to send the file as a 'multipart/form-data' upload
  const form = new FormData()
  // We need to create a read stream to pipe the file data
  form.append('file', require('fs').createReadStream(filePath))

  try {
    console.log(`[Monitor] Pushing ${path.basename(filePath)} to local AI app...`)
    
    // We use 'await' so this network request is non-blocking.
    // The main app (UI) will not freeze during this upload.
    const response = await axios.post(AI_APP_API_ENDPOINT, form, {
      headers: form.getHeaders(),
    })

    console.log(`[Monitor] AI App Response: ${response.status}`, response.data)

  } catch (err) {
    console.error(`[Monitor] Failed to push file to AI app:`, err.message)
  }
}

/**
 * Starts the file system watcher.
 */
function startFileMonitor() {
  const downloadPath = app.getPath('downloads')
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`)

  const watcher = chokidar.watch(downloadPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't scan files that are already there
    depth: 0, // Only watch the top-level Downloads folder
  })

  // Listen for the 'add' event, which fires when a new file is created
  watcher.on('add', (filePath) => {
    console.log(`[Monitor] Detected new file: ${path.basename(filePath)}`)
    
    // Add the new file to our queue and try to process it
    fileQueue.push(filePath)
    processQueue()
  })
}

// Export the function so main.js can call it
module.exports = {
  startFileMonitor
}
