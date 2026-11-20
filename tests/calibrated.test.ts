import { describe, it, expect } from 'vitest';
import { parseBrief } from '../packages/core/src/brief';
import {
  calibratedReview,
  runQualityLoop,
  SHOW_GATE,
  PIXEL_THRESHOLDS,
} from '../packages/core/src/calibrated';
import { stripArtifacts, artifactMarks } from '../packages/design-knowledge/src/index';
import type { Color, DesignSpec, Layer } from '@mubdi/schemas';

const PROMPT = 'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً';

const C = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });
const GREEN = C(14, 110, 78);
const CARD = C(245, 242, 236);
const ACCENT = C(205, 220, 57);
const INK = C(20, 40, 32);
const W = 1080;
const H = 1350;

function shape(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: Color,
  z: number,
  extra: Partial<Layer> = {},
): Layer {
  return {
    id,
    name: id,
    type: 'shape',
    x,
    y,
    width: w,
    height: h,
    z,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    mask: false,
    fill,
    effects: [],
    metadata: { shape: 'rect' },
    ...extra,
  };
}

function text(
  id: string,
  role: string,
  x: number,
  y: number,
  w: number,
  h: number,
  t: string,
  size: number,
  color: Color,
  bold: boolean,
  z: number,
): Layer {
  return {
    id,
    name: id.toUpperCase(),
    type: 'text',
    x,
    y,
    width: w,
    height: h,
    z,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    mask: false,
    textRuns: [
      {
        text: t,
        font: bold ? 'Cairo-Bold' : 'Cairo-Regular',
        size,
        tracking: 0,
        leading: 1.45,
        direction: 'rtl',
        language: 'ar',
        color,
        bold,
        italic: false,
      },
    ],
    effects: [],
    metadata: { role },
  };
}

/** Reference-grade P1 spec (same construction as design-quality.test.ts). */
function referenceGradeSpec(): DesignSpec {
  const layers: Layer[] = [
    {
      id: 'bg',
      name: '90_Background',
      type: 'background',
      x: 0,
      y: 0,
      width: W,
      height: H,
      z: 0,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: true,
      mask: false,
      fill: GREEN,
      effects: [],
      metadata: {},
    },
    shape('card', 90, 160, W - 180, H - 320, CARD, 10),
    shape('hero-medallion', W / 2 - 170, 300, 340, 340, ACCENT, 20, {
      metadata: { shape: 'circle' },
    }),
    shape('ribbon', W / 2 - 220, 240, 440, 64, GREEN, 22),
    text('headline', 'headline', 150, 720, W - 300, 240, 'ملتقى التطوع السنوي', 108, INK, true, 30),
    text(
      'subhead',
      'subhead',
      150,
      970,
      W - 300,
      70,
      'يوم الجمعة الساعة 5 مساءً',
      44,
      INK,
      false,
      31,
    ),
    shape('badge-1', 700, 1060, 56, 56, ACCENT, 32, { metadata: { shape: 'circle' } }),
    text(
      'details-1',
      'details',
      320,
      1062,
      360,
      60,
      'مقر الجمعية الرئيسي بالحي',
      34,
      INK,
      false,
      33,
    ),
    shape('badge-2', 700, 1140, 56, 56, ACCENT, 34, { metadata: { shape: 'circle' } }),
    text('details-2', 'details', 320, 1142, 360, 60, 'بتاريخ 15 أبريل 2026', 34, INK, false, 35),
    shape('cta-bg', W / 2 - 180, 1230, 360, 84, GREEN, 40),
    text('cta', 'cta', W / 2 - 150, 1248, 300, 60, 'سجّل الآن', 40, CARD, true, 42),
    shape('sparkle-1', 140, 380, 26, 26, ACCENT, 50),
    shape('sparkle-2', 920, 420, 20, 20, ACCENT, 51),
    shape('sparkle-3', 180, 1200, 18, 18, ACCENT, 52),
    shape('sparkle-4', 900, 1150, 24, 24, ACCENT, 53),
    text('logo', 'logo', 150, 170, 220, 50, 'مبدع', 36, CARD, true, 60),
  ];
  return {
    id: 'ref-grade',
    briefId: 'ref-grade',
    canvas: { width: W, height: H, background: GREEN, platform: 'ig_post_4x5' },
    layers,
    groups: [],
    fonts: ['Cairo-Bold', 'Cairo-Regular'],
    colors: [],
  };
}

/**
 * Pre-Q3 flat generator output, pinned as a synthetic spec: solid background
 * + text only, no visual hero. The live generator no longer produces this
 * (Q3 templates), but the critics must keep rejecting this shape — it is the
 * failure mode the pixel thresholds were calibrated on.
 */
