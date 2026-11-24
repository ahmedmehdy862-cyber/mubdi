import { describe, it, expect } from 'vitest';
import { parseBrief } from '../packages/core/src/brief';
import { applyDiff } from '../packages/core/src/editor';
import { mergeSpecWithImport } from '../packages/core/src/merge';
import { resolvePreset } from '../packages/core/src/critique';
import { improveSpec } from '../packages/design-knowledge/src/index';
import type { Color, DesignSpec, Layer, TextRun } from '@mubdi/schemas';

/**
 * P0-4 — احترام `locked`: طبقة مقفلة لا يمسها أي محرّر.
 * البوابة: محاولة تعديل خلفية مقفلة = صفر تغيير (toEqual على الـspec كاملاً).
 */

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

function makeSpec(): DesignSpec {
  return {
    id: 'spec-locked',
    briefId: 'brief-locked',
    canvas: { width: 1080, height: 1350, background: C(240, 240, 240), platform: 'instagram-post' },
    layers: [
      layer({
        id: 'bg',
        name: '90_Background',
        type: 'background',
        width: 1080,
        height: 1350,
        z: 0,
        fill: C(0, 120, 80),
        locked: true,
      }),
      layer({
        id: 'headline',
        name: 'HEADLINE',
        type: 'text',
        x: 80,
        y: 200,
        width: 920,
        height: 160,
        textRuns: [run('عنوان رئيسي', 96, C(15, 23, 42))],
      }),
      layer({
        id: 'copy-locked',
        name: 'COPY-LOCKED',
        type: 'text',
        x: 80,
        y: 440,
        width: 920,
        height: 60,
        locked: true,
        textRuns: [run('نص مقفل بلون باهت', 14, C(200, 200, 200))],
      }),
      layer({
        id: 'copy-open',
        name: 'COPY-OPEN',
        type: 'text',
        x: 80,
        y: 540,
        width: 920,
        height: 60,
        textRuns: [run('نص مفتوح بلون باهت', 14, C(200, 200, 200))],
      }),
    ],
    groups: [],
    fonts: ['Cairo-Regular'],
    colors: [],
    version: 1,
    createdAt: '2026-11-24T00:00:00.000Z',
  };
}

describe('P0-4: locked layers are immutable', () => {
  it('editing a locked background = zero change', () => {
    const spec = makeSpec();
    const after = applyDiff(spec, { op: 'recolor', target: 'background', value: C(10, 18, 32) });
    expect(after).toEqual(spec); // layers, canvas AND version all untouched
  });

  it('an unlocked background still recolors (control)', () => {
    const spec = makeSpec();
    const open = {
      ...spec,
      layers: spec.layers.map((l) => (l.id === 'bg' ? { ...l, locked: false } : l)),
    };
    const after = applyDiff(open, { op: 'recolor', target: 'background', value: C(10, 18, 32) });
    expect(after).not.toEqual(open);
    expect(after.canvas.background).toEqual(C(10, 18, 32));
    expect(after.layers.find((l) => l.id === 'bg')!.fill).toEqual(C(10, 18, 32));
    expect(after.version).toBe(2);
  });

  it('scale/recolor diffs skip a locked text layer', () => {
    const spec = makeSpec();
    const locked = spec.layers.find((l) => l.id === 'copy-locked')!;
    const scaled = applyDiff(spec, { op: 'scale', target: 'COPY-LOCKED', value: 1.5 });
    expect(scaled.layers.find((l) => l.id === 'copy-locked')!).toEqual(locked);
    const recolored = applyDiff(spec, {
      op: 'recolor',
      target: 'COPY-LOCKED',
      value: C(220, 38, 38),
    });
    expect(recolored.layers.find((l) => l.id === 'copy-locked')!).toEqual(locked);
    expect(recolored.version).toBe(1); // nothing changed → no version bump
  });

  it('merge honors locked: geometry and text of a locked layer survive an import', () => {
    const spec = makeSpec();
    const merged = mergeSpecWithImport(spec, {
      layers: [
        { name: '90_Background', x: 5, y: 5, width: 50, height: 50, visible: false },
        { name: 'HEADLINE', x: 10, y: 20, width: 400, height: 100, text: 'مغيَّر', visible: true },
        { name: 'COPY-LOCKED', x: 7, y: 7, width: 7, height: 7, text: 'مغيَّر أيضاً', visible: false },
      ],
    });
    const bg = merged.layers.find((l) => l.id === 'bg')!;
    expect({ x: bg.x, y: bg.y, width: bg.width, height: bg.height, visible: bg.visible }).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 1350,
      visible: true,
    });
    const locked = merged.layers.find((l) => l.id === 'copy-locked')!;
    expect(locked.x).toBe(80);
    expect(locked.visible).toBe(true);
    expect(locked.textRuns![0]!.text).toBe('نص مقفل بلون باهت');
    const open = merged.layers.find((l) => l.id === 'headline')!;
    expect(open.x).toBe(10);
    expect(open.textRuns![0]!.text).toBe('مغيَّر');
    expect(merged.version).toBe(2);
  });

  it('improveSpec auto-fixes the open copy but never the locked one', () => {
    const spec = makeSpec();
    const brief = parseBrief(
      'تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي',
    );
    const result = improveSpec(spec, brief, resolvePreset(spec), {
      maxIterations: 3,
      targetScore: 99,
    });
    const locked = result.spec.layers.find((l) => l.id === 'copy-locked')!;
    const open = result.spec.layers.find((l) => l.id === 'copy-open')!;
    // the loop must have run (the open 14px copy got raised to the floor)…
    expect(open.textRuns![0]!.size).toBeGreaterThanOrEqual(22);
    expect(open.textRuns![0]!.color).not.toEqual(C(200, 200, 200));
    // …while the locked twin stayed exactly as the user froze it.
    expect(locked.textRuns![0]!.size).toBe(14);
    expect(locked.textRuns![0]!.color).toEqual(C(200, 200, 200));
    expect(locked.x).toBe(80);
    expect(locked.y).toBe(440);
  });
});
