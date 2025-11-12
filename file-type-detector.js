const fs = require('node:fs/promises')
const path = require('node:path')
const { load } = require('pe-library/cjs')

let peLibraryPromise = null

function getPeLibrary() {
  if (!peLibraryPromise) {
    peLibraryPromise = load()
  }
  return peLibraryPromise
}

async function readInitialBytes(filePath, byteCount) {
  const handle = await fs.open(filePath, 'r')
  try {
    const stats = await handle.stat()
    const length = Math.min(stats.size, byteCount)
    const buffer = Buffer.alloc(length)
    if (length === 0) {
      return buffer
    }
    await handle.read(buffer, 0, length, 0)
    return buffer
  } finally {
    await handle.close()
  }
}

async function determinePeStatus(filePath) {
  const absolutePath = path.resolve(filePath)
  const peLib = await getPeLibrary()

  try {
    const headerBuffer = await readInitialBytes(absolutePath, 4096)
    try {
      peLib.NtExecutable.from(headerBuffer)
      return { isPe: true }
    } catch (headerErr) {
      const fullBuffer = await fs.readFile(absolutePath)
      peLib.NtExecutable.from(fullBuffer)
      return { isPe: true }
    }
  } catch (err) {
    return { isPe: false, error: err instanceof Error ? err.message : String(err) }
  }
}

module.exports = {
  determinePeStatus,
}
