import { describe, it, expect } from 'vitest';
import {
  evaluateQuality,
  evaluateVariantSetQuality,
  variantSimilarity,
  LAYOUT_PATTERNS,
  DECORATION_SYSTEM,
  COLOR_PAIRS,
  TYPOGRAPHIC_DEVICES,
  DENSITY_GUIDE,
  QUALITY_RUBRIC_WEIGHTS,
  REFERENCE_SETS,
} from '../packages/design-knowledge/src/index';
import { generateSpec } from '../packages/core/src/spec';
import { parseBrief } from '../packages/core/src/brief';
import type { DesignSpec, Layer, Color } from '@mubdi/schemas';

const PROMPT = 'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً';
const W = 1080;
const H = 1350;

const C = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });
const GREEN = C(14, 110, 78);
const CARD = C(245, 242, 236);
const ACCENT = C(205, 220, 57);
const WHITE = C(255, 255, 255);
const INK = C(20, 40, 32);

function run(text: string, size: number, color: Color, bold: boolean, leading = 1.45) {
  return {
    text,
    font: bold ? 'Cairo-Bold' : 'Cairo-Regular',
    size,
    tracking: 0,
    leading,
    direction: 'rtl' as const,
    language: 'ar' as const,
    color,
    bold,
    italic: false,
  };
}

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
    textRuns: [run(t, size, color, bold)],
    effects: [],
    metadata: { role },
  };
}

/**
 * Pre-Q3 flat output pinned as a synthetic spec: solid background + text
 * only, no visual hero. The live generator no longer emits this shape, but
 * the critics must keep rejecting it.
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

/** A reference-grade P1 "central card" spec built to match design-language. */
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
    // pattern veil
    shape('pattern-veil', 0, 0, W, H, C(255, 255, 255, 0.08), 1, {
      opacity: 0.08,
      metadata: { shape: 'rect' },
    }),
    // central card (P1 hero)
    shape('card', 90, 160, W - 180, H - 320, CARD, 10, { metadata: { shape: 'rect', radius: 48 } }),
    // hero object inside card: circular badge/medallion
    shape('hero-medallion', W / 2 - 170, 320, 340, 340, ACCENT, 20, {
      metadata: { shape: 'circle' },
    }),
    // eyebrow ribbon
    shape('ribbon', W / 2 - 220, 250, 440, 64, GREEN, 22, {
      metadata: { shape: 'rect', radius: 32 },
    }),
    // headline (accent word effect)
    text('headline', 'headline', 150, 740, W - 300, 240, 'ملتقى التطوع', 108, INK, true, 30),
    text(
      'subhead',
      'subhead',
      150,
      990,
      W - 300,
      70,
      'يوم الجمعة الساعة 5 مساءً',
      44,
      INK,
      false,
      31,
    ),
    // detail rows with icon badges
    shape('badge-1', 700, 1080, 56, 56, ACCENT, 32, { metadata: { shape: 'circle' } }),
    text('details-1', 'details', 380, 1082, 300, 60, 'مقار الجمعية الرئيسي', 34, INK, false, 33),
    shape('badge-2', 700, 1160, 56, 56, ACCENT, 34, { metadata: { shape: 'circle' } }),
    text('details-2', 'details', 380, 1162, 300, 60, '15 أبريل 2026', 34, INK, false, 35),
    // CTA on its pill
    shape('cta-bg', W / 2 - 180, 1240, 360, 84, GREEN, 40, {
      metadata: { shape: 'rect', radius: 42 },
    }),
    text('cta', 'cta', W / 2 - 150, 1258, 300, 60, 'سجّل الآن', 40, WHITE, true, 42),
    // foreground sparkles
    shape('sparkle-1', 140, 380, 26, 26, ACCENT, 50, { metadata: { shape: 'circle' } }),
    shape('sparkle-2', 920, 420, 20, 20, ACCENT, 51, { metadata: { shape: 'circle' } }),
    shape('sparkle-3', 180, 1200, 18, 18, ACCENT, 52, { metadata: { shape: 'circle' } }),
    shape('sparkle-4', 900, 1150, 24, 24, ACCENT, 53, { metadata: { shape: 'circle' } }),
    // brand mark
    text('logo', 'logo', 150, 170, 220, 50, 'مبدع', 36, WHITE, true, 60),
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

