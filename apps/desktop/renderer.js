const status = document.getElementById('status');
(async () => {
  try {
    const b = await window.mubdi.getBrand();
    document.querySelector('header h1').textContent = b.studioName + ' — ' + b.sectionSocial;
    document.title = b.studioName + ' — ' + b.sectionSocial;
  } catch {}
})();
const variantsEl = document.getElementById('variants');
const layersEl = document.getElementById('layers');

function setStatus(msg) { status.textContent = msg; }

document.getElementById('generate').addEventListener('click', async () => {
  const prompt = document.getElementById('prompt').value;
  const presetId = document.getElementById('platform').value;
  setStatus('جاري فهم الطلب...');
  try {
    const brief = await window.mubdi.parseBrief(prompt);
    setStatus('جاري التصميم...');
    const variants = await window.mubdi.generateVariants(brief, presetId);
    setStatus(`تم توليد ${variants.length} variants`);
    renderVariants(variants);
    if (variants[0]) renderLayers(variants[0].spec);
  } catch (e) {
    setStatus('خطأ: ' + (e && e.message ? e.message : e));
  }
});

function renderVariants(variants) {
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
    div.appendChild(actions);
    variantsEl.appendChild(div);
  });
}

function renderLayers(spec) {
  layersEl.innerHTML = '<strong>Layers:</strong><br/>' + (spec.layers || []).map((l) => l.name).join('<br/>');
}