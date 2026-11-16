import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let core, specMod, psdMod, renderMod, brandConfig;

// Portable install: keep user data next to the executable instead of on C:.
if (app.isPackaged) {
  app.setPath('userData', path.join(path.dirname(app.getPath('exe')), 'data'));
}

async function loadModules() {
  core = await import('../../packages/core/dist/index.js');
  specMod = core;
  psdMod = await import('../../packages/psd-engine/dist/index.js');
  renderMod = await import('../../packages/renderer/dist/index.js');
  brandConfig = await import('../../packages/brand/dist/index.js');
}

/** Brand identity handed to the generator — never a hardcoded name. */
function brandPayload() {
  const kit = brandConfig.defaultBrandKit();
  return { name: brandConfig.brand.studioName, fonts: { arabic: kit.fonts.arabic } };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
  const generated = core.generateVariantSet(brief, presetId, brandPayload());
  return generated.map((variant, index) => {
    const pngBuf = renderMod.renderSpecToPng(variant.spec);
    const psdBuf = psdMod.specToPsd(variant.spec, 'editable');
    const critique = core.critiqueSpec(variant.spec, brief);
    return {
      index,
      spec: variant.spec,
      directionId: variant.directionId,
      directionNameAr: variant.directionNameAr,
      directionSummaryAr: variant.directionSummaryAr,
      directionWhyAr: variant.directionWhyAr,
      archetype: variant.archetype,
      archetypeNameAr: variant.archetypeNameAr,
      rationaleAr: variant.rationaleAr,
      paletteSummaryAr: variant.paletteSummaryAr,
      conceptTitleAr: variant.conceptTitleAr,
      score: critique.score,
      gradeAr: critique.gradeAr,
      reportAr: critique.reportAr,
      pngBase64: pngBuf.toString('base64'),
      psdBase64: psdBuf.toString('base64'),
    };
  });
});

ipcMain.handle('improveVariant', async (_e, spec, brief) => {
  const result = core.autoFixSpec(spec, undefined, brief);
  const critique = core.critiqueSpec(result, brief);
  return {
    spec: result,
    pngBase64: renderMod.renderSpecToPng(result).toString('base64'),
    psdBase64: psdMod.specToPsd(result, 'editable').toString('base64'),
    score: critique.score,
    gradeAr: critique.gradeAr,
    reportAr: critique.reportAr,
  };
});

ipcMain.handle('exportPsd', async (_e, spec, mode) => {
  const buf = psdMod.specToPsd(spec, mode || 'editable');
  return buf.toString('base64');
});

ipcMain.handle('getBrand', async () => {
  return brandConfig.brand;
});

ipcMain.handle('detectTools', async () => {
  const fs = await import('node:fs');
  const psPath = 'C:/Program Files/Adobe/Adobe Photoshop 2025/Photoshop.exe';
  const aiPath = 'C:/Program Files/Adobe/Adobe Illustrator 2025/Support Files/Contents/Windows/Illustrator.exe';
  return {
    photoshop: fs.existsSync(psPath),
    illustrator: fs.existsSync(aiPath),
    imagemagick: true,
  };
});

ipcMain.handle('importPsd', async (_e, base64) => {
  const psdMod2 = await import('../../packages/psd-engine/dist/index.js');
  const buf = Buffer.from(base64, 'base64');
  return psdMod2.importPsd(buf);
});

ipcMain.handle('mergeSpec', async (_e, spec, imported) => {
  const core2 = await import('../../packages/core/dist/index.js');
  return core2.mergeSpecWithImport(spec, imported);
});

ipcMain.handle('runCritique', async (_e, spec, brief) => {
  return core.critiqueSpec(spec, brief);
});
