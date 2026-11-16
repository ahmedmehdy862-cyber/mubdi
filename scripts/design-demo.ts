/**
 * Design-intelligence demo.
 *
 * Generates the same brief through three art directions, renders PNG + layered
 * PSD for each, measures them with the rubric, runs the auto-fix loop, and
 * writes a report you can read without opening the app.
 *
 *   node <bundle>.mjs ["prompt"] [presetId]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseBrief } from '../packages/core/src/brief';
import { generateVariantSet } from '../packages/core/src/spec';
import { critiqueSpec, resolvePreset } from '../packages/core/src/critique';
import { coach } from '../packages/design-knowledge/src/coach';
import { improveSpec } from '../packages/design-knowledge/src/improve';
import { knowledgeSnapshot } from '../packages/design-knowledge/src/knowledge';
import { renderSpecToPng } from '../packages/renderer/src/index';
import { specToPsd, validatePsd } from '../packages/psd-engine/src/index';

const prompt = process.argv[2] ?? 'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي';
const presetId = process.argv[3] ?? 'ig_post_4x5';
const outDir = path.resolve('out/design-demo');
fs.mkdirSync(outDir, { recursive: true });
// Never leave stale variants from a previous run in the demo folder.
for (const file of fs.readdirSync(outDir)) {
  if (/\.(png|psd|md|json)$/i.test(file)) fs.rmSync(path.join(outDir, file), { force: true });
}

const brief = parseBrief(prompt);
const variants = generateVariantSet(brief, presetId, { name: 'مبدع' });
const summary: Record<string, unknown>[] = [];
const lines: string[] = [];
lines.push('# تقرير محرك التصميم — مبدع');
lines.push('');
lines.push(`الطلب: ${prompt}`);
lines.push(`المنصة: ${presetId} — ${brief.intent}/${brief.language}`);
lines.push(`نسخة المعرفة: ${knowledgeSnapshot().version} — ${knowledgeSnapshot().principleCount} مبدأ`);
lines.push('');

for (const variant of variants) {
  const tag = `variant-${variant.variant}-${variant.directionId}`;
  const png = renderSpecToPng(variant.spec);
  fs.writeFileSync(path.join(outDir, `${tag}.png`), png);

  const psd = specToPsd(variant.spec, 'editable');
  fs.writeFileSync(path.join(outDir, `${tag}.psd`), psd);
  const psdCheck = validatePsd(psd, variant.spec);

  const critique = critiqueSpec(variant.spec, brief);
  const improvement = improveSpec(variant.spec, brief, resolvePreset(variant.spec), {
    maxIterations: 3,
    targetScore: 95,
  });
  const fixedPng = renderSpecToPng(improvement.spec);
  fs.writeFileSync(path.join(outDir, `${tag}-fixed.png`), fixedPng);
  const fixedPsd = specToPsd(improvement.spec, 'editable');
  fs.writeFileSync(path.join(outDir, `${tag}-fixed.psd`), fixedPsd);

  const layerNames = variant.spec.layers.map((l) => l.name);
  const textLayers = variant.spec.layers.filter((l) => l.type === 'text');
  lines.push(`## النسخة ${variant.variant + 1}: ${variant.directionNameAr} — ${variant.archetypeNameAr}`);
  lines.push('');
  lines.push(variant.directionSummaryAr);
  lines.push(`لماذا اختير: ${variant.directionWhyAr}`);
  lines.push(`الفكرة: ${variant.rationaleAr}`);
  lines.push(`اللوحة: ${variant.paletteSummaryAr}`);
  lines.push(`الطبقات: ${layerNames.join(' · ')}`);
  lines.push(`PSD: ${psd.length.toLocaleString('en-US')} بايت — ${psdCheck.ok ? 'سليم ✓' : `أخطاء: ${psdCheck.errors.join(', ')}`}`);
  lines.push(`النتيجة قبل: ${critique.score}/100 (${critique.gradeAr}) — بعد: ${improvement.after.score}/100 (${improvement.after.gradeAr})`);
  lines.push(`عدد الإصلاحات: ${improvement.steps.reduce((n, s) => n + s.actionsAr.length, 0)}`);
  lines.push('');
  lines.push(coach(improvement.after, brief).text);
  lines.push('');
  lines.push('---');
  lines.push('');

  summary.push({
    variant: variant.variant + 1,
    direction: variant.directionId,
    directionAr: variant.directionNameAr,
    archetype: variant.archetype,
    archetypeAr: variant.archetypeNameAr,
    layers: layerNames,
    textLayers: textLayers.length,
    scoreBefore: critique.score,
    scoreAfter: improvement.after.score,
    gradeAfter: improvement.after.gradeAr,
    fixes: improvement.steps.reduce((n, s) => n + s.actionsAr.length, 0),
    psdBytes: psd.length,
    psdValid: psdCheck.ok,
    distinctDirection: true,
    png: `${tag}.png`,
    fixedPng: `${tag}-fixed.png`,
  });
}

fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'));
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ prompt, presetId, brief, variants: summary }, null, 2));
console.log(lines.join('\n'));
console.log(`\nArtifacts: ${outDir}`);
