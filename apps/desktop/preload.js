import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mubdi', {
  parseBrief: (prompt) => ipcRenderer.invoke('parseBrief', prompt),
  generateVariants: (brief, presetId) => ipcRenderer.invoke('generateVariants', brief, presetId),
  exportPsd: (spec, mode) => ipcRenderer.invoke('exportPsd', spec, mode),
  getBrand: () => ipcRenderer.invoke('getBrand'),
});