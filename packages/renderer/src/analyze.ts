import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Q1: pixel-level ground truth for the calibrated critic.
 *
 * The spec-level rubric reasons about intended geometry; this module measures
 * what the renderer actually painted. Thresholds were calibrated by running
 * these metrics over the 61 approved references (good set) and the 60 baseline
 * renders of the old generator (bad set) — see scripts/calibrate-critic.ts and
 * docs/quality-rubric.md. A design that looks empty in pixels is empty, no
 * matter what the spec claims.
 */

export interface PixelStats {
  /** Fraction of adjacent cell pairs with a clear colour edge (0-1). */
  edgeDensity: number;
  /** Fraction of cells whose 3×3 neighbourhood has real detail (0-1). */
  detailCoverage: number;
  /** Share of cells close to the dominant background colour (0-1). */
  bgShare: number;
  /** Distinct chromatic hue families (30° bins) covering >= 1% of cells. */
  hueFamilies: number;
  /** Distinct luminance bands (of 5) covering >= 3% of cells. */
  lumaClusters: number;
  /** Share of cells that differ from the dominant colour at all (0-1). */
  contentCoverage: number;
}

interface Cell {
  r: number;
  g: number;
  b: number;
  luma: number;
  sat: number;
  hue: number;
}

const GX = 56;
const GY = 70;

function toCells(data: Uint8ClampedArray, w: number, h: number): Cell[] {
  const cells: Cell[] = [];
  const stepX = w / GX;
  const stepY = h / GY;
  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      // average a 3x3 sample inside the cell to smooth jpeg noise
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = Math.min(w - 1, Math.floor((gx + (sx + 0.5) / 3) * stepX));
          const py = Math.min(h - 1, Math.floor((gy + (sy + 0.5) / 3) * stepY));
          const i = (py * w + px) * 4;
          r += data[i]!;
          g += data[i + 1]!;
          b += data[i + 2]!;
          n++;
        }
      }
      r /= n;
      g /= n;
      b /= n;
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const d = max - min;
      let hue = -1;
      if (d / Math.max(max, 0.001) > 0.15) {
        if (max === r / 255) hue = (60 * ((g - b) / 255 / d) + 360) % 360;
        else if (max === g / 255) hue = 60 * ((b - r) / 255 / d) + 120;
        else hue = 60 * ((r - g) / 255 / d) + 240;
      }
      cells.push({ r, g, b, luma: l, sat: max === 0 ? 0 : d / max, hue });
    }
  }
  return cells;
}

function dist(a: Cell, b: Cell): number {
  const dr = (a.r - b.r) / 255;
  const dg = (a.g - b.g) / 255;
  const db = (a.b - b.b) / 255;
  return Math.min(1, Math.sqrt(dr * dr + dg * dg + db * db) / 1.732);
}

/** Analyse any raster image (JPEG/PNG) at the critic's working resolution. */
export async function analyzeImage(source: Buffer | string): Promise<PixelStats> {
  const image = await loadImage(source);
  const w = GX * 4;
  const h = GY * 4;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const cells = toCells(data, w, h);

  // dominant colour = modal quantised cell colour
  const quant = new Map<string, number>();
  for (const c of cells) {
    const key = `${Math.round(c.r / 24)}_${Math.round(c.g / 24)}_${Math.round(c.b / 24)}`;
    quant.set(key, (quant.get(key) ?? 0) + 1);
  }
  let dominantKey = '';
  let dominantCount = 0;
  for (const [k, v] of quant) {
    if (v > dominantCount) {
      dominantCount = v;
      dominantKey = k;
    }
  }
  const [qr, qg, qb] = dominantKey.split('_').map(Number);
  const dominant: Cell = {
    r: (qr ?? 0) * 24 + 12,
    g: (qg ?? 0) * 24 + 12,
    b: (qb ?? 0) * 24 + 12,
    luma: 0,
    sat: 0,
    hue: -1,
  };

  // edges: adjacent cell pairs with a clear colour step
  let edges = 0;
  let pairs = 0;
  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      const c = cells[gy * GX + gx]!;
      if (gx < GX - 1) {
        pairs++;
        if (dist(c, cells[gy * GX + gx + 1]!) > 0.14) edges++;
      }
      if (gy < GY - 1) {
        pairs++;
        if (dist(c, cells[(gy + 1) * GX + gx]!) > 0.14) edges++;
      }
    }
  }

  // detail: local 3x3 neighbourhood luminance spread
  let detail = 0;
  for (let gy = 1; gy < GY - 1; gy++) {
    for (let gx = 1; gx < GX - 1; gx++) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const l = cells[(gy + dy) * GX + (gx + dx)]!.luma;
          sum += l;
          sumSq += l * l;
          n++;
        }
      }
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      if (variance > 0.0016) detail++;
    }
  }
  const inner = (GX - 2) * (GY - 2);

  // coverage / bg share
  let content = 0;
  let bg = 0;
  for (const c of cells) {
    const d = dist(c, dominant);
    if (d > 0.04) content++;
    if (d < 0.07) bg++;
  }

  // hue families
  const hueBins = new Map<number, number>();
  for (const c of cells) {
    if (c.hue >= 0)
      hueBins.set(Math.floor(c.hue / 30), (hueBins.get(Math.floor(c.hue / 30)) ?? 0) + 1);
  }
  let hueFamilies = 0;
  for (const count of hueBins.values()) {
    if (count / cells.length >= 0.012) hueFamilies++;
  }

  // luminance bands
  const lumaBins = new Array(5).fill(0) as number[];
  for (const c of cells) lumaBins[Math.min(4, Math.floor(c.luma * 5))]!++;
  const lumaClusters = lumaBins.filter((n) => n / cells.length >= 0.03).length;

  return {
    edgeDensity: edges / pairs,
    detailCoverage: detail / inner,
    bgShare: bg / cells.length,
    hueFamilies,
    lumaClusters,
    contentCoverage: content / cells.length,
  };
}

/** Render a spec and analyse the actual pixels (ground truth for the critic). */
export function analyzeSpecRender(png: Buffer): Promise<PixelStats> {
  return analyzeImage(png);
}
