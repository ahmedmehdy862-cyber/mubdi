/**
 * Q3 — Template DSL contract tests.
 * The template-first path is the generator's main route: the library must be
 * complete, variant picking must guarantee hard diversity, and every template
 * must render a layout with the mandatory slots present.
 */
import { describe, expect, it } from 'vitest';
import {
  LIBRARY,
  pickTemplates,
  STYLE_LOOKS,
  extractBigNumber,
  renderTemplate,
  useOfBrief,
  makeTypeScale,
  type TemplateRenderCtx,
} from '../packages/design-knowledge/src/index';
import type { Palette } from '../packages/design-knowledge/src/index';

const PALETTE: Palette = {
  background: '#f4f1ea',
  surface: '#ffffff',
  primary: '#1f7a3d',
  accent: '#e2a63b',
  text: '#1d2733',
  textMuted: '#5c6672',
  onPrimary: '#ffffff',
} as Palette;

function ctxFor(overrides: Partial<TemplateRenderCtx> = {}): TemplateRenderCtx {
  const type = makeTypeScale({ canvasMin: 1080 });
  return {
    width: 1080,
    height: 1350,
    margin: 64,
    rtl: true,
    palette: PALETTE,
    hex: {
      background: PALETTE.background,
      surface: PALETTE.surface,
      primary: PALETTE.primary,
      accent: PALETTE.accent,
      text: PALETTE.text,
      textMuted: PALETTE.textMuted,
      onPrimary: PALETTE.onPrimary,
    },
    fonts: { display: 'Cairo', body: 'Almarai' },
    type,
    copy: {
      eyebrow: 'دعوة',
      headline: 'ملتقى التشجير في الحي هذا الجمعة',
      subhead: 'خ_DATAطة ثابتة نحو مجتمع أخضر',
      body: 'التاريخ الجمعة 5 مساءً\nالمكان: ساحة الحي',
      cta: 'سجّل الآن',
      footer: '#تشجير',
      hashtags: ['#تشجير', '#تطوع'],
    },
    minFoot: 24,
    direction: {
      id: 'editorial-bold',
      nameAr: '',
      summaryAr: '',
    } as TemplateRenderCtx['direction'],
    sp: (v: number) => Math.round(v / 8) * 8,
    ...overrides,
  };
}

describe('template library (Q3)', () => {
  it('has 40+ templates', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(40);
  });

  it('covers all 6 style looks', () => {
    for (const look of Object.values(STYLE_LOOKS)) {
      expect(LIBRARY.some((t) => t.style === look.id)).toBe(true);
    }
  });

  it('covers all 10 template uses', () => {
    for (const use of useOfBrief('event', '') ? [] : []) void use; // compile guard
    const uses = new Set(LIBRARY.flatMap((t) => t.uses));
    expect(uses.size).toBeGreaterThanOrEqual(10);
  });
});

describe('pickTemplates diversity (Q3 hard gate)', () => {
  it('picks 3 templates with distinct patterns AND styles', () => {
    const picked = pickTemplates('event', 3);
    expect(picked.length).toBe(3);
    const patterns = new Set(picked.map((t) => t.pattern));
    const styles = new Set(picked.map((t) => t.style));
    expect(patterns.size).toBe(3);
    expect(styles.size).toBe(3);
  });

  it('picks are stable (deterministic for the same use)', () => {
    expect(pickTemplates('announcement', 3).map((t) => t.id)).toEqual(
      pickTemplates('announcement', 3).map((t) => t.id),
    );
  });
});

describe('renderTemplate slot completeness', () => {
  it('renders every event-pattern template with headline + CTA', () => {
    for (const tpl of pickTemplates('event', 3)) {
      const plan = renderTemplate(tpl, ctxFor());
      expect(plan.blocks.some((b) => b.role === 'headline' && b.text.trim())).toBe(true);
      expect(plan.blocks.some((b) => b.role === 'cta')).toBe(true);
      expect(plan.shapes.length).toBeGreaterThan(3);
      expect(plan.blocks.length).toBeGreaterThan(2);
      // no block may escape the canvas
      for (const b of plan.blocks) {
        expect(b.rect.y).toBeLessThanOrEqual(1350);
        expect(b.rect.x).toBeGreaterThanOrEqual(0);
        expect(b.rect.x + b.rect.width).toBeLessThanOrEqual(1080 + 4);
      }
    }
  });

  it('renders quote templates with the quote itself as copy', () => {
    const quote = LIBRARY.find((t) => t.uses.includes('quote'))!;
    const plan = renderTemplate(
      quote,
      ctxFor({
        copy: {
          headline: 'النجاح رحلة مش محطة',
          cta: '',
          hashtags: ['#تحفيز'],
        },
      }),
    );
    expect(plan.blocks.length).toBeGreaterThan(1);
    expect(plan.shapes.length).toBeGreaterThan(2);
  });

  it('keeps every text block above the legibility floor', () => {
    for (const tpl of LIBRARY.slice(0, 12)) {
      const plan = renderTemplate(tpl, ctxFor());
      for (const b of plan.blocks) {
        expect(b.size).toBeGreaterThanOrEqual(22);
      }
    }
  });
});

describe('extractBigNumber', () => {
  it('pulls an arabic-indic or latin figure out of the copy', () => {
    expect(extractBigNumber('78% من المتطوعين', '', '')).toMatch(/78/);
    expect(extractBigNumber('باقي 3 أيام على الاختبارات', '', '')).toMatch(/3/);
    expect(extractBigNumber('شكراً لـ 500 متطوع', 'ساهموا في', 'نجاح الحملة')).toMatch(/500/);
  });

  it('returns undefined when the copy has no figure', () => {
    expect(extractBigNumber('ملتقى التشجير', 'في الحي', 'شارك الآن')).toBeUndefined();
  });
});

describe('useOfBrief mapping', () => {
  it('maps obvious prompts to their uses', () => {
    expect(useOfBrief('stats', 'إحصائية 78% من المتطوعين')).toBe('stats');
    expect(useOfBrief('quote', 'اقتباس: النجاح رحلة')).toBe('quote');
    expect(useOfBrief('story', 'ستوري: انضم لفريق المتطوعين')).toBe('story');
    expect(useOfBrief('campaign', 'حملة توعية: احمِ نفسك من الإنفلونزا')).toBe('campaign');
    expect(useOfBrief('event', 'ملتقى تطوعي للتشجير')).toBe('event');
  });
});
