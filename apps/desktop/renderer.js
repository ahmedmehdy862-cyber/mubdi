const status = document.getElementById('status');
const variantsEl = document.getElementById('variants');
const layersEl = document.getElementById('layers');

(async () => {
  try {
    const b = await window.mubdi.getBrand();
    document.querySelector('header h1').textContent = b.studioName + ' — ' + b.sectionSocial;
    document.title = b.studioName + ' — ' + b.sectionSocial;
  } catch {}
  try {
    const t = await window.mubdi.detectTools();
    document.querySelector('.badge').textContent = `Photoshop: ${t.photoshop ? '✓' : '✗'} | Illustrator: ${t.illustrator ? '✓' : '✗'} | ImageMagick: ✓`;
  } catch {}
})();

function setStatus(msg) { status.textContent = msg; }

document.getElementById('generate').addEventListener('click', async () => {
  const prompt = document.getElementById('prompt').value;
  const presetId = document.getElementById('platform').value;
  setStatus('جاري فهم الطلب...');
  try {
    const brief = await window.mubdi.parseBrief(prompt);
    setStatus('جاري التصميم...');
    const variants = await window.mubdi.generateVariants(brief, presetId);
    // critique first variant
    try {
      const c = await window.mubdi.runCritique(variants[0].spec, brief);
      setStatus(`تم توليد ${variants.length} variants — score: ${c.score}`);
    } catch { setStatus(`تم توليد ${variants.length} variants`); }
    renderVariants(variants, brief);
    if (variants[0]) renderLayers(variants[0].spec);
  } catch (e) {
    setStatus('خطأ: ' + (e && e.message ? e.message : e));
  }
});

function renderVariants(variants, brief) {
  variantsEl.innerHTML = '';
  variants.forEach((v) => {
    const div = document.createElement('div');
    div.className = 'variant';
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + v.pngBase64;
    div.appendChild(img);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const btn = document.createElement('button');
    btn.textContent = 'تصدير PSD';
    btn.addEventListener('click', async () => {
      const psd = await window.mubdi.exportPsd(v.spec, 'editable');
      const a = document.createElement('a');
      a.href = 'data:application/octet-stream;base64,' + psd;
      a.download = `variant-${v.index}.psd`;
      a.click();
    });
    actions.appendChild(btn);
    // re-import button
    const btn2 = document.createElement('button');
    btn2.textContent = 'إعادة استيراد PSD';
    btn2.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.psd';
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        const buf = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const imp = await window.mubdi.importPsd(b64);
        const merged = await window.mubdi.mergeSpec(v.spec, imp);
        v.spec = merged;
        renderLayers(merged);
        setStatus('تم دمج تعديلات PSD');
      };
      input.click();
    });
    actions.appendChild(btn2);
    div.appendChild(actions);
    variantsEl.appendChild(div);
  });
}

function renderLayers(spec) {
  layersEl.innerHTML = '<strong>Layers:</strong><br/>' + (spec.layers || []).map((l) => `${l.name} (${l.type})`).join('<br/>');
}