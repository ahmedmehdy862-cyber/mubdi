import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let core, specMod, psdMod, renderMod;

async function loadModules() {
  core = await import('../../packages/core/dist/index.js');
  specMod = core;
  psdMod = await import('../../packages/psd-engine/dist/index.js');
  renderMod = await import('../../packages/renderer/dist/index.js');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(async () => {
  await loadModules();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('parseBrief', async (_e, prompt) => {
  const brief = core.parseBrief(prompt);
  return brief;
});

ipcMain.handle('generateVariants', async (_e, brief, presetId) => {
  const variants = [];
  for (let v = 0; v < 3; v++) {
    const spec = core.generateSpec(brief, presetId, v);
    const pngBuf = renderMod.renderSpecToPng(spec);
    const psdBuf = psdMod.specToPsd(spec, 'editable');
    variants.push({
      index: v,
      spec,
      pngBase64: pngBuf.toString('base64'),
      psdBase64: psdBuf.toString('base64'),
    });
  }
  return variants;
});

ipcMain.handle('exportPsd', async (_e, spec, mode) => {
  const buf = psdMod.specToPsd(spec, mode || 'editable');
  return buf.toString('base64');
});

ipcMain.handle('getBrand', async () => {
  const brand = await import('../../packages/brand/dist/index.js');
  return brand.brand;
});