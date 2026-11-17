/**
 * Q1: reference profile builder.
 *
 * Measures the 61 approved reference images with ImageMagick and derives the
 * pixel-level bands a real social-media design occupies: content coverage,
 * hue-family count, brightness. These bands become the pairwise gap check in
 * the calibrated critic (compareWithReferences).
 *
 * Run:  node packages/psd-engine/dist/reference-stats.mjs
 * (bundled by esbuild like the other scripts)
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOTS = ['إعلان فعالية', 'تشويقي', 'سوشيال', 'زوايا التصوير'];
const BASE = 'F:/Mubdi/resources/references';
const OUT = 'out/reference-stats.json';

interface ImgStat {
  file: string;
  category: string;
  coverage: number; // trimmed-content area / canvas area
  hueFamilies: number;
  brightness: number; // 0-100
  saturation: number; // 0-100 mean
}

function magick(args: string[]): string {
  return execFileSync('magick', args, { encoding: 'utf8', timeout: 60000 });
}

function parseCoverage(file: string): number {
  // trim geometry: "0x0+X+Y => WxH+Tx+Ty" style output varies; use %[fx] instead
  try {
    const out = magick([file, '-fuzz', '12%', '-trim', '-format', '%[fx:w] %[fx:h]', 'info:']);
    const [w, h] = out.trim().split(/\s+/).map(Number);
    const full = magick([file, '-format', '%[fx:w] %[fx:h]', 'info:']);
    const [fw, fh] = full.trim().split(/\s+/).map(Number);
    if (!fw || !fh) return 0;
    return Math.min(1, (w * h) / (fw * fh));
  } catch {
    return 0;
  }
}

function parseColors(file: string): { hues: number; brightness: number; saturation: number } {
  // 6x6 downsample -> 8 dominant colours -> txt list
  const out = magick([file, '-resize', '48x48!', '-colors', '10', '-unique-colors', 'txt:']);
  const lines = out.split('\n').filter((l) => l.includes('#') || l.includes('srgb'));
  const hues = new Set<number>();
  let brightSum = 0;
  let satSum = 0;
  let n = 0;
  for (const line of lines) {
    const m = line.match(/\(([\d.]+),([\d.]+),([\d.]+)\)/);
    if (!m) continue;
    const r = Number(m[1]) * 255;
    const g = Number(m[2]) * 255;
    const b = Number(m[3]) * 255;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    let hue = 0;
    const d = max - min;
    if (d !== 0) {
      if (max === r / 255) hue = ((g - b) / 255 / d + (g / 255 < b / 255 ? 6 : 0)) * 60;
      else if (max === g / 255) hue = ((b - r) / 255 / d + 2) * 60;
      else hue = ((r - g) / 255 / d + 4) * 60;
    }
    // chromatic colours only (s >= 0.15)
    if (sat >= 0.15) hues.add(Math.round(hue / 45));
    brightSum += max * 100;
    satSum += sat * 100;
    n++;
  }
  return {
    hues: hues.size,
    brightness: n ? Math.round(brightSum / n) : 0,
    saturation: n ? Math.round(satSum / n) : 0,
  };
}

const stats: ImgStat[] = [];
for (const cat of ROOTS) {
  const dir = path.join(BASE, cat);
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|jpg)$/i.test(f));
  for (const f of files) {
    const full = path.join(dir, f);
    try {
      const coverage = parseCoverage(full);
      const { hues, brightness, saturation } = parseColors(full);
      stats.push({
        file: `${cat}/${f}`,
        category: cat,
        coverage,
        hueFamilies: hues,
        brightness,
        saturation,
      });
      console.log(`${cat}/${f.slice(0, 30)} cov=${(coverage * 100).toFixed(0)}% hues=${hues}`);
    } catch (e) {
      console.log(`SKIP ${f}: ${e instanceof Error ? e.message.slice(0, 60) : e}`);
    }
  }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
}
function band(values: number[]): [number, number] {
  const s = [...values].sort((a, b) => a - b);
  return [s[Math.floor(s.length * 0.15)] ?? 0, s[Math.ceil(s.length * 0.85)] ?? 0];
}

const profile = {
  generatedAt: new Date().toISOString(),
  samples: stats.length,
  coverage: {
    median: Number(median(stats.map((s) => s.coverage)).toFixed(3)),
    band: band(stats.map((s) => s.coverage)).map((v) => Number(v.toFixed(3))),
  },
  hueFamilies: {
    median: median(stats.map((s) => s.hueFamilies)),
    band: band(stats.map((s) => s.hueFamilies)),
  },
  brightness: {
    median: median(stats.map((s) => s.brightness)),
    band: band(stats.map((s) => s.brightness)),
  },
  saturation: {
    median: median(stats.map((s) => s.saturation)),
    band: band(stats.map((s) => s.saturation)),
  },
  perImage: stats,
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(profile, null, 1));
console.log(`\nprofile: ${OUT}`);
console.log(`coverage median=${profile.coverage.median} band=${profile.coverage.band}`);
console.log(`hueFamilies median=${profile.hueFamilies.median} band=${profile.hueFamilies.band}`);
