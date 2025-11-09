const { contextBridge, ipcRenderer } = require('electron')

// Securely expose the 'ipcRenderer.on' function to your UI (script.js)
// We'll call it 'electronAPI'
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for the "scan-started" message
  onScanStarted: (callback) => ipcRenderer.on('scan-started', (_event, filename) => callback(filename)),
  
  // Listen for the "scan-result" message
  onScanResult: (callback) => ipcRenderer.on('scan-result', (_event, scanResult) => callback(scanResult))
})
