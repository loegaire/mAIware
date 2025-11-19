const { parentPort, workerData } = require('node:worker_threads')
let chokidar = null

try {
  chokidar = require('chokidar')
} catch (err) {
  // Fallback to fs.watch when chokidar is unavailable
}
const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs')
const fsPromises = require('node:fs').promises
const crypto = require('node:crypto')
const axios = require('axios')
const FormData = require('form-data')
const dgram = require('node:dgram')
const { getRandomDemoJson } = require('./jsonsamples') //
const { determinePeStatus } = require('./file-type-detector') //
const { getPrimaryIPv4 } = require('./system-info')

const AI_APP_API_ENDPOINT = 'http://localhost:1234/scan' //
const AGENT_ID = process.env.MAIWARE_AGENT_ID || os.hostname()
const AGENT_IP = process.env.MAIWARE_AGENT_IP || getPrimaryIPv4()
const SERVER_PORT = process.env.MAIWARE_SERVER_PORT || '3000'
const BROADCAST_PORT = 3001
const DISCOVERY_MESSAGE = 'MAIWARE_SERVER_DISCOVERY'
const LAST_KNOWN_PATH = path.join(os.homedir(), '.maiware-server.json')
let resolvedServerBaseUrl = null
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

// --- Server resolution helpers (plug-n-play: try local then LAN) ---
const readLastKnownServer = () => {
  try {
    const raw = fs.readFileSync(LAST_KNOWN_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.baseUrl === 'string') {
      return parsed.baseUrl
    }
  } catch (_) {
    // ignore
  }
  return null
}

const writeLastKnownServer = (baseUrl) => {
  try {
    fs.writeFileSync(LAST_KNOWN_PATH, JSON.stringify({ baseUrl }), 'utf8')
  } catch (_) {
    // non-fatal
  }
}

const stripTrailingSlash = (url) => url.endsWith('/') ? url.slice(0, -1) : url

const probeServer = async (baseUrl) => {
  const target = `${stripTrailingSlash(baseUrl)}/api/health`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(target, { signal: controller.signal })
    clearTimeout(timeout)
    return res.ok
  } catch (_) {
    return false
  }
}

const unique = (list) => Array.from(new Set(list.filter(Boolean)))

const getGatewayCandidates = () => {
  const ip = getPrimaryIPv4()
  if (!ip) return []
  const parts = ip.split('.')
  if (parts.length !== 4) return []
  const prefix = parts.slice(0, 3).join('.')
  // lightweight probes for common addresses on /24
  return ['1', '10', '20', '50', '100', '254'].map(last => `http://${prefix}.${last}:${SERVER_PORT}`)
}

// Discover servers via UDP broadcast with caching
let broadcastCache = null
let broadcastCacheExpiry = 0
const BROADCAST_CACHE_TTL = 30000 // Cache successful broadcast results for 30 seconds

const discoverServersViaBroadcast = () => {
  // Only return cached results if we found servers AND cache is still valid
  const now = Date.now()
  if (broadcastCache && broadcastCache.length > 0 && now < broadcastCacheExpiry) {
    postLog(`[Broadcast] Using cached discovery: ${broadcastCache.length} server(s) (${Math.floor((broadcastCacheExpiry - now) / 1000)}s remaining)`)
    return Promise.resolve(broadcastCache)
  }

  return new Promise((resolve) => {
    const discovered = []
    const client = dgram.createSocket('udp4')
    
    client.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.service === 'mAIware-server' && data.port && data.ips) {
          for (const ip of data.ips) {
            discovered.push(`http://${ip}:${data.port}`)
          }
        }
      } catch (_) {
        // Ignore malformed responses
      }
    })
    
    client.on('error', () => {
      // Ignore errors, just return what we found
    })
    
    // Bind to any port
    client.bind(() => {
      client.setBroadcast(true)
      
      // Send broadcast discovery message
      const message = Buffer.from(DISCOVERY_MESSAGE)
      client.send(message, BROADCAST_PORT, '255.255.255.255', (err) => {
        if (err) {
          client.close()
          resolve([])
        }
      })
      
      // Wait 1.5 seconds for responses
      setTimeout(() => {
        client.close()
        // Only cache if we actually discovered servers
        if (discovered.length > 0) {
          broadcastCache = discovered
          broadcastCacheExpiry = Date.now() + BROADCAST_CACHE_TTL
          postLog(`[Broadcast] Discovered ${discovered.length} server(s), caching for ${BROADCAST_CACHE_TTL/1000}s`)
        } else {
          postLog('[Broadcast] No servers found via broadcast')
        }
        resolve(discovered)
      }, 1500)
    })
  })
}

