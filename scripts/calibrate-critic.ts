/**
 * Q1: calibrate the pixel-metric thresholds.
 *
 * Runs the renderer's pixel analyser over:
 *   GOOD — the 61 approved reference images (F:/Mubdi/resources/references)
 *   BAD  — the 60 golden-baseline renders of the old flat generator
 * then reports, per metric, whether the two populations separate and picks
 * the threshold as the midpoint between the best "bad" value and the worst
 * "good" value. The chosen thresholds are embedded in packages/core/src/calibrated.ts
 * with provenance noted in docs/quality-rubric.md.
 *
 * Run (bundled like the other scripts):
 *   node packages/psd-engine/dist/calibrate-critic.mjs
 */
import { analyzeImage } from '../packages/renderer/src/index';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REF_BASE = 'F:/Mubdi/resources/references';
const BAD_DIR = 'out/golden-baseline';

interface Sample {
  file: string;
  group: 'good' | 'bad';
  edgeDensity: number;
  detailCoverage: number;
  bgShare: number;
  hueFamilies: number;
  lumaClusters: number;
  contentCoverage: number;
}

function percentile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
  return s[idx] ?? 0;
}

const samples: Sample[] = [];

/* ---- good set: references ---- */
const cats = fs.readdirSync(REF_BASE);
for (const cat of cats) {
  const dir = path.join(REF_BASE, cat);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png)$/i.test(f)) continue;
    try {
      const s = await analyzeImage(path.join(dir, f));
      samples.push({ file: `${cat}/${f.slice(0, 24)}`, group: 'good', ...s });
      console.log(
        `good ${cat.slice(0, 6)}/${f.slice(0, 20)} edge=${s.edgeDensity.toFixed(3)} detail=${s.detailCoverage.toFixed(3)} bg=${s.bgShare.toFixed(2)} luma=${s.lumaClusters} hue=${s.hueFamilies}`,
      );
    } catch (e) {
      console.log(`SKIP ${f}: ${e instanceof Error ? e.message.slice(0, 50) : e}`);
    }
  }
}

/* ---- bad set: baseline renders ---- */
for (const f of fs.readdirSync(BAD_DIR)) {
  if (!f.endsWith('.png')) continue;
  const s = await analyzeImage(path.join(BAD_DIR, f));
  samples.push({ file: f, group: 'bad', ...s });
}

const good = samples.filter((s) => s.group === 'good');
const bad = samples.filter((s) => s.group === 'bad');

interface MetricReport {
  goodP10: number;
  goodP50: number;
  badP50: number;
  badP90: number;
  separated: boolean;
  threshold: number;
  direction: 'high' | 'low'; // good is higher or lower than bad
}

const metrics = ['edgeDensity', 'detailCoverage', 'bgShare', 'lumaClusters'] as const;
const report: Record<string, MetricReport> = {};
for (const m of metrics) {
  const g = good.map((s) => s[m] as number);
  const b = bad.map((s) => s[m] as number);
  const gP90 = percentile(g, 0.9);
  const bP90 = percentile(b, 0.9);
  void gP90;
  const direction: 'high' | 'low' = percentile(g, 0.5) >= percentile(b, 0.5) ? 'high' : 'low';
  let separated: boolean;
  let threshold: number;
  if (direction === 'high') {
    // good should exceed threshold: threshold between badP90 and goodP10
    const gP10 = percentile(g, 0.1);
    separated = gP10 > bP90;
    threshold = (gP10 + bP90) / 2;
  } else {
    const gP10 = percentile(g, 0.1);
    separated = gP10 < bP90;
    threshold = (gP10 + bP90) / 2;
  }
  report[m] = {
    goodP10: Number(percentile(g, 0.1).toFixed(3)),
    goodP50: Number(percentile(g, 0.5).toFixed(3)),
    badP50: Number(percentile(b, 0.5).toFixed(3)),
    badP90: Number(bP90.toFixed(3)),
    separated,
    threshold: Number(threshold.toFixed(3)),
    direction,
  };
}

const out = {
  generatedAt: new Date().toISOString(),
  goodSamples: good.length,
  badSamples: bad.length,
  report,
  samples,
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/critic-calibration.json', JSON.stringify(out, null, 1));

console.log('\n=== separation report ===');
for (const [m, r] of Object.entries(report)) {
  console.log(
    `${m.padEnd(16)} good(p10..p50)=${r.goodP10}..${r.goodP50} bad(p50..p90)=${r.badP50}..${r.badP90} separated=${r.separated} threshold=${r.threshold} (${r.direction})`,
  );
}
console.log('written: out/critic-calibration.json');
