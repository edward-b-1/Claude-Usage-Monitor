const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUsageUpdate: (cb) => ipcRenderer.on('usage-update', (_e, data) => cb(data)),
  onError: (cb) => ipcRenderer.on('usage-error', (_e, msg) => cb(msg)),
  requestRefresh: () => ipcRenderer.send('request-refresh'),
  closeWindow: () => ipcRenderer.send('close-window'),
});