function flatSpec(): DesignSpec {
  return {
    id: 'flat',
    briefId: 'flat',
    canvas: { width: W, height: H, background: GREEN, platform: 'ig_post_4x5' },
    layers: [
      {
        id: 'bg',
        name: '90_Background',
        type: 'background',
        x: 0,
        y: 0,
        width: W,
        height: H,
        z: 0,
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: true,
        mask: false,
        fill: GREEN,
        effects: [],
        metadata: {},
      },
      text('headline', 'headline', 80, 300, W - 160, 240, 'ملتقى التطوع السنوي', 96, INK, true, 10),
      text(
        'subhead',
        'subhead',
        80,
        600,
        W - 160,
        80,
        'يوم الجمعة الساعة 5 مساءً',
        44,
        INK,
        false,
        11,
      ),
      text('cta', 'cta', 80, 1180, W - 160, 70, 'سجّل الآن في الموقع', 40, INK, false, 12),
    ],
    groups: [],
    fonts: ['Cairo-Bold', 'Cairo-Regular'],
    colors: [],
  };
}

describe('calibrated critic (Q1: pixel ground truth)', () => {
  it('embeds the calibration thresholds measured on 61 refs vs 60 flat renders', () => {
    expect(PIXEL_THRESHOLDS.edgeDensity).toBe(0.065);
    expect(PIXEL_THRESHOLDS.detailCoverage).toBeCloseTo(0.203);
    expect(PIXEL_THRESHOLDS.bgShare).toBeCloseTo(0.582);
    expect(SHOW_GATE).toBe(80);
  });

  it('flat generator output: pixel evidence confirms the spec verdict', async () => {
    // The Q3 template generator no longer emits flat output, so the pre-Q3
    // flat shape is pinned synthetically (see flatSpec) — the verdict must
    // still be an honest rejection backed by pixel evidence.
    const review = await calibratedReview(flatSpec());
    expect(review.score).toBeLessThan(45);
    expect(review.pass).toBe(false);
    expect(review.pixel.edgeDensity).toBeLessThan(PIXEL_THRESHOLDS.edgeDensity);
    expect(review.gapsAr.length).toBeGreaterThan(0);
    const ids = review.specEvaluation.findings.map((f) => f.id);
    expect(ids).toContain('pixel.flat');
  });

  it('reference-grade design passes the pixel layer and the 80 gate', async () => {
    const review = await calibratedReview(referenceGradeSpec());
    expect(review.pixel.edgeDensity).toBeGreaterThanOrEqual(PIXEL_THRESHOLDS.edgeDensity);
    expect(review.pixel.detailCoverage).toBeGreaterThanOrEqual(PIXEL_THRESHOLDS.detailCoverage);
    expect(review.pixel.bgShare).toBeLessThanOrEqual(PIXEL_THRESHOLDS.bgShare);
    expect(review.score).toBeGreaterThanOrEqual(SHOW_GATE);
    expect(review.pass).toBe(true);
  });

  it('strips fingerprinted corner handles before publishing', () => {
    const spec = referenceGradeSpec();
    spec.layers.push(
      shape('corner-0', 30, 30, 24, 24, C(33, 150, 243), 90),
      shape('corner-1', W - 54, 30, 24, 24, C(33, 150, 243), 91),
      shape('corner-2', 30, H - 54, 24, 24, C(33, 150, 243), 92),
      shape('corner-3', W - 54, H - 54, 24, 24, C(33, 150, 243), 93),
    );
    expect(artifactMarks(spec).length).toBe(4);
    const stripped = stripArtifacts(spec);
    expect(stripped.removed).toBe(4);
    expect(stripped.spec.layers.some((l) => l.id === 'corner-1')).toBe(false);
    const clean = stripArtifacts(stripped.spec);
    expect(clean.removed).toBe(0);
  });

  it('quality loop keeps honest scores and escalates when fixes cannot reach 80', async () => {
    const brief = parseBrief(PROMPT);
    // The live generator now clears the gate for this prompt (measured 88
    // after the surface/background separation floor), so the unfixable path
    // is pinned with the synthetic flat spec: the loop must say so instead
    // of inventing a passing score.
    const loop = await runQualityLoop(flatSpec(), brief);
    expect(loop.review.score).toBeLessThan(SHOW_GATE);
    expect(loop.escalateAr).toContain('قالب');
    expect(loop.review.gapsAr.length).toBeGreaterThan(0);
  });
});
