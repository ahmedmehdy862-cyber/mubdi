/**
 * End-to-end verification of the installed Mubdi desktop app over CDP.
 * Usage: node scripts/verify-desktop.mjs [port]
 * Requires the app to be running with --remote-debugging-port.
 */
const port = Number(process.argv[2] || 9222);

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
      if (page && page.webSocketDebuggerUrl) return page;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('No CDP page target found');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('open', () => resolve({ ws, send }));
    ws.addEventListener('error', (e) => reject(new Error('WS error: ' + (e.message || 'unknown'))));
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    function send(method, params = {}) {
      id += 1;
      const payload = { id, method, params };
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(payload));
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            rej(new Error(`CDP timeout: ${method}`));
          }
        }, 120000);
      });
    }
  });
}

const target = await getTarget();
console.log('target:', target.title, '|', target.url);
const { ws, send } = await connect(target.webSocketDebuggerUrl);
await send('Runtime.enable');

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      'page error: ' +
        (result.exceptionDetails.exception?.description || result.exceptionDetails.text),
    );
  }
  return result.result.value;
}

// 1) Wait for the bridge, then drive the real UI flow.
const ui = await evaluate(`(async () => {
  for (let i = 0; i < 80 && !window.mubdi; i++) await new Promise(r => setTimeout(r, 250));
  for (let i = 0; i < 80 && !document.getElementById('prompt'); i++) await new Promise(r => setTimeout(r, 250));
  if (!window.mubdi) throw new Error('bridge missing');
  if (!document.getElementById('prompt')) throw new Error('UI not loaded');
  const brand = await window.mubdi.getBrand();
  const prompt = 'ملتقى تطوعي لتنظيم حملة تشجير في الحي';
  document.getElementById('prompt').value = prompt;
  document.getElementById('platform').value = 'ig_post_4x5';
  document.getElementById('generate').click();
  for (let i = 0; i < 240; i++) {
    if (document.querySelectorAll('#variants .variant').length >= 3) break;
    await new Promise(r => setTimeout(r, 250));
  }
  const cards = [...document.querySelectorAll('#variants .variant')].map(el => ({
    dir: el.querySelector('.dir span')?.textContent || '',
    score: el.querySelector('.score')?.textContent || '',
    why: el.querySelector('.why')?.textContent?.slice(0, 80) || '',
    pngLen: (el.querySelector('img')?.src || '').length,
    buttons: [...el.querySelectorAll('.actions button')].map(b => b.textContent),
  }));
  const report = document.getElementById('report').textContent || '';
  const layers = document.getElementById('layers').textContent || '';
  return {
    title: document.title,
    header: document.querySelector('header h1')?.textContent,
    badge: document.querySelector('.badge')?.textContent,
    brandName: brand.studioName,
    status: document.getElementById('status').textContent,
    cards,
    reportLen: report.length,
    reportHead: report.slice(0, 140),
    layerCount: layers.split('(').length - 1,
  };
})()`);

console.log(JSON.stringify(ui, null, 2));

// 2) PSD export -> re-import -> merge, plus auto-fix, via the same IPC the UI uses.
const roundTrip = await evaluate(`(async () => {
  const brief = await window.mubdi.parseBrief('ملتقى تطوعي لتنظيم حملة تشجير في الحي');
  const variants = await window.mubdi.generateVariants(brief, 'ig_post_4x5');
  const spec = variants[0].spec;
  const psd = await window.mubdi.exportPsd(spec, 'editable');
  const imported = await window.mubdi.importPsd(psd);
  const merged = await window.mubdi.mergeSpec(spec, imported);
  const improved = await window.mubdi.improveVariant(spec, brief);
  return {
    directionIds: variants.map(v => v.directionId),
    archetypes: variants.map(v => v.archetype),
    scores: variants.map(v => v.score),
    grades: variants.map(v => v.gradeAr),
    psdKB: Math.round(psd.length * 0.75 / 1024),
    importKeys: Object.keys(imported || {}),
    importedLayers: imported?.layers?.length ?? null,
    mergedLayers: merged?.layers?.length ?? null,
    improvedScore: improved.score,
    improvedGrade: improved.gradeAr,
    improvedPngKB: Math.round(improved.pngBase64.length * 0.75 / 1024),
    improvedPsdKB: Math.round(improved.psdBase64.length * 0.75 / 1024),
  };
})()`);

console.log(JSON.stringify(roundTrip, null, 2));

const problems = [];
if (!ui.title.includes(ui.brandName)) problems.push('title missing brand name');
if (ui.cards.length !== 3) problems.push(`expected 3 variants, got ${ui.cards.length}`);
const dirs = new Set(roundTrip.directionIds);
if (dirs.size !== 3) problems.push(`directions not distinct: ${[...dirs].join(',')}`);
if (new Set(roundTrip.archetypes).size !== 3)
  problems.push(`archetypes not distinct: ${roundTrip.archetypes.join(',')}`);
if (!ui.cards.every((c) => c.pngLen > 20000)) problems.push('PNG previews too small');
if (!ui.cards.every((c) => c.buttons.includes('تصدير PSD'))) problems.push('export button missing');
if (ui.reportLen < 200) problems.push('report panel too short');
if (roundTrip.psdKB < 100) problems.push('PSD suspiciously small');
if (!roundTrip.importedLayers) problems.push('PSD re-import returned no layers');
if (roundTrip.improvedScore < 90) problems.push(`auto-fix score low: ${roundTrip.improvedScore}`);

console.log(problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'ALL CHECKS PASSED');
ws.close();
process.exit(problems.length ? 1 : 0);
