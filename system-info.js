const os = require('node:os')

function getPrimaryIPv4() {
  const interfaces = os.networkInterfaces()
  const preferredInterfaces = ['Ethernet', 'Wi-Fi', 'en0', 'eth0', 'wlan0']

  for (const name of preferredInterfaces) {
    if (!interfaces[name]) {
      continue
    }

    const match = interfaces[name].find((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    if (match) {
      return match.address
    }
  }

  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) {
      continue
    }

    const match = entries.find((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    if (match) {
      return match.address
    }
  }

  return '127.0.0.1'
}

module.exports = {
  getPrimaryIPv4
}
