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
