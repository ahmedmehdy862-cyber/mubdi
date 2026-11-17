/**
 * Q1: golden set under the CALIBRATED critic — honest scorecard.
 *
 *   node packages/psd-engine/dist/golden-calibrated.mjs
 *
 * Columns per prompt: raw generator scores (pixel-calibrated) and post-loop
 * scores after the bounded quality loop, plus the escalation verdict when the
 * loop honestly cannot reach the 80 gate (Q3 templates will own that).
 */
import * as core from '../packages/core/src/index';
import { renderSpecToPng } from '../packages/renderer/src/index';
import { GOLDEN_SET } from './golden-set';
import * as fs from 'node:fs';
import * as path from 'node:path';

const OUT = 'out/golden-calibrated';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

interface Row {
  id: string;
  rawScores: number[];
  loopScores: number[];
  pixelFlags: string[];
  gaps: string[];
  escalated: boolean;
}

const rows: Row[] = [];
let rawPass = 0;
let loopPass = 0;
let escalations = 0;

for (const g of GOLDEN_SET) {
  const brief = core.parseBrief(g.prompt);
  const variants = core.generateVariantSet(brief, g.presetId, { name: 'مبدع' });
  const specs = variants.map((v) => v.spec);

  const rawReviews = await core.calibratedReviewSet(specs);
  rawPass += rawReviews.filter((r) => r.pass).length;

  const loopSpecs: typeof specs = [];
  const loopReviews: core.CalibratedReview[] = [];
  let escalated = false;
  const actions: string[] = [];
  for (const spec of specs) {
    const loop = await core.runQualityLoop(spec, brief);
    loopSpecs.push(loop.spec);
    loopReviews.push(loop.review);
    actions.push(...loop.actionsAr);
    if (loop.escalateAr) escalated = true;
  }
  loopPass += loopReviews.filter((r) => r.pass).length;
  if (escalated) escalations++;

  loopSpecs.forEach((spec, i) => {
    fs.writeFileSync(path.join(OUT, `${g.id}-v${i + 1}.png`), renderSpecToPng(spec));
  });

  const pixelFlags = rawReviews
    .map((r, i) => {
      const p = r.pixel;
      const flags: string[] = [];
      if (p.edgeDensity < core.PIXEL_THRESHOLDS.edgeDensity) flags.push('flat');
      if (p.detailCoverage < core.PIXEL_THRESHOLDS.detailCoverage) flags.push('no-detail');
      if (p.bgShare > core.PIXEL_THRESHOLDS.bgShare) flags.push('dead-bg');
      if (p.lumaClusters < core.PIXEL_THRESHOLDS.lumaClusters) flags.push('no-tonality');
      return flags.length ? `v${i + 1}:${flags.join('+')}` : '';
    })
    .filter(Boolean);

  rows.push({
    id: g.id,
    rawScores: rawReviews.map((r) => r.score),
    loopScores: loopReviews.map((r) => r.score),
    pixelFlags,
    gaps: rawReviews[0]!.gapsAr.slice(0, 2),
    escalated,
  });
  console.log(
    `${g.id} raw=[${rawReviews.map((r) => r.score)}] loop=[${loopReviews.map((r) => r.score)}] ${escalated ? 'ESCALATED' : ''}`,
  );
}

const allRaw = rows.flatMap((r) => r.rawScores);
const allLoop = rows.flatMap((r) => r.loopScores);
const summary = {
  generatedAt: new Date().toISOString(),
  gate: core.SHOW_GATE,
  raw: {
    mean: Number((allRaw.reduce((a, b) => a + b, 0) / allRaw.length).toFixed(1)),
    passing: rawPass,
    of: allRaw.length,
  },
  loop: {
    mean: Number((allLoop.reduce((a, b) => a + b, 0) / allLoop.length).toFixed(1)),
    passing: loopPass,
    of: allLoop.length,
  },
  escalations,
  rows,
};
fs.writeFileSync(path.join(OUT, 'scorecard.json'), JSON.stringify(summary, null, 1));

const md: string[] = [];
md.push('# النتيجة المعايرة — مجموعة الذهب (Q1)');
md.push('');
md.push(`البوابة: ${core.SHOW_GATE} — المقيّم: spec-rubric + بكسل مصحح ضد 61 مرجعاً.`);
md.push('');
md.push('| التوجيه | خام (معاير) | بعد حلقة الإصلاح | أعلام البكسل | تدرّج؟ |');
md.push('|---|---|---|---|---|');
for (const r of rows) {
  md.push(
    `| ${r.id} | ${r.rawScores.join(', ')} | ${r.loopScores.join(', ')} | ${r.pixelFlags.length ? r.pixelFlags.join(' · ') : '—'} | ${r.escalated ? 'نعم' : '—'} |`,
  );
}
md.push('');
md.push(
  `- الخام المعاير: متوسط ${summary.raw.mean}، نجح ${summary.raw.passing}/${summary.raw.of}.`,
);
md.push(
  `- بعد الحلقة: متوسط ${summary.loop.mean}، نجح ${summary.loop.passing}/${summary.loop.of}.`,
);
md.push(`- تدرّج لإعادة التوليد بقالب مختلف: ${escalations}/${rows.length} توجيهاً.`);
fs.writeFileSync(path.join(OUT, 'scorecard.md'), md.join('\n'));
console.log(
  `\nscorecard: ${OUT}/scorecard.md (loop passing ${loopPass}/${allLoop.length}, escalations ${escalations})`,
);
