import { describe, it, expect } from 'vitest';
import { handbookRules } from '../knowledge/loader';
import { ruleGates } from '../packages/design-knowledge/src/index';
import { parseBrief } from '../packages/core/src/brief';
import { generateVariantSet, calibratedReview } from '../packages/core/src/index';
import { GOLDEN_SET } from '../scripts/golden-data';
import type { Color, DesignSpec, Layer, TextRun } from '@mubdi/schemas';

/**
 * P0-5 — بوابة القواعد: كل measure في handbook (غير `pending:`) يُشغَّل فعلاً
 * على spec حقيقي قبل القبول، وما لا يمكن قياسه يعود `unavailable` لا صمتاً.
 */

const PROMPT =
  'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي';

const C = (r: number, g: number, b: number, a = 1): Color => ({ r, g, b, a });

function run(text: string, size: number, color: Color): TextRun {
  return {
    text,
    font: 'Cairo-Regular',
    size,
    tracking: 0,
    direction: 'rtl',
    language: 'ar',
    color,
    bold: false,
    italic: false,
  };
}

function layer(over: Partial<Layer> & { id: string; name: string; type: Layer['type'] }): Layer {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    z: 1,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    mask: false,
    effects: [],
    metadata: {},
    ...over,
  };
}

/** spec صغير مقصود: تباين فاشل في COPY + شعار «مبدع» + (اختيارياً) عبور لوح/حاوية. */
function makeFixture(withCollision = false): DesignSpec {
  const layers: Layer[] = [
    layer({
      id: 'bg',
      name: '90_Background',
      type: 'background',
      width: 1080,
      height: 1350,
      z: 0,
      fill: C(15, 23, 42),
      locked: true,
    }),
    layer({
      id: 'logo',
      name: 'LOGO',
      type: 'text',
      x: 60,
      y: 40,
      width: 220,
      height: 60,
      z: 5,
      textRuns: [run('مبدع', 32, C(255, 255, 255))],
    }),
    layer({
      id: 'headline',
      name: 'HEADLINE',
      type: 'text',
      x: 60,
      y: 200,
      width: 960,
      height: 160,
      textRuns: [run('عنوان رئيسي', 96, C(255, 255, 255))],
    }),
    layer({
      id: 'copy',
      name: 'COPY',
      type: 'text',
      x: 60,
      y: 420,
      width: 960,
      height: 80,
      // عمداً لون قريب من الخلفية: بوابة contrast.text يجب أن تفشل.
      textRuns: [run('نص غير مقروء', 30, C(30, 41, 59))],
    }),
  ];
  if (withCollision) {
    layers.push(
      layer({
        id: 'tagline',
        name: 'TAGLINE',
        type: 'text',
        x: 80,
        y: 60,
        width: 300,
        height: 40,
        textRuns: [run('شريط صغير', 24, C(255, 255, 255))],
      }),
      layer({
        id: 'card',
        name: 'card',
        type: 'shape',
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        z: 2,
        fill: C(30, 41, 59),
        stroke: { color: C(100, 116, 139), width: 2 },
        metadata: { shape: 'rect' },
      }),
      layer({
        id: 'panel',
        name: 'panel',
        type: 'shape',
        x: 450,
        y: 350,
        width: 200,
        height: 200,
        z: 3,
        fill: C(30, 41, 59),
        metadata: { shape: 'rect' },
      }),
    );
  }
  return {
    id: 'spec-gates',
    briefId: 'brief-gates',
    canvas: { width: 1080, height: 1350, background: C(15, 23, 42), platform: 'ig_post_4x5' },
    layers,
    groups: [],
    fonts: ['Cairo-Regular'],
    colors: [],
    version: 1,
    createdAt: '2026-11-24T00:00:00.000Z',
  };
}

const RULE = (id: string, measure: string, domain = 'layout') => ({ id, domain, measure });

