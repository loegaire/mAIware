const os = require('node:os')
const crypto = require('node:crypto')
const axios = require('axios')

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_FLUSH_INTERVAL_MS = 3000

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return ''
  }

  return url.trim()
}

function createDashboardPublisher(options = {}) {
  const endpoint = normalizeUrl(options.endpoint || process.env.MAIWARE_DASHBOARD_URL)
  const apiKey = options.apiKey || process.env.MAIWARE_DASHBOARD_API_KEY || ''
  const batchSize = Number.isFinite(options.batchSize) ? options.batchSize : DEFAULT_BATCH_SIZE
  const flushIntervalMs = Number.isFinite(options.flushIntervalMs)
    ? options.flushIntervalMs
    : DEFAULT_FLUSH_INTERVAL_MS
  const agentId = options.agentId || process.env.MAIWARE_AGENT_ID || os.hostname()

  if (!endpoint) {
    return createNoopPublisher()
  }

  let queue = []
  let timer = null
  let closing = false

  const headers = {
    'content-type': 'application/json'
  }

  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`
  }

  const flush = async () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    if (!queue.length) {
      return
    }

    const batch = queue
    queue = []

    try {
      await axios.post(endpoint, { events: batch }, { headers })
    } catch (err) {
      console.error('[Dashboard] Failed to publish events:', err.message)
      queue = batch.concat(queue)
      scheduleFlush()
    }
  }

  const scheduleFlush = () => {
    if (timer || !queue.length || closing) {
      return
    }

    timer = setTimeout(() => {
      flush().catch((err) => {
        console.error('[Dashboard] Flush error:', err)
      })
    }, flushIntervalMs)
  }

  const enqueue = (event) => {
    if (!event || closing) {
      return
    }

    const formatted = formatEvent(event, agentId)
    queue.push(formatted)

    if (queue.length >= batchSize) {
      flush().catch((err) => {
        console.error('[Dashboard] Flush error:', err)
      })
      return
    }

    scheduleFlush()
  }

  const close = async () => {
    closing = true

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    await flush()
  }

  const publisher = {
    enqueue,
    flush,
    close,
  }

  return publisher
}

function createNoopPublisher() {
  const noop = async () => {}
  return {
    enqueue: () => {},
    flush: noop,
    close: noop,
  }
}

function formatEvent(event, agentId) {
  const payload = sanitizePayload(event.payload)
  return {
    id: safeRandomId(),
    channel: event.channel || 'unknown',
    payload,
    timestamp: new Date().toISOString(),
    agentId,
  }
}

function sanitizePayload(value) {
  if (value === undefined) {
    return null
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch (err) {
    return { error: 'Unserializable payload', message: err.message }
  }
}

function safeRandomId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return crypto.randomBytes(16).toString('hex')
}

module.exports = {
  createDashboardPublisher,
}