async function resolveServerBaseUrl() {
  if (resolvedServerBaseUrl) {
    return resolvedServerBaseUrl
  }

  const envUrl = process.env.MAIWARE_SERVER_URL
  const envHost = process.env.MAIWARE_SERVER_HOST

  // Priority 1: Try last known working server first (fast path)
  const lastKnown = readLastKnownServer()
  if (lastKnown) {
    const ok = await probeServer(lastKnown)
    if (ok) {
      resolvedServerBaseUrl = stripTrailingSlash(lastKnown)
      postLog(`[Server] Reconnected to last known: ${resolvedServerBaseUrl}`)
      return resolvedServerBaseUrl
    }
  }

  // Priority 2: UDP broadcast discovery (finds servers on LAN automatically)
  postLog('[Server] Broadcasting for mAIware servers on LAN...')
  const broadcastResults = await discoverServersViaBroadcast()
  if (broadcastResults.length > 0) {
    for (const base of broadcastResults) {
      const ok = await probeServer(base)
      if (ok) {
        resolvedServerBaseUrl = stripTrailingSlash(base)
        writeLastKnownServer(resolvedServerBaseUrl)
        postLog(`[Server] Discovered via broadcast: ${resolvedServerBaseUrl}`)
        return resolvedServerBaseUrl
      }
    }
  }

  // Priority 3: Try explicit configuration and common local addresses
  const candidates = unique([
    envUrl,
    envHost ? `http://${envHost}:${SERVER_PORT}` : null,
    `http://localhost:${SERVER_PORT}`,
    `http://127.0.0.1:${SERVER_PORT}`,
    `http://${os.hostname()}:${SERVER_PORT}`,
    'http://host.docker.internal:3000',
    ...getGatewayCandidates()
  ])

  postLog(`[Server] Probing ${candidates.length} candidate endpoints...`)
  for (const base of candidates) {
    const ok = await probeServer(base)
    if (ok) {
      resolvedServerBaseUrl = stripTrailingSlash(base)
      writeLastKnownServer(resolvedServerBaseUrl)
      postLog(`[Server] Selected endpoint ${resolvedServerBaseUrl}`)
      return resolvedServerBaseUrl
    }
  }

  // Fall back to localhost even if probe failed (best effort)
  resolvedServerBaseUrl = `http://localhost:${SERVER_PORT}`
  postLog(`[Server] Falling back to ${resolvedServerBaseUrl}`)
  return resolvedServerBaseUrl
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

async function sendResultToServer(scanResult, retries = 3) {
  const payload = {
    ...scanResult,
    agent_id: AGENT_ID,
    systemInfo: {
      hostname: os.hostname(),
      ip: AGENT_IP
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const baseUrl = await resolveServerBaseUrl()
      const endpoint = `${baseUrl}/api/submit-scan`
      
      postLog(`[Server] Uploading scan to ${endpoint} as ${payload.agent_id} (attempt ${attempt + 1}/${retries})`)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeout)

      if (response.ok) {
        postLog('[Server] Scan result uploaded successfully')
        return // Success!
      } else {
        postLog(`[Server] Upload failed: ${response.status} ${response.statusText}`)
        if (response.status >= 400 && response.status < 500) {
          // Client error, don't retry
          return
        }
      }
    } catch (error) {
      postLog(`[Server] Failed to upload: ${error.message}`)
      
      // Force re-resolve on next attempt in case server moved
      resolvedServerBaseUrl = null
      
      // Exponential backoff: wait 1s, 2s, 4s
      if (attempt < retries - 1) {
        const backoffMs = Math.pow(2, attempt) * 1000
        postLog(`[Server] Retrying in ${backoffMs}ms...`)
        await delay(backoffMs)
      }
    }
  }
  
  postLog('[Server] All upload attempts failed. Scan result will be lost.')
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

    // Check if file is PE
    let isPe = false
    try {
      const peStatus = await determinePeStatus(filePath)
      isPe = !!peStatus.isPe
      postLog(`[PE Detection] ${detectedFilename} is ${isPe ? 'a PE file' : 'not a PE file'}`)
    } catch (err) {
      // On error, treat as non-PE (safer default)
      isPe = false
      postLog(`[PE Detection] Failed for ${detectedFilename}: ${err.message}`)
    }

    // Build the proper result based on PE status
    let scanResult
    if (!isPe) {
      scanResult = {
        detected_filename: detectedFilename,
        file_hashes: fileHashes || { sha256: '', md5: '' },
        classification: 'Benign',
        is_pe: false
      }
    } else {
      scanResult = getRandomDemoJson(detectedFilename, fileHashes)
      scanResult.is_pe = true
    }

    postLog(`[Scan] Scan completed. (Triggered by ${detectedFilename})`)
    parentPort.postMessage({ channel: 'scan-result', payload: scanResult })
    
    // Send to server
    await sendResultToServer(scanResult)
  }

  await Promise.all([
    uploadTask(),
    demoTask(),
  ])
}

function handleDetectedFile(filePath, options = {}) {
  const detectedFilename = path.basename(filePath)
  postLog(`[Monitor] Detected new file: ${detectedFilename}`)

  parentPort.postMessage({
    channel: 'scan-started',
    payload: {
      filename: detectedFilename,
      fullPath: filePath,
      manual: !!options.manual
    }
  })

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
  postLog(`[Monitor] Manually queued file: ${normalized}`)
  handleDetectedFile(normalized, { manual: true })
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
