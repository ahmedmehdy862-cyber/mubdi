const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mubdi', {
  parseBrief: (prompt) => ipcRenderer.invoke('parseBrief', prompt),
  generateVariants: (brief, presetId) => ipcRenderer.invoke('generateVariants', brief, presetId),
  improveVariant: (spec, brief) => ipcRenderer.invoke('improveVariant', spec, brief),
  exportPsd: (spec, mode) => ipcRenderer.invoke('exportPsd', spec, mode),
  getBrand: () => ipcRenderer.invoke('getBrand'),
  importPsd: (b64) => ipcRenderer.invoke('importPsd', b64),
  mergeSpec: (spec, imp) => ipcRenderer.invoke('mergeSpec', spec, imp),
  runCritique: (spec, brief) => ipcRenderer.invoke('runCritique', spec, brief),
  detectTools: () => ipcRenderer.invoke('detectTools'),
});
