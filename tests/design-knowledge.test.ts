import { describe, it, expect } from 'vitest';
import { parseBrief } from '../packages/core/src/brief';
import { generateSpec, generateVariantSet } from '../packages/core/src/spec';
import { resolvePreset } from '../packages/core/src/critique';
import {
  ART_DIRECTIONS,
  buildPalette,
  checkHierarchy,
  coach,
  contrastHex,
  effectiveBackground,
  ensureContrast,
  evaluateDesign,
  generateConcepts,
  hexToRgb,
  improveSpec,
  knowledgeSnapshot,
  makeGrid,
  makeTypeScale,
  safeRect,
  scamperPrompts,
  snap,
  THRESHOLDS,
  type DesignSpec,
} from '../packages/design-knowledge/src/index';

const PROMPT =
  'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي';

describe('colour knowledge', () => {
  it('builds a palette that clears WCAG for every text role', () => {
    for (const mode of ['dark', 'light'] as const) {
      const palette = buildPalette({ primary: '#1f7a3d', scheme: 'triadic', mode });
      expect(contrastHex(palette.text, palette.background)).toBeGreaterThanOrEqual(7);
      expect(contrastHex(palette.textMuted, palette.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastHex(palette.primary, palette.background)).toBeGreaterThanOrEqual(3);
      expect(contrastHex(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('ensureContrast walks a colour until it reaches the requested ratio', () => {
    const fixed = ensureContrast('#8a8a8a', '#ffffff', 4.5);
    expect(contrastHex(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('typography knowledge', () => {
  it('respects the platform font floor and caps the display size', () => {
    const scale = makeTypeScale({ canvasMin: 1080, scale: 'major-third', minSize: 24 });
    expect(scale.body).toBeGreaterThanOrEqual(24);
    expect(scale.caption).toBeGreaterThanOrEqual(24);
    expect(scale.cta).toBeGreaterThanOrEqual(24);
    expect(scale.display).toBeLessThanOrEqual(Math.round(1080 * 0.12));
    expect(scale.h1).toBeGreaterThan(scale.h3);
    expect(scale.h3).toBeGreaterThan(scale.body);
  });

  it('reports a healthy hierarchy for the generated ladder', () => {
    const scale = makeTypeScale({ canvasMin: 1080, scale: 'major-third', minSize: 24 });
    const check = checkHierarchy([scale.h1, scale.h3, scale.cta]);
    expect(check.ok).toBe(true);
    expect(check.ratio).toBeGreaterThanOrEqual(2);
    expect(check.levels.length).toBeLessThanOrEqual(4);
  });

  it('rejects a flat hierarchy', () => {
    expect(checkHierarchy([40, 38, 36]).ok).toBe(false);
  });
});

describe('grid knowledge', () => {
  it('creates mirrored columns for RTL while keeping physical order stable', () => {
    const grid = makeGrid({ width: 1080, height: 1350, margin: 64, rtl: true });
    expect(grid.content.x).toBe(64);
    expect(grid.content.width).toBe(1080 - 128);
    expect(grid.physical[0]!.x).toBe(64);
    expect(grid.inline[0]!.x).toBe(grid.physical[11]!.x);
    expect(grid.inline[11]!.x).toBe(grid.physical[0]!.x);
  });

  it('clamps content to the union of margins and safe zones', () => {
    const rect = safeRect(1080, 1920, { top: 120, right: 0, bottom: 200, left: 0 }, 64);
    expect(rect.x).toBe(64);
    expect(rect.y).toBe(120);
    expect(rect.width).toBe(1080 - 128);
    expect(rect.height).toBe(1920 - 120 - 200);
  });

  it('snaps to the 8pt scale', () => {
    expect(snap(37, 8)).toBe(40);
    expect(snap(31, 8)).toBe(32);
  });
});

describe('rubric', () => {
  const brief = parseBrief(PROMPT);

  it('scores a designed spec highly with no critical findings', () => {
    const spec = generateSpec(brief, 'ig_post_4x5', 0);
    const evaluation = evaluateDesign(spec, brief, resolvePreset(spec));
    expect(evaluation.score).toBeGreaterThanOrEqual(90);
    expect(evaluation.findings.filter((f) => f.severity === 'critical')).toHaveLength(0);
    expect(evaluation.metrics.density).toBeLessThanOrEqual(0.4);
    expect(evaluation.metrics.colorCount).toBeLessThanOrEqual(THRESHOLDS.maxColors);
    expect(evaluation.metrics.safeZoneViolations).toBe(0);
  });

  it('catches a deliberately broken design', () => {
    // Stories reserve UI space at the top/bottom, so this also exercises the
    // platform safe-zone rule.
    const spec = generateSpec(brief, 'ig_story', 0);
    const preset = resolvePreset(spec);
    const bad = JSON.parse(JSON.stringify(spec)) as DesignSpec;
    const headline = bad.layers.find((l) => l.name === 'HEADLINE')!;
    const run = headline.textRuns![0]!;
    run.size = 9; // far below the floor
    run.tracking = 6; // breaks connected Arabic
    headline.y = 4; // inside the platform safe zone
    // Invisible headline: match the layer's real effective background (the
    // surface actually painted behind it), not the canvas colour — Q3
    // templates place headlines on cards, not straight on the canvas.
    const bg = effectiveBackground(bad, headline);
    run.color = { ...hexToRgb(bg), a: 1 };

    const evaluation = evaluateDesign(bad, brief, preset);
    expect(evaluation.score).toBeLessThanOrEqual(79);
    const ids = evaluation.findings.map((f) => f.id);
    expect(ids).toContain('contrast.text');
    expect(ids).toContain('typography.tracking');
    expect(ids).toContain('typography.minSize');
    expect(ids).toContain('platform.safeZone');
  });

  it('measures ink density, not text bounding boxes', () => {
    const spec = generateSpec(brief, 'ig_post_4x5', 1);
    const evaluation = evaluateDesign(spec, brief, resolvePreset(spec));
    expect(evaluation.metrics.density).toBeLessThan(0.35);
  });

  it('counts hue families plus one neutral system', () => {
    const spec = generateSpec(brief, 'ig_post_4x5', 2);
    const evaluation = evaluateDesign(spec, brief, resolvePreset(spec));
    expect(evaluation.metrics.colorCount).toBeGreaterThanOrEqual(2);
    expect(evaluation.metrics.colorCount).toBeLessThanOrEqual(5);
    expect(evaluation.findings.some((f) => f.id === 'color.count')).toBe(false);
  });

  it('advises a supporting line when the design carries only a headline', () => {
    const minimal = parseBrief('تصميم بوست انستجرام لحملة تشجير');
    const spec = generateSpec(minimal, 'ig_post_4x5', 0);
    const evaluation = evaluateDesign(spec, minimal, resolvePreset(spec));
    const report = coach(evaluation, minimal);
    expect(report.nextStepsAr.join(' ')).toContain('سطراً مسانداً');
  });
});

describe('auto-fix', () => {
  const brief = parseBrief(PROMPT);

  it('raises the score of a broken spec and never lowers a good one', () => {
    const spec = generateSpec(brief, 'ig_post_4x5', 0);
    const preset = resolvePreset(spec);
    const bad = JSON.parse(JSON.stringify(spec)) as DesignSpec;
    const headline = bad.layers.find((l) => l.name === 'HEADLINE')!;
    headline.textRuns![0]!.color = { ...bad.canvas.background, a: 1 };
    headline.y = 2;
    const before = evaluateDesign(bad, brief, preset);
    const result = improveSpec(bad, brief, preset, { maxIterations: 3, targetScore: 95 });
    expect(result.after.score).toBeGreaterThanOrEqual(before.score);
    if (result.after.score > before.score) expect(result.improved).toBe(true);
    const fixedHeadline = result.spec.layers.find((l) => l.name === 'HEADLINE')!;
    expect(fixedHeadline.textRuns![0]!.tracking).toBe(0);
    expect(fixedHeadline.textRuns![0]!.size).toBeGreaterThanOrEqual(preset.minFontSize ?? 22);

    const good = generateSpec(brief, 'ig_post_4x5', 0);
    const goodBefore = evaluateDesign(good, brief, preset);
    const goodResult = improveSpec(good, brief, preset, { maxIterations: 2, targetScore: 100 });
    expect(goodResult.after.score).toBeGreaterThanOrEqual(goodBefore.score);
  });
});

describe('variant set', () => {
  const brief = parseBrief(PROMPT);

  it('returns three different directions and three different archetypes', () => {
    const variants = generateVariantSet(brief, 'ig_post_4x5', { name: 'Test Brand' });
    expect(variants).toHaveLength(3);
    expect(new Set(variants.map((v) => v.directionId)).size).toBe(3);
    expect(new Set(variants.map((v) => v.archetype)).size).toBe(3);
    for (const variant of variants) {
      expect(variant.directionNameAr.length).toBeGreaterThan(0);
      expect(variant.rationaleAr.length).toBeGreaterThan(0);
      expect(variant.spec.layers.filter((l) => l.type === 'text').length).toBeGreaterThanOrEqual(3);
      expect(variant.spec.layers.some((l) => l.name === 'LOGO')).toBe(true);
    }
  });

  it('carries the brand name into the logo without hardcoding', () => {
    const variants = generateVariantSet(brief, 'ig_post_4x5', { name: 'استوديو النور' });
    const logos = variants.flatMap((v) => v.spec.layers).filter((l) => l.name === 'LOGO');
    const text = logos.flatMap((l) => l.textRuns?.map((r) => r.text) ?? []).join(' ');
    expect(text.includes('استوديو النور') || logos.some((l) => l.type === 'image')).toBe(true);
  });
});

describe('curriculum', () => {
  it('exposes the full knowledge snapshot', () => {
    const snapshot = knowledgeSnapshot();
    expect(snapshot.principleCount).toBeGreaterThanOrEqual(20);
    expect(snapshot.directions).toHaveLength(ART_DIRECTIONS.length);
    expect(snapshot.thresholds.bodyContrast).toBe(4.5);
    expect(snapshot.systemPrompt).toContain('4.5:1');
    expect(snapshot.learningPath.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.archetypes.length).toBeGreaterThanOrEqual(8);
  });

  it('offers distinct creative routes and a full SCAMPER set', () => {
    const brief = parseBrief(PROMPT);
    const concepts = generateConcepts(brief, 3);
    expect(concepts).toHaveLength(3);
    expect(new Set(concepts.map((c) => c.id)).size).toBe(3);
    expect(concepts[0]!.ideaAr.length).toBeGreaterThan(10);
    expect(scamperPrompts()).toHaveLength(7);
  });
});