describe('design language tokens', () => {
  it('covers the 8 observed layout patterns with hero bands', () => {
    expect(LAYOUT_PATTERNS.map((p) => p.id)).toEqual([
      'P1',
      'P2',
      'P3',
      'P4',
      'P5',
      'P6',
      'P7',
      'P8',
    ]);
    for (const p of LAYOUT_PATTERNS) {
      expect(p.heroShare[0]).toBeLessThanOrEqual(p.heroShare[1]);
      expect(p.depthLevels.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('exposes the decoration budget and colour roles from the references', () => {
    expect(DECORATION_SYSTEM.length).toBeGreaterThanOrEqual(6);
    expect(COLOR_PAIRS.length).toBeGreaterThanOrEqual(5);
    expect(DENSITY_GUIDE.minElements).toBe(8);
    expect(DENSITY_GUIDE.minDepthLevels).toBe(4);
    expect(TYPOGRAPHIC_DEVICES.length).toBe(6);
    expect(QUALITY_RUBRIC_WEIGHTS.richness).toBe(22);
    expect(REFERENCE_SETS.reduce((s, r) => s + r.count, 0)).toBe(61);
  });
});

describe('quality critic calibration', () => {
  const brief = parseBrief(PROMPT);

  it('fails flat output below the gate (pre-Q3 shape pinned synthetically)', () => {
    // The live generator now emits template-based specs (Q3); the flat shape
    // it used to produce is pinned here so the critic keeps rejecting it.
    const evaluation = evaluateQuality(flatSpec());
    expect(evaluation.score).toBeLessThan(40);
    expect(evaluation.pass).toBe(false);
    const ids = evaluation.findings.map((f) => f.id);
    expect(ids).toContain('richness.flat');
  });

  it('live template generator clears the quality gate (Q3)', () => {
    const specs = [0, 1, 2].map((v) => generateSpec(brief, 'ig_post_4x5', v));
    const evaluations = evaluateVariantSetQuality(specs);
    for (const e of evaluations) {
      expect(e.score).toBeGreaterThanOrEqual(80);
      expect(e.pass).toBe(true);
      expect(e.findings.map((f) => f.id)).not.toContain('richness.flat');
    }
  });

  it('scores a reference-grade design 80+ (calibration high side)', () => {
    const evaluation = evaluateQuality(referenceGradeSpec());
    expect(evaluation.score).toBeGreaterThanOrEqual(80);
    expect(evaluation.pass).toBe(true);
    expect(evaluation.metrics.elementCount).toBeGreaterThanOrEqual(8);
    expect(evaluation.metrics.depthLevels).toBeGreaterThanOrEqual(4);
  });

  it('detects debug corner marks as artifacts and caps the score', () => {
    const spec = referenceGradeSpec();
    const marks = shape('corner-0', 30, 30, 24, 24, C(33, 150, 243), 90);
    const marks2 = shape('corner-1', W - 54, 30, 24, 24, C(33, 150, 243), 91);
    const marks3 = shape('corner-2', 30, H - 54, 24, 24, C(33, 150, 243), 92);
    spec.layers.push(marks, marks2, marks3);
    const evaluation = evaluateQuality(spec);
    expect(evaluation.metrics.artifacts).toBe(3);
    expect(evaluation.score).toBeLessThanOrEqual(62);
  });

  it('measures variant diversity: identical specs fail, different pass', () => {
    const a = generateSpec(brief, 'ig_post_4x5', 0);
    const b = generateSpec(brief, 'ig_post_4x5', 0);
    expect(variantSimilarity(a, b)).toBeGreaterThan(0.7);
    const c = generateSpec(brief, 'ig_post_4x5', 1);
    const d = generateSpec(brief, 'ig_post_4x5', 2);
    const cd = variantSimilarity(c, d);
    expect(cd).toBeLessThan(0.7);
  });

  it('evaluates a full variant set with shared diversity findings', () => {
    // Shared findings: near-identical variants must each receive the
    // diversity.similarity finding (pinned with the flat shape, since the
    // live generator now guarantees pattern+style diversity).
    const flat = flatSpec();
    const twin = JSON.parse(JSON.stringify(flat)) as DesignSpec;
    const evaluations = evaluateVariantSetQuality([flat, twin]);
    expect(evaluations).toHaveLength(2);
    for (const e of evaluations) {
      const ids = e.findings.map((f) => f.id);
      expect(ids).toContain('diversity.similarity');
      expect(e.score).toBeLessThan(80);
      expect(e.pass).toBe(false);
    }
    // Live template variants are structurally diverse: no similarity finding.
    const live = evaluateVariantSetQuality(
      [0, 1, 2].map((v) => generateSpec(brief, 'ig_post_4x5', v)),
    );
    for (const e of live) {
      expect(e.findings.map((f) => f.id)).not.toContain('diversity.similarity');
    }
  });
});
