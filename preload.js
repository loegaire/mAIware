const { contextBridge, ipcRenderer } = require('electron')

// Securely expose the 'ipcRenderer.on' function to your UI (script.js)
// We'll call it 'electronAPI'
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for the "scan-started" message
  onScanStarted: (callback) => ipcRenderer.on('scan-started', (_event, filename) => callback(filename)),

  // Listen for the "scan-result" message
  onScanResult: (callback) => ipcRenderer.on('scan-result', (_event, scanResult) => callback(scanResult)),

  // Listen for PE metadata updates
  onScanFileMetadata: (callback) => ipcRenderer.on('scan-file-metadata', (_event, metadata) => callback(metadata)),
  onScanDisassembly: (callback) => ipcRenderer.on('scan-disassembly', (_event, payload) => callback(payload)),

  getSystemIp: () => ipcRenderer.invoke('system-info:get-ip'),
  getHistory: () => ipcRenderer.invoke('history:get'),
  pickManualScanFile: () => ipcRenderer.invoke('scan:manual:pick-file'),
  pickManualScanFolder: () => ipcRenderer.invoke('scan:manual:pick-folder'),
  scanManualFile: (filePath) => ipcRenderer.invoke('scan:manual', filePath),
  scanManualFolder: (folderPath) => ipcRenderer.invoke('scan:manual-folder', folderPath),
  getLanUsers: () => ipcRenderer.invoke('server:get-lan-users')
})