describe('P0-5 — ruleGates', () => {
  it('acceptance: every non-pending handbook measure actually runs on a golden spec', async () => {
    const g = GOLDEN_SET[0]!;
    const brief = parseBrief(g.prompt);
    const variant = generateVariantSet(brief, g.presetId, { name: 'مبدع' })[0]!;
    const review = await calibratedReview(variant.spec);
    const rules = handbookRules();

    const result = ruleGates(variant.spec, brief, rules, {
      pixelEdge: review.pixel.edgeDensity,
      brandName: 'مبدع',
      rationaleAr: variant.rationaleAr,
    });

    // كل قاعدة handbook = بوابة واحدة بالضبط.
    expect(result.gates.length).toBe(rules.length);

    // المقاييس المعلّقة تعود pending تماماً كالمسجّل في PROJECT_STATE.md.
    const declared = rules
      .filter((r) => r.measure.startsWith('pending:'))
      .map((r) => r.id)
      .sort();
    expect(
      result.gates
        .filter((g2) => g2.status === 'pending')
        .map((g2) => g2.ruleId)
        .sort(),
    ).toEqual(declared);

    // القبول: أي measure غير pending يجب أن يُشغَّل فعلاً — pass أو fail فقط.
    const notRun = result.gates.filter(
      (g2) => !g2.measure.startsWith('pending:') && g2.status !== 'pass' && g2.status !== 'fail',
    );
    expect(
      notRun.map((g2) => `${g2.ruleId} (${g2.measure}) → ${g2.status}: ${g2.detailAr ?? ''}`),
    ).toEqual([]);
    expect(result.unavailable).toBe(0);
    expect(result.passed + result.failed).toBe(rules.length - declared.length);
  });

  it('reports declared pending measures without evaluating them', () => {
    const spec = makeFixture();
    const brief = parseBrief(PROMPT);
    const result = ruleGates(spec, brief, [RULE('p', 'pending:foo.bar')]);
    expect(result.gates[0]!.status).toBe('pending');
    expect(result.pending).toBe(1);
    expect(result.gates[0]!.detailAr).toContain('PROJECT_STATE');
  });

  it('never silently passes a measure it cannot compute', () => {
    const spec = makeFixture();
    const brief = parseBrief(PROMPT);
    const result = ruleGates(spec, brief, [
      RULE('pixel', 'pixel.edge>=0.065', 'structure'),
      RULE('rationale', 'rationaleAr.nonEmpty', 'concept'),
      RULE('unknown', 'quantum.vibes==3', 'layout'),
    ]);
    expect(result.gates.map((g) => g.status)).toEqual([
      'unavailable',
      'unavailable',
      'unavailable',
    ]);
    expect(result.gates.every((g) => (g.detailAr ?? '').length > 0)).toBe(true);
  });

  it('measures collision geometry exactly like the release probe', () => {
    const spec = makeFixture(true);
    const brief = parseBrief(PROMPT);
    const result = ruleGates(spec, brief, [
      RULE('cross', 'collision.probe.crossings==0', 'structure'),
      RULE('logo', 'collision.probe.logoText==0', 'structure'),
    ]);
    expect(result.gates[0]!.status).toBe('fail');
    expect(result.gates[0]!.value).toBe(1); // لوح واحد يعبر حاويته
    expect(result.gates[1]!.status).toBe('fail');
    expect(result.gates[1]!.value).toBe(1); // شريط يتقاطع مع الشعار
  });

  it('maps ==0 to violation counts and >= to the measured value', () => {
    const spec = makeFixture();
    const brief = parseBrief(PROMPT);
    const result = ruleGates(spec, brief, [
      RULE('readable-contrast', 'contrast.text==0', 'color'),
      RULE('ship-checklist', 'rubric.score>=80', 'process'),
    ]);
    expect(result.gates[0]!.status).toBe('fail');
    expect(result.gates[0]!.value).toBeGreaterThan(0); // عدد findings التباين
    expect(result.gates[1]!.value).toBe(result.evaluation.score);
    expect(result.gates[1]!.status).toBe(result.evaluation.score >= 80 ? 'pass' : 'fail');
  });

  it('brand and rationale gates consume injected generation output', () => {
    const spec = makeFixture();
    const brief = parseBrief(PROMPT);
    const rules = [
      RULE('no-invented-logo', 'tests.logoCarriesBrandName', 'brand'),
      RULE('concept-before-decoration', 'rationaleAr.nonEmpty', 'concept'),
    ];
    const missing = ruleGates(spec, brief, rules);
    expect(missing.gates.map((g) => g.status)).toEqual(['unavailable', 'unavailable']);

    const good = ruleGates(spec, brief, rules, { brandName: 'مبدع', rationaleAr: 'فكرة تحريرية' });
    expect(good.gates.map((g) => g.status)).toEqual(['pass', 'pass']);

    const bad = ruleGates(spec, brief, rules, { brandName: 'أخرى', rationaleAr: '   ' });
    expect(bad.gates.map((g) => g.status)).toEqual(['fail', 'fail']);
  });

  it('applies handbook thresholds with the platform floor resolved', () => {
    const spec = makeFixture();
    const brief = parseBrief(PROMPT);
    const result = ruleGates(spec, brief, [
      RULE('platform-font-floor', 'typography.minSize>=floor', 'typography'),
    ]);
    const gate = result.gates[0]!;
    expect(gate.threshold).toBeGreaterThanOrEqual(20); // floor حلّل إلى حد المنصة
    expect(['pass', 'fail']).toContain(gate.status);
    expect(gate.value).toBeDefined();
  });
});
