#!/usr/bin/env node

const { Worker } = require('node:worker_threads')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const args = process.argv.slice(2)
let customPath = null
let shouldTouch = false
const manualScanPaths = []

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]

  if (arg === '--path' && index + 1 < args.length) {
    customPath = path.resolve(args[index + 1])
    index += 1
  } else if (arg === '--touch') {
    shouldTouch = true
  } else if (arg === '--scan' && index + 1 < args.length) {
    manualScanPaths.push(path.resolve(args[index + 1]))
    index += 1
  }
}

const downloadPath = customPath || path.join(os.tmpdir(), 'maiware-smoke-downloads')
fs.mkdirSync(downloadPath, { recursive: true })

process.env.MAIWARE_SKIP_UPLOAD = process.env.MAIWARE_SKIP_UPLOAD || '1'
process.env.MAIWARE_SCAN_DELAY_MS = process.env.MAIWARE_SCAN_DELAY_MS || '2000'

console.log(`[Smoke] Starting scanner worker for ${downloadPath}`)

const worker = new Worker(path.join(__dirname, '..', 'scanner-worker.js'), {
  workerData: { downloadPath }
})

let shutdownComplete = false
let readyReceived = false

const sendManualScans = () => {
  manualScanPaths.forEach((scanPath) => {
    if (!fs.existsSync(scanPath)) {
      console.warn(`[Smoke] Cannot queue missing file: ${scanPath}`)
      return
    }

    worker.postMessage({ type: 'scan-path', path: scanPath })
  })
}

const createSampleFile = () => {
  const filePath = path.join(downloadPath, `sample-${Date.now()}.txt`)
  fs.writeFileSync(filePath, `Sample file created at ${new Date().toISOString()}\n`)
  console.log(`[Smoke] Created sample file ${filePath}`)
}

worker.on('message', (message) => {
  const { channel, payload } = message || {}

  switch (channel) {
    case 'log':
      console.log(payload)
      break
    case 'error':
      console.error(payload)
      break
    case 'scan-started':
      if (typeof payload === 'object' && payload !== null) {
        console.log(`[Smoke] Scan started for: ${payload.filename || payload.fullPath || '[unknown]'}`)
      } else {
        console.log(`[Smoke] Scan started for: ${payload}`)
      }
      break
    case 'scan-result':
      console.log('[Smoke] Scan result:')
      console.log(JSON.stringify(payload, null, 2))
      break
    case 'ready':
      readyReceived = true
      console.log(`[Smoke] Worker ready. Watching: ${payload.downloadPath}`)
      if (shouldTouch) {
        createSampleFile()
      }
      if (manualScanPaths.length > 0) {
        sendManualScans()
      }
      break
    case 'shutdown-complete':
      shutdownComplete = true
      console.log('[Smoke] Worker shutdown complete.')
      break
    default:
      console.log('[Smoke] Worker message:', message)
  }
})

worker.on('error', (err) => {
  console.error('[Smoke] Worker error:', err)
  process.exitCode = 1
})

worker.on('exit', (code) => {
  console.log(`[Smoke] Worker exited with code ${code}`)
  if (shutdownComplete) {
    process.exit(0)
    return
  }

  process.exit(code)
})

const requestShutdown = () => {
  if (shutdownComplete) {
    return
  }

  console.log('[Smoke] Requesting worker shutdown...')
  worker.postMessage({ type: 'shutdown' })

  setTimeout(() => {
    if (!shutdownComplete) {
      console.warn('[Smoke] Forcing worker termination...')
      worker.terminate().finally(() => process.exit(0))
    }
  }, 5000).unref()
}

process.on('SIGINT', requestShutdown)
process.on('SIGTERM', requestShutdown)

if (!readyReceived && shouldTouch) {
  // If the worker takes a moment to spin up, ensure a file exists afterwards as well.
  setTimeout(() => {
    if (!readyReceived) {
      createSampleFile()
    }
  }, 1500).unref()
}
