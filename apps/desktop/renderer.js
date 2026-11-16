const status = document.getElementById('status');
const variantsEl = document.getElementById('variants');
const layersEl = document.getElementById('layers');
const reportEl = document.getElementById('report');

let currentBrief = null;
let currentVariants = [];
let activeIndex = 0;

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
    currentBrief = await window.mubdi.parseBrief(prompt);
    setStatus('جاري التصميم وقياس النتيجة...');
    currentVariants = await window.mubdi.generateVariants(currentBrief, presetId);
    activeIndex = 0;
    renderVariants();
    setStatus(`تم توليد ${currentVariants.length} اتجاهات فنية — ${currentVariants[0].directionNameAr} ${currentVariants[0].score}/100`);
  } catch (e) {
    setStatus('خطأ: ' + (e && e.message ? e.message : e));
  }
});

function selectVariant(index) {
  activeIndex = index;
  document.querySelectorAll('.variant').forEach((el, i) => el.classList.toggle('active', i === index));
  const variant = currentVariants[index];
  if (!variant) return;
  renderLayers(variant.spec);
  reportEl.textContent = variant.reportAr || '';
}

function renderVariants() {
  variantsEl.innerHTML = '';
  currentVariants.forEach((v, index) => {
    const div = document.createElement('div');
    div.className = 'variant' + (index === activeIndex ? ' active' : '');
    div.addEventListener('click', () => selectVariant(index));

    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + v.pngBase64;
    img.alt = v.directionNameAr;
    div.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const title = document.createElement('div');
    title.className = 'dir';
    const name = document.createElement('span');
    name.textContent = `${v.directionNameAr} — ${v.archetypeNameAr}`;
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = `${v.score}/100`;
    title.append(name, score);
    meta.appendChild(title);

    const why = document.createElement('div');
    why.className = 'why';
    why.textContent = v.rationaleAr;
    meta.appendChild(why);

    const palette = document.createElement('div');
    palette.className = 'why muted';
    palette.textContent = v.paletteSummaryAr;
    meta.appendChild(palette);

    div.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btn = document.createElement('button');
    btn.textContent = 'تصدير PSD';
    btn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const psd = await window.mubdi.exportPsd(v.spec, 'editable');
      const a = document.createElement('a');
      a.href = 'data:application/octet-stream;base64,' + psd;
      a.download = `variant-${v.index + 1}-${v.directionId}.psd`;
      a.click();
    });
    actions.appendChild(btn);

    const improve = document.createElement('button');
    improve.textContent = 'تحسين تلقائي';
    improve.addEventListener('click', async (event) => {
      event.stopPropagation();
      improve.disabled = true;
      setStatus('جاري تطبيق قواعد التصميم...');
      try {
        const fixed = await window.mubdi.improveVariant(v.spec, currentBrief);
        v.spec = fixed.spec;
        v.pngBase64 = fixed.pngBase64;
        v.psdBase64 = fixed.psdBase64;
        v.score = fixed.score;
        v.gradeAr = fixed.gradeAr;
        v.reportAr = fixed.reportAr;
        renderVariants();
        selectVariant(index);
        setStatus(`تم التحسين — ${fixed.score}/100 (${fixed.gradeAr})`);
      } catch (e) {
        setStatus('تعذّر التحسين: ' + (e && e.message ? e.message : e));
      } finally {
        improve.disabled = false;
      }
    });
    actions.appendChild(improve);

    const btn2 = document.createElement('button');
    btn2.textContent = 'إعادة استيراد PSD';
    btn2.addEventListener('click', async (event) => {
      event.stopPropagation();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.psd';
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        const buf = await file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        const imp = await window.mubdi.importPsd(btoa(binary));
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

  selectVariant(activeIndex);
}

function renderLayers(spec) {
  layersEl.innerHTML = '<strong>الطبقات:</strong><br/>' + (spec.layers || []).map((l) => `${l.name} (${l.type})`).join('<br/>');
}
