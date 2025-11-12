// autoscan for new file downloaded, extract its hash, local IP and API calls
const { app } = require('electron')
const chokidar = require('chokidar')
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const axios = require('axios')
const FormData = require('form-data')
const { getRandomDemoJson } = require('./jsonsamples') 
const crypto = require('node:crypto')
const os = require('node:os')

// --- Configuration ---
const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' 
const FILE_SIZE_THRESHOLD = 100 * 1024 * 1024 * 1024 

const fileQueue = [] 
let isProcessing = false 

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Calculates the real MD5 and SHA256 hashes for a given file.
 * @param {string} filePath - The absolute path to the file.
 * @returns {Promise<{md5: string, sha256: string}>}
 */
async function getRealHashes(filePath) {
  try {
    const fileBuffer = await fsPromises.readFile(filePath);
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return { md5: md5Hash, sha256: sha256Hash };
  } catch (err) {
    console.error(`[Hash] Failed to calculate hashes for ${filePath}:`, err.message);
    // Return errors so the UI can still display something if needed
    return { md5: 'Error calculating hash', sha256: 'Error calculating hash' };
  }
}

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
      console.log(`[Monitor] File ${detectedFilename} is too large, skipping analysis.`) //
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
    console.log(`[Scan] Scanning for ${detectedFilename}...`)
    await delay(10000) 

    // Calculate the real hashes *before* generating the report
    const hashes = await getRealHashes(filePath);
    // Pass the real hashes into the demo generator
    const scanResult = getRandomDemoJson(detectedFilename, hashes)
    
    console.log(`[Scan] Scan completed. (Triggered by ${detectedFilename})`) 

    console.log("--- SCAN RESULT ---") 
    console.log(JSON.stringify(scanResult, null, 2)) 
    console.log("-------------------------------") 
    
    win.webContents.send('scan-result', scanResult)
  }

  // 3. Run both in parallel
  await Promise.all([ 
    uploadTask(),
    demoTask() 
  ])
}

function startFileMonitor(win) {
  const downloadPath = app.getPath('downloads') 
  console.log(`[Monitor] Watching for new files in: ${downloadPath}`) 

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

// --- Helper function to get Local IP ---
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback
}

module.exports = {
  startFileMonitor //
}
