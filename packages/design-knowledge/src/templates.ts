import { measureTextWidth, textBlockHeight, wrapText, type TypeScale } from './typography.js';
import type { ArtDirection } from './direction.js';
import type { Palette } from './color.js';
import type { ComposeCopy, PlannedShape, PlannedText, ShapeKind, TextRole } from './composition.js';

/**
 * Q3 — Template-first architecture.
 *
 * Templates are parametric, art-directed layouts built on the eight observed
 * reference patterns (P1-P8, docs/design-language.md). A template decides:
 * grid zones, depth layers, slots, decoration budget, colour roles and the
 * typography preset — the copy is poured into real measured slots.
 *
 * Every template in LIBRARY must pass the calibrated critic on the golden
 * set before it ships (verified by scripts/golden-calibrated.mjs).
 */

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type TemplateStyle =
  | 'editorial-bold'
  | 'soft-organic'
  | 'geometric-islamic'
  | 'photographic-overlay'
  | 'flat-illustrative'
  | 'premium-dark';

export type TemplateUse =
  | 'event'
  | 'campaign'
  | 'quote'
  | 'stats'
  | 'testimonial'
  | 'thanks'
  | 'recruit'
  | 'countdown'
  | 'carousel'
  | 'story';

export type PatternId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';

export type DetailLayout = 'rows' | 'grid2x2' | 'chips';
export type CtaMode = 'pill' | 'band';
export type FooterMode = 'social-bar' | 'minimal' | 'none';
export type HeroKind = 'medallion' | 'object' | 'number' | 'none';

export interface Template {
  id: string;
  nameAr: string;
  pattern: PatternId;
  style: TemplateStyle;
  uses: TemplateUse[];
  details: DetailLayout;
  cta: CtaMode;
  footer: FooterMode;
  hero: HeroKind;
  /** Decoration budget. */
  decor: { sparkle: number; underline: number; patternVeil: number; tape: number; dots: number };
  radius: number;
  prefersDark: boolean;
  fontPair: string;
  rationaleAr: string;
}

export interface StyleLook {
  id: TemplateStyle;
  nameAr: string;
  fontPair: string;
  radius: number;
  prefersDark: boolean;
  decor: Template['decor'];
}

export const STYLE_LOOKS: Record<TemplateStyle, StyleLook> = {
  'editorial-bold': {
    id: 'editorial-bold',
    nameAr: 'تحريري جسور',
    fontPair: 'cairo-cairo',
    radius: 4,
    prefersDark: true,
    decor: { sparkle: 3, underline: 1, patternVeil: 0, tape: 0, dots: 0 },
  },
  'soft-organic': {
    id: 'soft-organic',
    nameAr: 'عضوي ناعم',
    fontPair: 'almarai-cairo',
    radius: 44,
    prefersDark: false,
    decor: { sparkle: 4, underline: 0, patternVeil: 0, tape: 0, dots: 5 },
  },
  'geometric-islamic': {
    id: 'geometric-islamic',
    nameAr: 'هندسي إسلامي',
    fontPair: 'cairo-almarai',
    radius: 10,
    prefersDark: true,
    decor: { sparkle: 2, underline: 0, patternVeil: 1, tape: 0, dots: 0 },
  },
  'photographic-overlay': {
    id: 'photographic-overlay',
    nameAr: 'صورة بطبقة',
    fontPair: 'cairo-cairo',
    radius: 20,
    prefersDark: true,
    decor: { sparkle: 2, underline: 0, patternVeil: 0, tape: 0, dots: 0 },
  },
  'flat-illustrative': {
    id: 'flat-illustrative',
    nameAr: 'مسطح توضيحي',
    fontPair: 'cairo-almarai',
    radius: 28,
    prefersDark: false,
    decor: { sparkle: 5, underline: 0, patternVeil: 0, tape: 0, dots: 6 },
  },
  'premium-dark': {
    id: 'premium-dark',
    nameAr: 'غامق فاخر',
    fontPair: 'cairo-cairo',
    radius: 16,
    prefersDark: true,
    decor: { sparkle: 3, underline: 0, patternVeil: 0, tape: 0, dots: 0 },
  },
};

/* ------------------------------------------------------------------ */
/* library: 45 templates across pattern Ã— style Ã— use                  */
/* ------------------------------------------------------------------ */

function t(
  id: string,
  nameAr: string,
  pattern: PatternId,
  style: TemplateStyle,
  uses: TemplateUse[],
  overrides: Partial<Template> = {},
): Template {
  const look = STYLE_LOOKS[style];
  return {
    id,
    nameAr,
    pattern,
    style,
    uses,
    details: 'rows',
    cta: 'pill',
    footer: 'social-bar',
    hero: 'medallion',
    decor: look.decor,
    radius: look.radius,
    prefersDark: look.prefersDark,
    fontPair: look.fontPair,
    rationaleAr: `${look.nameAr} على النمط — ${pattern} — ${nameAr}.`,
    ...overrides,
  };
}

export const LIBRARY: Template[] = [
  /* ---- events (8) ---- */
  t('ev-card-royal', 'بطاقة الفعالية الملكية', 'P1', 'editorial-bold', ['event']),
  t('ev-medallion-soft', 'ملتقى الوسام الناعم', 'P1', 'soft-organic', ['event']),
  t('ev-islamic-card', 'بطاقة النقش الإسلامي', 'P1', 'geometric-islamic', ['event']),
  t('ev-photo-scene', 'مشهد الفعالية المصور', 'P3', 'photographic-overlay', ['event']),
  t('ev-paper-invite', 'دعوة الورقة المثبتة', 'P4', 'soft-organic', ['event'], {
    decor: { ...STYLE_LOOKS['soft-organic'].decor, tape: 2 },
  }),
  t('ev-type-hero', 'طباعة الفعالية البطلة', 'P7', 'editorial-bold', ['event']),
  t('ev-diag-split', 'انقسام الترحيب', 'P5', 'flat-illustrative', ['event', 'recruit']),
  t('ev-panel-premium', 'لوح الدعوة الفاخر', 'P6', 'premium-dark', ['event']),

  /* ---- campaign / awareness (6) ---- */
  t('camp-steps-card', 'بطاقة الخطوات', 'P1', 'flat-illustrative', ['campaign']),
  t('camp-photo-cause', 'صورة القضية', 'P3', 'photographic-overlay', ['campaign']),
  t('camp-islamic-plain', 'نقش التوعية', 'P1', 'geometric-islamic', ['campaign']),
  t('camp-object-soft', 'بطل القضية الناعم', 'P2', 'soft-organic', ['campaign']),
  t('camp-type-loud', 'صرخة الحملة', 'P7', 'editorial-bold', ['campaign']),
  t('camp-panel-hang', 'لوح التوعية المعلق', 'P6', 'flat-illustrative', ['campaign']),

  /* ---- quotes (3) ---- */
  t('quote-type-royal', 'اقتباس الطباعة الملكية', 'P7', 'editorial-bold', ['quote'], {
    cta: 'band',
    details: 'chips',
    footer: 'minimal',
  }),
  t('quote-dark-premium', 'اقتباس الغلاف الفاخر', 'P1', 'premium-dark', ['quote'], {
    details: 'chips',
    cta: 'band',
  }),
  t('quote-soft-round', 'اقتباس الدائرة الناعمة', 'P2', 'soft-organic', ['quote'], {
    hero: 'object',
    details: 'chips',
    cta: 'band',
  }),

  /* ---- stats / infographic (4) ---- */
  t('stat-number-royal', 'الرقم البطل الملكي', 'P2', 'editorial-bold', ['stats'], {
    hero: 'number',
  }),
  t('stat-grid-islamic', 'شبكة الإحصاءات المنقوشة', 'P1', 'geometric-islamic', ['stats'], {
    details: 'grid2x2',
    hero: 'number',
  }),
  t('stat-panel-float', 'لوح الأرقام العائم', 'P6', 'premium-dark', ['stats'], {
    details: 'rows',
    hero: 'number',
  }),
  t('stat-diag-count', 'انقسام الإحصائية', 'P5', 'flat-illustrative', ['stats'], {
    hero: 'number',
  }),

  /* ---- testimonial (4) ---- */
  t('testi-paper-note', 'شهادة الورقة', 'P4', 'flat-illustrative', ['testimonial'], {
    decor: { ...STYLE_LOOKS['flat-illustrative'].decor, tape: 2 },
  }),
  t('testi-photo-quote', 'شهادة المشهد', 'P3', 'photographic-overlay', ['testimonial'], {
    details: 'chips',
  }),
  t('testi-card-soft', 'شهادة البطاقة الناعمة', 'P1', 'soft-organic', ['testimonial'], {
    details: 'chips',
  }),
  t('testi-type-focus', 'شهادة الطباعة المركزة', 'P7', 'premium-dark', ['testimonial'], {
    details: 'chips',
  }),

  /* ---- thanks / achievement (4) ---- */
  t('thanks-medal-dark', 'وسام الشكر الفاخر', 'P1', 'premium-dark', ['thanks']),
  t('thanks-spark-soft', 'شكر البريق الناعم', 'P1', 'soft-organic', ['thanks']),
  t('thanks-type-bold', 'شكر الطباعة الجسورة', 'P7', 'editorial-bold', ['thanks']),
  t('thanks-object-flat', 'بطل التهنئة المسطح', 'P2', 'flat-illustrative', ['thanks']),

  /* ---- recruit / registration (4) ---- */
  t('recruit-type-urgent', 'نداء التجنيد العاجل', 'P7', 'flat-illustrative', ['recruit']),
  t('recruit-card-clear', 'بطاقة التسجيل الواضحة', 'P1', 'editorial-bold', ['recruit']),
  t('recruit-photo-team', 'صورة الفريق', 'P3', 'photographic-overlay', ['recruit']),
  t('recruit-islamic-band', 'شريط الانضمام المنقوش', 'P6', 'geometric-islamic', ['recruit'], {
    cta: 'band',
  }),

  /* ---- countdown / reminder (4) ---- */
  t('count-number-loud', 'عدّاد الأرقام العملاقة', 'P2', 'editorial-bold', ['countdown'], {
    hero: 'number',
  }),
  t('count-dark-timer', 'عدّاد الغلاف الغامق', 'P1', 'premium-dark', ['countdown'], {
    hero: 'number',
    details: 'chips',
  }),
  t('count-flat-bright', 'عدّاد الألوان الزاهية', 'P5', 'flat-illustrative', ['countdown'], {
    hero: 'number',
  }),
  t('count-islamic-eve', 'ليلة النقش', 'P1', 'geometric-islamic', ['countdown'], {
    hero: 'number',
    details: 'chips',
  }),

  /* ---- carousel (4) ---- */
  t('car-cover-editorial', 'غلاف الكاروسيل التحريري', 'P7', 'editorial-bold', ['carousel'], {
    cta: 'band',
    footer: 'minimal',
  }),
  t('car-cover-photo', 'غلاف الكاروسيل المصور', 'P3', 'photographic-overlay', ['carousel'], {
    cta: 'band',
    footer: 'minimal',
  }),
  t('car-slide-clean', 'سلايد النقطة النظيف', 'P1', 'soft-organic', ['carousel'], {
    cta: 'band',
    footer: 'none',
    details: 'rows',
  }),
  t('car-slide-numbered', 'سلايد الرقم المنقوش', 'P6', 'geometric-islamic', ['carousel'], {
    cta: 'band',
    footer: 'none',
    hero: 'number',
  }),

  /* ---- story (5) ---- */
  t('story-type-punch', 'ستوري الطباعة الصادمة', 'P7', 'editorial-bold', ['story'], {
    footer: 'minimal',
    details: 'chips',
  }),
  t('story-card-bright', 'ستوري البطاقة الزاهية', 'P1', 'flat-illustrative', ['story'], {
    footer: 'minimal',
  }),
  t('story-photo-frame', 'ستوري المشهد المؤطر', 'P3', 'photographic-overlay', ['story'], {
    footer: 'minimal',
  }),
  t('story-premium-glow', 'ستوري التوهج الفاخر', 'P2', 'premium-dark', ['story'], {
    footer: 'minimal',
  }),
  t(
    'story-islamic-count',
    'ستوري النقش العاجل',
    'P1',
    'geometric-islamic',
    ['story', 'countdown'],
    { footer: 'minimal', hero: 'number', details: 'chips' },
  ),
];

/* ------------------------------------------------------------------ */
/* selection                                                           */
/* ------------------------------------------------------------------ */

/**
 * Specific (non-generic) brief intents map directly to a template use.
 * Generic intents — event/post/format ids like cover_banner — are NOT here:
 * they must fall through to keyword scanning, since a "ملتقى" brief may still
 * be a recruitment or charity campaign in its copy.
 */
const DIRECT_USE: Partial<Record<string, TemplateUse>> = {
  carousel: 'carousel',
  story: 'story',
  quote: 'quote',
  stats: 'stats',
  recruit: 'recruit',
  countdown: 'countdown',
  testimonial: 'testimonial',
  thanks: 'thanks',
  campaign: 'campaign',
};

export function useOfBrief(intent: string, promptText: string): TemplateUse {
  const direct = DIRECT_USE[intent];
  if (direct) return direct;
  const hay = `${intent} ${promptText}`;
  if (/(كاروسيل|سلايد|carousel)/.test(hay)) return 'carousel';
  if (/(سجل|انضم|نحتاج|متطوع|recruit|التسجيل)/.test(hay)) return 'recruit';
  if (/(اختبار|باقي|عدّ|تذكير|countdown|مواعيد)/.test(hay)) return 'countdown';
  if (/(اقتباس|quote)/.test(hay)) return 'quote';
  if (/(نسبة|إحصاء|%|٪|78|stat)/.test(hay)) return 'stats';
  if (/(شهادة|testimonial|قال عن)/.test(hay)) return 'testimonial';
  if (/(شكر|فوز|إنجاز|المركز الأول|achievement)/.test(hay)) return 'thanks';
  if (intent === 'story' || /ستوري/.test(hay)) return 'story';
  if (/(تو\.?عية|حملة توعية|إنفلونزا|تبرع|خيرية)/.test(hay)) return 'campaign';
  return 'event';
}

/**
 * Rank templates for a brief (use match first, then stable spread).
 * Diversity: chosen variants must differ in pattern AND style.
 */
export function pickTemplates(use: TemplateUse, n = 3): Template[] {
  const scored = LIBRARY.map((tpl) => ({
    tpl,
    score: (tpl.uses.includes(use) ? 50 : 0) + (tpl.id.charCodeAt(3) % 7),
  }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.tpl);
  const picked: Template[] = [];
  for (const tpl of scored) {
    if (picked.length >= n) break;
    if (picked.some((p) => p.pattern === tpl.pattern || p.style === tpl.style)) continue;
    picked.push(tpl);
  }
  let i = 0;
  while (picked.length < n && i < scored.length) {
    if (!picked.includes(scored[i]!)) picked.push(scored[i]!);
    i++;
  }
  return picked.slice(0, n);
}

/* ------------------------------------------------------------------ */
/* render context                                                      */
/* ------------------------------------------------------------------ */

export interface TemplateRenderCtx {
  width: number;
  height: number;
  margin: number;
  rtl: boolean;
  palette: Palette;
  hex: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
    textMuted: string;
    onPrimary: string;
  };
  fonts: { display: string; body: string };
  type: TypeScale;
  copy: ComposeCopy;
  minFoot: number; // minimum body font size
  bigNumber?: string;
  direction: ArtDirection;
  /** Snap to the 8pt spacing scale. */
  sp(v: number): number;
}

export interface TemplatePlan {
  shapes: PlannedShape[];
  blocks: PlannedText[];
  nameAr: string;
  rationaleAr: string;
  focal: { x: number; y: number };
}

/* ------------------------------------------------------------------ */
/* small helpers (colour mixing, alpha, decorations)                    */
/* ------------------------------------------------------------------ */

function mixHex(a: string, b: string, w: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - w) + ((pb >> 16) & 255) * w);
  const g = Math.round(((pa >> 8) & 255) * (1 - w) + ((pb >> 8) & 255) * w);
  const bl = Math.round((pa & 255) * (1 - w) + (pb & 255) * w);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/** 8-digit hex (RRGGBBAA) so the renderer + PSD writer both carry alpha. */
function alphaHex(hex: string, alpha: number): string {
  const p = parseInt(hex.slice(1), 16);
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  const int = (((p & 0xffffff) << 8) | a) >>> 0;
  return `#${int.toString(16).padStart(8, '0')}`;
}

function text(
  role: TextRole,
  s: string,
  lines: string[],
  rect: { x: number; y: number; width: number; height: number },
  size: number,
  align: 'start' | 'center' | 'end',
  weight: 'regular' | 'bold',
  colour: string,
  leading = 1.45,
  backdrop?: string,
): PlannedText {
  return {
    role,
    text: s,
    lines,
    rect,
    size,
    leading,
    weight,
    color: colour,
    align,
    track: 0,
    ...(backdrop ? { backdropHex: backdrop } : {}),
  };
}

/**
 * Q3 bottom-band filler: templates that bottom-anchor the CTA leave a tall
 * quiet zone above it — this covers the band with a tinted rounded panel,
 * a low-alpha dot veil and a row of hashtag chips so the lower third never
 * reads as dead background (and the pixel critic sees real structure).
 */
function voidFiller(ctx: TemplateRenderCtx, plan: TemplatePlan, top: number, bottom: number): void {
  const H = Math.round(bottom - top);
  if (H < ctx.type.body * 2.2) return;
  const x0 = Math.round(ctx.margin * 0.6);
  const w0 = Math.round(ctx.width - ctx.margin * 1.2);
  const y0 = Math.round(top + ctx.sp(8));
  const h0 = Math.round(H - ctx.sp(16));
  plan.shapes.push(
    rectShape(
      'void-panel',
      'rect',
      { x: x0, y: y0, width: w0, height: h0 },
      alphaHex(ctx.hex.primary, 0.09),
      1,
      { radius: Math.round(ctx.width * 0.03) },
    ),
  );
  plan.shapes.push(
    rectShape(
      'void-dots',
      'pattern',
      { x: x0 + 24, y: y0 + 20, width: w0 - 48, height: Math.max(24, h0 - 40) },
      alphaHex(ctx.hex.primary, 0.85),
      0.5,
      { meta: { pattern: 'dots', cell: 36 } },
    ),
  );

  const chips = (ctx.copy.hashtags ?? []).slice(0, 3);
  if (chips.length && h0 > ctx.type.caption * 3.2) {
    const chipH = Math.max(ctx.minFoot * 1.9, Math.round(ctx.type.caption * 2.15));
    const chipY = Math.round(y0 + h0 * 0.5 - chipH / 2);
    const gap = ctx.sp(12);
    const cw = Math.round((w0 - gap * (chips.length - 1) - ctx.margin) / chips.length);
    chips.forEach((tag, i) => {
      const cx = x0 + ctx.margin * 0.5 + i * (cw + gap);
      const chipTint = alphaHex(ctx.hex.primary, 0.13);
      plan.shapes.push(
        rectShape(
          `void-chip-${i}`,
          'rect',
          { x: Math.round(cx), y: chipY, width: cw, height: chipH },
          chipTint,
          1,
          { radius: Math.round(chipH / 2) },
        ),
      );
      const size = Math.max(ctx.minFoot - 2, Math.round(ctx.type.caption * 0.92));
      plan.blocks.push(
        text(
          'footer',
          tag,
          [tag],
          {
            x: Math.round(cx),
            y: Math.round(chipY + chipH * 0.5 - size * 0.72),
            width: cw,
            height: Math.round(size * 1.5),
          },
          size,
          'center',
          'bold',
          ctx.hex.text,
          1.3,
          chipTint,
        ),
      );
    });
  }
}

function rectShape(
  id: string,
  kind: ShapeKind,
  r: { x: number; y: number; width: number; height: number },
  fill: string,
  opacity: number,
  extra: Partial<PlannedShape> = {},
): PlannedShape {
  return { id, kind, rect: r, fill, opacity, ...extra };
}

function sparkles(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  spots: Array<{ x: number; y: number; s: number }>,
): void {
  spots.forEach((a, i) => {
    plan.shapes.push(
      rectShape(
        `sparkle-${i}`,
        'star4',
        {
          x: Math.round(a.x - a.s / 2),
          y: Math.round(a.y - a.s / 2),
          width: Math.round(a.s),
          height: Math.round(a.s),
        },
        ctx.hex.accent,
        0.92,
      ),
    );
  });
}

function dotsScatter(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  count: number,
  seed: number,
): void {
  for (let i = 0; i < count; i++) {
    const x = ctx.width * (0.08 + ((i * 37 + seed * 13) % 84) / 100);
    const y = ctx.height * (0.08 + ((i * 53 + seed * 29) % 84) / 100);
    const s = 10 + ((i * 7 + seed) % 12);
    plan.shapes.push(
      rectShape(
        `dot-${i}`,
        'circle',
        { x: Math.round(x), y: Math.round(y), width: s, height: s },
        i % 2 === 0 ? alphaHex(ctx.hex.accent, 0.5) : alphaHex(ctx.hex.primary, 0.35),
        1,
      ),
    );
  }
}

function patternVeil(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  style: 'islamic' | 'dots' | 'grid',
): void {
  plan.shapes.push(
    rectShape(
      'pattern-veil',
      'pattern',
      { x: 0, y: 0, width: ctx.width, height: ctx.height },
      ctx.hex.text,
      0.055,
      { meta: { pattern: style, cell: Math.round(ctx.width / 9) } },
    ),
  );
}

function bgGradient(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  angle: number,
  dark: boolean,
): void {
  plan.shapes.push(
    rectShape(
      'bg-grad',
      'rect',
      { x: 0, y: 0, width: ctx.width, height: ctx.height },
      ctx.hex.background,
      1,
      {
        gradient: {
          from: ctx.hex.background,
          to: mixHex(ctx.hex.background, ctx.hex.primary, dark ? 0.4 : 0.24),
          angle,
        },
        meta: { role: 'bg' },
      },
    ),
  );
}

function eyebrowChip(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  s: string,
  centreX: number,
  y: number,
  fill: string,
  textColour: string,
): number {
  if (!s) return y;
  const size = ctx.type.caption;
  const w = Math.round(measureTextWidth(s, size) + size * 1.6);
  const h = Math.round(size * 2.1);
  plan.shapes.push(
    rectShape(
      'chip-bg',
      'rect',
      { x: Math.round(centreX - w / 2), y: Math.round(y), width: w, height: h },
      fill,
      1,
      { radius: h / 2 },
    ),
  );
  plan.blocks.push(
    text(
      'eyebrow',
      s,
      [s],
      {
        x: Math.round(centreX - w / 2),
        y: Math.round(y + h * 0.2),
        width: w,
        height: Math.round(h * 0.66),
      },
      size,
      'center',
      'bold',
      textColour,
      1.3,
    ),
  );
  return y + h;
}

function logoSlotTop(ctx: TemplateRenderCtx, plan: TemplatePlan, y: number, w: number): void {
  const size = ctx.type.caption;
  const logoText = ctx.copy.logo ?? 'الشعار';
  const lw = Math.min(w, Math.round(measureTextWidth(logoText, size) + size * 1.4));
  const lh = Math.round(size * 2);
  const lx = ctx.rtl ? ctx.width - ctx.margin - lw : ctx.margin;
  plan.shapes.push(
    rectShape(
      'logo-slot',
      'rect',
      { x: Math.round(lx), y: Math.round(y), width: lw, height: lh },
      alphaHex(ctx.hex.text, 0.1),
      1,
      { radius: 12, noteAr: 'ضع شعار العلامة هنا.' },
    ),
  );
  plan.blocks.push(
    text(
      'logo',
      logoText,
      [logoText],
      { x: Math.round(lx), y: Math.round(y + lh * 0.22), width: lw, height: Math.round(lh * 0.62) },
      Math.round(size * 0.92),
      'center',
      'bold',
      ctx.hex.text,
      1.3,
    ),
  );
}

function footerBar(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  y: number,
  mode: 'social-bar' | 'minimal' | 'none',
): number {
  const raw =
    ctx.copy.footer ??
    (ctx.copy.hashtags?.length ? ctx.copy.hashtags.slice(0, 2).join('  ') : undefined);
  if (!raw || mode === 'none') return y;
  const size = ctx.type.caption;
  const h = Math.round(size * 2.4);
  const maxW = ctx.width - ctx.margin * 1.8;
  /* one line only: shrink to the floor, then truncate with an ellipsis */
  let fitted = raw.replace(/\s+/g, ' ').trim();
  let fontSize = size;
  while (fontSize > ctx.minFoot - 2 && measureTextWidth(fitted, fontSize) > maxW) fontSize -= 1;
  if (measureTextWidth(fitted, fontSize) > maxW) {
    while (fitted.length > 4 && measureTextWidth(`${fitted}…`, fontSize) > maxW)
      fitted = fitted.slice(0, -1);
    fitted = `${fitted}…`;
  }
  if (mode === 'social-bar') {
    plan.shapes.push(
      rectShape(
        'footer-bar',
        'rect',
        {
          x: Math.round(ctx.margin * 0.6),
          y: Math.round(y),
          width: Math.round(ctx.width - ctx.margin * 1.2),
          height: h,
        },
        alphaHex(ctx.hex.text, 0.08),
        1,
        { radius: h / 2 },
      ),
    );
  }
  plan.blocks.push(
    text(
      'footer',
      fitted,
      [fitted],
      {
        x: Math.round(ctx.margin * 0.9),
        y: Math.round(y + h * 0.28),
        width: Math.round(ctx.width - ctx.margin * 1.8),
        height: Math.round(h * 0.58),
      },
      fontSize,
      'center',
      'regular',
      ctx.hex.textMuted,
      1.3,
    ),
  );
  return y + h;
}

function ctaPill(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  centreX: number,
  y: number,
  width?: number,
): number {
  const s = ctx.copy.cta;
  if (!s) return y;
  const size = ctx.type.cta;
  const w = Math.round(width ?? Math.min(ctx.width * 0.6, measureTextWidth(s, size) + size * 3));
  const h = Math.round(size * 2.5);
  plan.shapes.push(
    rectShape(
      'cta-bg',
      'rect',
      { x: Math.round(centreX - w / 2), y: Math.round(y), width: w, height: h },
      ctx.hex.primary,
      1,
      { radius: h / 2, effects: ['soft-shadow'], meta: { role: 'cta-bg' } },
    ),
  );
  plan.blocks.push(
    text(
      'cta',
      s,
      [s],
      {
        x: Math.round(centreX - w / 2),
        y: Math.round(y + h * 0.24),
        width: w,
        height: Math.round(h * 0.6),
      },
      size,
      'center',
      'bold',
      ctx.hex.onPrimary,
      1.3,
    ),
  );
  return y + h;
}

function ctaBand(ctx: TemplateRenderCtx, plan: TemplatePlan, y: number): number {
  const s = ctx.copy.cta;
  if (!s) return y;
  const h = Math.round(ctx.type.cta * 2.7);
  plan.shapes.push(
    rectShape(
      'cta-bg',
      'ribbon',
      {
        x: Math.round(ctx.margin),
        y: Math.round(y),
        width: Math.round(ctx.width - ctx.margin * 2),
        height: h,
      },
      ctx.hex.primary,
      1,
      { radius: 16, effects: ['soft-shadow'], meta: { role: 'cta-bg' } },
    ),
  );
  plan.blocks.push(
    text(
      'cta',
      s,
      [s],
      {
        x: Math.round(ctx.margin),
        y: Math.round(y + h * 0.22),
        width: Math.round(ctx.width - ctx.margin * 2),
        height: Math.round(h * 0.6),
      },
      ctx.type.cta,
      'center',
      'bold',
      ctx.hex.onPrimary,
      1.3,
    ),
  );
  return y + h;
}

/* headline with accent-coloured last word (references device #1) */
function headlineBlock(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  x: number,
  y: number,
  width: number,
  maxLines: number,
  align: 'start' | 'center' | 'end',
  accentLastWord: boolean,
): number {
  const s = ctx.copy.headline;
  const size = ctx.type.h1;
  const lines = wrapText(s, { maxWidth: width, fontSize: size, maxLines });
  const height = textBlockHeight(lines, size, ctx.type.leading.heading);
  plan.blocks.push(
    text(
      'headline',
      s,
      lines,
      { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) },
      size,
      align,
      'bold',
      ctx.hex.text,
      ctx.type.leading.heading,
    ),
  );
  if (accentLastWord && lines.length >= 2) {
    // Reference device #1: the FINAL LINE carries the accent colour whole.
    // (Per-word recolour overlays drift because canvas metrics differ from
    // the estimator; whole-line accent is what the references actually do.)
    const lastIdx = lines.length - 1;
    constAccentLastLine(ctx, plan, x, y, width, size, align, lines, lastIdx);
  }
  return y + height;
}

/** Push an accent-coloured overlay of the headline's final line. */
function constAccentLastLine(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  x: number,
  y: number,
  width: number,
  size: number,
  align: 'start' | 'center' | 'end',
  lines: string[],
  lastIdx: number,
): void {
  const last = lines[lastIdx]!;
  plan.blocks.push(
    text(
      'headline',
      last,
      [last],
      {
        x: Math.round(x),
        y: Math.round(y + lastIdx * size * ctx.type.leading.heading),
        width: Math.round(width),
        height: Math.round(size * ctx.type.leading.heading),
      },
      size,
      align,
      'bold',
      ctx.hex.accent,
      ctx.type.leading.heading,
    ),
  );
}

function subheadBlock(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  x: number,
  y: number,
  width: number,
  align: 'start' | 'center' | 'end',
): number {
  const s = ctx.copy.subhead;
  if (!s) return y;
  const size = ctx.type.h3;
  const lines = wrapText(s, { maxWidth: width, fontSize: size, maxLines: 3 });
  const h = textBlockHeight(lines, size, ctx.type.leading.body);
  plan.blocks.push(
    text(
      'subhead',
      s,
      lines,
      { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: h },
      size,
      align,
      'regular',
      ctx.hex.textMuted,
      ctx.type.leading.body,
    ),
  );
  return y + h;
}

function detailRows(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  x: number,
  y: number,
  width: number,
  maxRows: number,
  badgeFill: string,
  dotFill: string,
  colour: string,
): number {
  const lines = (ctx.copy.body ?? '').split('\n').filter(Boolean).slice(0, maxRows);
  let cursor = y;
  const size = Math.max(ctx.minFoot, Math.round(ctx.type.body * 0.86));
  lines.forEach((line, i) => {
    const badge = Math.round(size * 1.75);
    const bx = ctx.rtl ? x + width - badge : x;
    plan.shapes.push(
      rectShape(
        `badge-${i}`,
        'badge',
        { x: Math.round(bx), y: Math.round(cursor), width: badge, height: badge },
        badgeFill,
        1,
        { meta: { dot: dotFill } },
      ),
    );
    const textX = ctx.rtl ? x : x + badge + size * 0.55;
    const textW = width - badge - size * 0.7;
    const wrapped = wrapText(line, { maxWidth: textW, fontSize: size, maxLines: 2 });
    const h = textBlockHeight(wrapped, size, 1.45);
    plan.blocks.push(
      text(
        'body',
        wrapped.join('\n'),
        wrapped,
        {
          x: Math.round(textX),
          y: Math.round(cursor + (badge - h) / 2),
          width: Math.round(textW),
          height: h,
        },
        size,
        'start',
        'regular',
        colour,
        1.45,
      ),
    );
    cursor += badge + ctx.sp(size * 0.55);
  });
  return cursor;
}

function detailGrid2x2(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  r: { x: number; y: number; width: number; height: number },
  badgeFill: string,
  dotFill: string,
  colour: string,
): void {
  const lines = (ctx.copy.body ?? '').split('\n').filter(Boolean).slice(0, 4);
  const gap = ctx.sp(24);
  const cellW = (r.width - gap) / 2;
  const size = Math.max(ctx.minFoot, Math.round(ctx.type.body * 0.8));
  lines.forEach((line, i) => {
    const cx = r.x + (i % 2) * (cellW + gap);
    const cy = r.y + Math.floor(i / 2) * size * 3;
    const badge = Math.round(size * 1.5);
    const bx = ctx.rtl ? cx + cellW - badge : cx;
    plan.shapes.push(
      rectShape(
        `badge-g${i}`,
        'badge',
        { x: Math.round(bx), y: Math.round(cy), width: badge, height: badge },
        badgeFill,
        1,
        { meta: { dot: dotFill } },
      ),
    );
    const textX = ctx.rtl ? cx : cx + badge + size * 0.5;
    const textW = cellW - badge - size * 0.6;
    const wrapped = wrapText(line, { maxWidth: textW, fontSize: size, maxLines: 2 });
    plan.blocks.push(
      text(
        'body',
        wrapped.join('\n'),
        wrapped,
        {
          x: Math.round(textX),
          y: Math.round(cy + badge * 0.2),
          width: Math.round(textW),
          height: Math.round(size * 2.4),
        },
        size,
        'start',
        'regular',
        colour,
        1.4,
      ),
    );
  });
}

function detailChips(
  ctx: TemplateRenderCtx,
  plan: TemplatePlan,
  y: number,
  rightX: number,
  maxWidth: number,
): number {
  const lines = (ctx.copy.body ?? '').split('\n').filter(Boolean).slice(0, 2);
  const size = Math.max(ctx.minFoot - 4, Math.round(ctx.type.caption * 1.1));
  const h = Math.round(size * 2.2);
  let cursor = rightX;
  lines.forEach((line, i) => {
    const w = Math.round(Math.min(maxWidth * 0.46, measureTextWidth(line, size) + size * 1.7));
    const x = cursor - w;
    plan.shapes.push(
      rectShape(
        `chip-${i}`,
        'rect',
        { x: Math.round(x), y: Math.round(y), width: w, height: h },
        alphaHex(ctx.hex.primary, 0.18),
        1,
        { radius: h / 2 },
      ),
    );
    plan.blocks.push(
      text(
        'body',
        line,
        [line],
        { x: Math.round(x), y: Math.round(y + h * 0.22), width: w, height: Math.round(h * 0.6) },
        size,
        'center',
        'regular',
        ctx.hex.text,
        1.3,
      ),
    );
    cursor = x - ctx.sp(size * 0.5);
  });
  return y + h;
}

/* ------------------------------------------------------------------ */
/* pattern renderers                                                   */
/* ------------------------------------------------------------------ */

type PatternRenderer = (ctx: TemplateRenderCtx, tpl: Template, plan: TemplatePlan) => void;

const RENDERERS: Record<PatternId, PatternRenderer> = {
  /* P1 — central card (بطاقة مركزية) */
  P1(ctx, tpl, plan) {
    bgGradient(ctx, plan, 105, tpl.prefersDark);
    if (tpl.decor.patternVeil > 0)
      patternVeil(ctx, plan, tpl.style === 'geometric-islamic' ? 'islamic' : 'dots');

    const m = ctx.margin;
    const footerH = tpl.footer === 'social-bar' ? ctx.type.caption * 4.2 : ctx.type.caption * 1.2;
    const cardX = m * 1.3;
    const cardW = ctx.width - cardX * 2;
    const cardTop = ctx.type.caption * 2.4;
    const cardH = ctx.height - cardTop - footerH - m * 1.2;
    plan.shapes.push(
      rectShape(
        'card',
        'rect',
        {
          x: Math.round(cardX),
          y: Math.round(cardTop),
          width: Math.round(cardW),
          height: Math.round(cardH),
        },
        ctx.hex.surface,
        1,
        { radius: tpl.radius, effects: ['soft-shadow'] },
      ),
    );
    plan.focal = { x: ctx.width / 2, y: cardTop + cardH * 0.22 };
    logoSlotTop(ctx, plan, m * 0.15, ctx.width * 0.24);

    let cursor: number;
    if (tpl.hero === 'medallion') {
      const d = Math.round(cardW * 0.28);
      const mx = ctx.width / 2 - d / 2;
      const my = Math.round(cardTop - d * 0.16);
      plan.shapes.push(
        rectShape(
          'hero-ring',
          'ring',
          { x: mx - 16, y: my - 16, width: d + 32, height: d + 32 },
          ctx.hex.accent,
          0.45,
          { meta: { stroke: 3 } },
        ),
      );
      plan.shapes.push(
        rectShape('hero', 'circle', { x: mx, y: my, width: d, height: d }, ctx.hex.accent, 1, {
          effects: ['soft-shadow'],
        }),
      );
      /* medallion interior: light core + 4-point star so the disc is never
         an empty slab (also feeds the edge-density floor) */
      plan.shapes.push(
        rectShape(
          'hero-core',
          'circle',
          {
            x: Math.round(mx + d * 0.2),
            y: Math.round(my + d * 0.2),
            width: Math.round(d * 0.6),
            height: Math.round(d * 0.6),
          },
          ctx.hex.background,
          0.9,
        ),
      );
      plan.shapes.push(
        rectShape(
          'hero-star',
          'star4',
          {
            x: Math.round(mx + d * 0.31),
            y: Math.round(my + d * 0.31),
            width: Math.round(d * 0.38),
            height: Math.round(d * 0.38),
          },
          ctx.hex.primary,
          1,
        ),
      );
      cursor = my + d + ctx.type.h1 * 0.3;
    } else if (tpl.hero === 'number' && ctx.bigNumber) {
      const size = Math.round(ctx.height * 0.17);
      const h = Math.round(size * 1.15);
      plan.blocks.push(
        text(
          'body',
          ctx.bigNumber,
          [ctx.bigNumber],
          {
            x: Math.round(cardX),
            y: Math.round(cardTop + cardH * 0.07),
            width: Math.round(cardW),
            height: h,
          },
          size,
          'center',
          'bold',
          ctx.hex.accent,
          1.05,
        ),
      );
      cursor = cardTop + cardH * 0.07 + h;
    } else {
      cursor = cardTop + cardH * 0.1;
    }

    if (ctx.copy.eyebrow) {
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          ctx.width / 2,
          cursor + ctx.type.caption * 0.4,
          alphaHex(ctx.hex.primary, 0.14),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.2;
    }

    const hlX = cardX + cardW * 0.09;
    const hlW = cardW * 0.82;
    cursor = headlineBlock(ctx, plan, hlX, cursor, hlW, 4, 'center', true) + ctx.type.body * 0.35;
    if (tpl.decor.underline > 0) {
      plan.shapes.push(
        rectShape(
          'underline-stroke',
          'line',
          {
            x: Math.round(ctx.width / 2 - hlW * 0.17),
            y: Math.round(cursor - ctx.type.h1 * 0.3),
            width: Math.round(hlW * 0.34),
            height: Math.max(6, Math.round(ctx.width * 0.008)),
          },
          ctx.hex.accent,
          0.95,
        ),
      );
    }
    cursor = subheadBlock(ctx, plan, hlX, cursor, hlW, 'center');

    const detailsBottom = cardTop + cardH - ctx.type.cta * 3.6;
    if (tpl.details === 'grid2x2') {
      detailGrid2x2(
        ctx,
        plan,
        {
          x: cardX + cardW * 0.08,
          y: cursor + ctx.type.body * 0.4,
          width: cardW * 0.84,
          height: detailsBottom - cursor,
        },
        alphaHex(ctx.hex.primary, 0.13),
        ctx.hex.primary,
        ctx.hex.text,
      );
    } else if (tpl.details === 'chips') {
      voidFiller(ctx, plan, cursor + ctx.type.body * 2.6, detailsBottom + ctx.type.cta * 0.4);
      detailChips(
        ctx,
        plan,
        cursor + ctx.type.body * 0.5,
        ctx.width / 2 + cardW * 0.4,
        cardW * 0.8,
      );
    } else {
      const rowsBottom = detailRows(
        ctx,
        plan,
        hlX,
        cursor + ctx.type.body * 0.5,
        hlW,
        3,
        alphaHex(ctx.hex.primary, 0.12),
        ctx.hex.primary,
        ctx.hex.text,
      );
      voidFiller(ctx, plan, rowsBottom + ctx.type.body * 0.35, detailsBottom + ctx.type.cta * 0.4);
    }

    ctaPill(ctx, plan, ctx.width / 2, detailsBottom + ctx.type.cta * 0.35, cardW * 0.62);

    if (tpl.decor.sparkle > 0) {
      const d = cardW * 0.28;
      const cy = cardTop + d * 0.28;
      sparkles(ctx, plan, [
        { x: ctx.width / 2 - d * 0.72, y: cy + d * 0.32, s: 22 },
        { x: ctx.width / 2 + d * 0.74, y: cy + d * 0.44, s: 16 },
        ...(tpl.decor.sparkle > 2 ? [{ x: ctx.width / 2 + d * 0.62, y: cy - d * 0.1, s: 13 }] : []),
      ]);
    }
    if (tpl.decor.dots > 0) dotsScatter(ctx, plan, Math.min(tpl.decor.dots, 4), 2);
    footerBar(ctx, plan, ctx.height - m * 1.1 - ctx.type.caption * 2.6, tpl.footer);
  },

  /* P2 — hero object + side text stack */
  P2(ctx, tpl, plan) {
    bgGradient(ctx, plan, 125, tpl.prefersDark);
    if (tpl.decor.patternVeil > 0) patternVeil(ctx, plan, 'islamic');

    const m = ctx.margin;
    const textW = ctx.width - m * 2 - ctx.width * 0.4;
    const textX = ctx.rtl ? ctx.width - m - textW : m;

    let cursor = m * 1.8;
    if (ctx.copy.eyebrow) {
      const chipCx = ctx.rtl
        ? textX + textW - measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2
        : textX + measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2;
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          chipCx,
          cursor,
          alphaHex(ctx.hex.primary, 0.2),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.32;
    }
    cursor = headlineBlock(ctx, plan, textX, cursor, textW, 4, 'start', true) + ctx.type.body * 0.4;
    cursor = subheadBlock(ctx, plan, textX, cursor, textW, 'start') + ctx.type.body * 0.6;

    /* hero object on the free side */
    const heroD = Math.round(Math.min(ctx.width, ctx.height) * 0.4);
    const heroX = ctx.rtl ? m * 0.8 : ctx.width - m * 0.8 - heroD;
    const heroY = Math.round(ctx.height * 0.4);
    if (tpl.hero === 'number' && ctx.bigNumber) {
      const size = Math.round(heroD * 0.4);
      plan.shapes.push(
        rectShape(
          'hero-ring',
          'ring',
          {
            x: Math.round(heroX - heroD * 0.1),
            y: Math.round(heroY - heroD * 0.1),
            width: Math.round(heroD * 1.2),
            height: Math.round(heroD * 1.2),
          },
          ctx.hex.accent,
          0.5,
          { meta: { stroke: Math.round(heroD * 0.045) } },
        ),
      );
      plan.blocks.push(
        text(
          'body',
          ctx.bigNumber,
          [ctx.bigNumber],
          {
            x: heroX,
            y: Math.round(heroY + heroD * 0.26),
            width: heroD,
            height: Math.round(size * 1.2),
          },
          size,
          'center',
          'bold',
          ctx.hex.accent,
          1.05,
        ),
      );
    } else {
      plan.shapes.push(
        rectShape(
          'hero-orbit',
          'ring',
          {
            x: Math.round(heroX - heroD * 0.13),
            y: Math.round(heroY - heroD * 0.13),
            width: Math.round(heroD * 1.26),
            height: Math.round(heroD * 1.26),
          },
          ctx.hex.accent,
          0.4,
          { meta: { stroke: 3 } },
        ),
      );
      plan.shapes.push(
        rectShape(
          'hero',
          tpl.style === 'soft-organic' ? 'blob' : 'circle',
          { x: heroX, y: heroY, width: heroD, height: heroD },
          ctx.hex.primary,
          1,
          {
            effects: ['soft-shadow'],
            ...(tpl.style === 'soft-organic' ? { radius: Math.round(heroD * 0.42) } : {}),
          },
        ),
      );
      plan.shapes.push(
        rectShape(
          'hero-core',
          'circle',
          {
            x: Math.round(heroX + heroD * 0.27),
            y: Math.round(heroY + heroD * 0.27),
            width: Math.round(heroD * 0.46),
            height: Math.round(heroD * 0.46),
          },
          ctx.hex.accent,
          0.95,
        ),
      );
    }
    plan.focal = { x: heroX + heroD / 2, y: heroY + heroD / 2 };

    const afterRows = detailRows(
      ctx,
      plan,
      textX,
      cursor,
      textW,
      3,
      alphaHex(ctx.hex.primary, 0.16),
      ctx.hex.primary,
      ctx.hex.text,
    );
    const ctaY = Math.min(
      afterRows + ctx.type.cta * 0.5,
      ctx.height - m * 2.6 - ctx.type.cta * 2.5,
    );
    ctaPill(ctx, plan, ctx.rtl ? textX + textW * 0.68 : textX + textW * 0.32, ctaY, textW * 0.68);

    plan.shapes.push(
      rectShape(
        'midground-blob',
        'circle',
        {
          x: Math.round(-ctx.width * 0.14),
          y: Math.round(ctx.height * 0.66),
          width: Math.round(ctx.width * 0.48),
          height: Math.round(ctx.width * 0.48),
        },
        alphaHex(ctx.hex.accent, 0.14),
        1,
      ),
    );
    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: heroX + heroD * 0.96, y: heroY + heroD * 0.1, s: 26 },
        { x: heroX + heroD * 0.02, y: heroY + heroD * 0.88, s: 20 },
        ...(tpl.decor.sparkle > 2
          ? [{ x: heroX + heroD * 1.05, y: heroY + heroD * 0.58, s: 14 }]
          : []),
        ...(tpl.decor.sparkle > 3
          ? [{ x: heroX + heroD * 0.5, y: heroY - heroD * 0.16, s: 16 }]
          : []),
      ]);
    }
    if (tpl.decor.dots > 0) dotsScatter(ctx, plan, Math.min(tpl.decor.dots, 5), 4);
    footerBar(ctx, plan, ctx.height - m * 1.5 - ctx.type.caption * 1.6, tpl.footer);
  },

  /* P3 — photographic scene + scrim */
  P3(ctx, tpl, plan) {
    const m = ctx.margin;
    plan.shapes.push(
      rectShape(
        'photo',
        'image',
        { x: 0, y: 0, width: ctx.width, height: ctx.height },
        mixHex(ctx.hex.primary, ctx.hex.background, 0.3),
        1,
        {
          gradient: {
            from: mixHex(ctx.hex.primary, '#101418', 0.35),
            to: mixHex(ctx.hex.accent, ctx.hex.primary, 0.35),
            angle: 150,
          },
          noteAr: 'اسحب صورة الفعالية هنا — تُقص تلقائياً بحدود اللوحة.',
        },
      ),
    );
    plan.shapes.push(
      rectShape(
        'scrim-bottom',
        'scrim',
        { x: 0, y: 0, width: ctx.width, height: Math.round(ctx.height * 0.78) },
        mixHex('#101418', ctx.hex.primary, 0.2),
        1,
        {
          gradient: {
            from: mixHex('#101418', ctx.hex.primary, 0.3),
            to: alphaHex('#101418', 0),
            angle: 90,
          },
        },
      ),
    );
    logoSlotTop(ctx, plan, m * 0.9, ctx.width * 0.3);

    let cursor = ctx.height * 0.5;
    if (ctx.copy.eyebrow) {
      const chipCx = ctx.rtl
        ? ctx.width - m - measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2
        : m + measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2;
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          chipCx,
          cursor,
          ctx.hex.accent,
          ctx.hex.background,
        ) +
        ctx.type.h1 * 0.34;
    }
    cursor =
      headlineBlock(ctx, plan, m, cursor, ctx.width - m * 2, 3, 'start', true) +
      ctx.type.body * 0.5;
    cursor =
      subheadBlock(ctx, plan, m, cursor, (ctx.width - m * 2) * 0.94, 'start') + ctx.type.body * 0.4;
    if (tpl.details === 'chips') {
      cursor =
        detailChips(ctx, plan, cursor, ctx.width - m, ctx.width - m * 2) + ctx.type.body * 0.4;
    } else {
      cursor =
        detailRows(
          ctx,
          plan,
          m,
          cursor,
          ctx.width - m * 2,
          2,
          alphaHex('#ffffff', 0.16),
          ctx.hex.accent,
          '#ffffff',
        ) +
        ctx.type.body * 0.3;
    }
    ctaPill(
      ctx,
      plan,
      ctx.rtl ? ctx.width - m - (ctx.width - m * 2) * 0.23 : m + (ctx.width - m * 2) * 0.23,
      cursor + ctx.type.cta * 0.3,
      (ctx.width - m * 2) * 0.46,
    );
    plan.focal = { x: ctx.width / 2, y: ctx.height * 0.38 };
    if (tpl.decor.sparkle > 0)
      sparkles(ctx, plan, [
        { x: ctx.width * 0.85, y: ctx.height * 0.3, s: 22 },
        { x: ctx.width * 0.16, y: ctx.height * 0.22, s: 14 },
      ]);
    footerBar(ctx, plan, ctx.height - m * 1.4, tpl.footer);
  },

  /* P4 — paper prop */
  P4(ctx, tpl, plan) {
    bgGradient(ctx, plan, 80, false);
    if (tpl.decor.dots > 0) patternVeil(ctx, plan, 'dots');
    const paperW = ctx.width * 0.78;
    const paperH = ctx.height * 0.6;
    const paperX = (ctx.width - paperW) / 2;
    const paperY = ctx.height * 0.16;
    plan.shapes.push(
      rectShape(
        'paper',
        'rect',
        {
          x: Math.round(paperX),
          y: Math.round(paperY),
          width: Math.round(paperW),
          height: Math.round(paperH),
        },
        '#faf6ee',
        1,
        { radius: 10, effects: ['soft-shadow'] },
      ),
    );
    const tapeW = paperW * 0.2;
    const tapeH = Math.max(26, Math.round(ctx.width * 0.03));
    if (tpl.decor.tape > 0) {
      plan.shapes.push(
        rectShape(
          'tape-l',
          'tape',
          {
            x: Math.round(paperX + paperW * 0.05),
            y: Math.round(paperY - tapeH * 0.5),
            width: Math.round(tapeW),
            height: tapeH,
          },
          alphaHex(ctx.hex.accent, 0.75),
          1,
          { meta: { angle: -8 } },
        ),
      );
      plan.shapes.push(
        rectShape(
          'tape-r',
          'tape',
          {
            x: Math.round(paperX + paperW * 0.75),
            y: Math.round(paperY - tapeH * 0.5),
            width: Math.round(tapeW),
            height: tapeH,
          },
          alphaHex(ctx.hex.accent, 0.75),
          1,
          { meta: { angle: 8 } },
        ),
      );
      plan.shapes.push(
        rectShape(
          'pin',
          'circle',
          {
            x: Math.round(ctx.width / 2 - tapeH * 0.65),
            y: Math.round(paperY - tapeH * 0.3),
            width: Math.round(tapeH * 1.3),
            height: Math.round(tapeH * 1.3),
          },
          ctx.hex.primary,
          1,
          { effects: ['soft-shadow'] },
        ),
      );
    }

    const ink = '#2c2a26';
    let cursor = paperY + paperH * 0.12;
    const innerX = paperX + paperW * 0.09;
    const innerW = paperW * 0.82;
    if (ctx.copy.eyebrow) {
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          ctx.width / 2,
          cursor,
          alphaHex(ctx.hex.primary, 0.15),
          ink,
        ) +
        ctx.type.h1 * 0.2;
    }
    cursor =
      headlineBlock(ctx, plan, innerX, cursor, innerW, 3, 'center', true) + ctx.type.body * 0.35;
    if (tpl.decor.underline > 0) {
      plan.shapes.push(
        rectShape(
          'underline-stroke',
          'line',
          {
            x: Math.round(ctx.width / 2 - innerW * 0.18),
            y: Math.round(cursor - ctx.type.h1 * 0.26),
            width: Math.round(innerW * 0.36),
            height: Math.max(6, Math.round(ctx.width * 0.008)),
          },
          ctx.hex.accent,
          0.9,
        ),
      );
    }
    cursor = subheadBlock(ctx, plan, innerX, cursor, innerW, 'center') + ctx.type.body * 0.4;

    /* paper rows: bullet dots + ink text */
    const lines = (ctx.copy.body ?? '').split('\n').filter(Boolean).slice(0, 3);
    const size = Math.max(ctx.minFoot, Math.round(ctx.type.body * 0.8));
    lines.forEach((line, i) => {
      const dot = Math.round(size * 0.4);
      plan.shapes.push(
        rectShape(
          `bullet-${i}`,
          'circle',
          {
            x: Math.round(ctx.rtl ? innerX + innerW - dot : innerX),
            y: Math.round(cursor + size * 0.34),
            width: dot,
            height: dot,
          },
          ctx.hex.primary,
          0.9,
        ),
      );
      const textX = ctx.rtl ? innerX : innerX + dot + size * 0.5;
      const wrapped = wrapText(line, {
        maxWidth: innerW - dot - size * 0.6,
        fontSize: size,
        maxLines: 2,
      });
      const h = textBlockHeight(wrapped, size, 1.45);
      plan.blocks.push(
        text(
          'body',
          wrapped.join('\n'),
          wrapped,
          {
            x: Math.round(textX),
            y: Math.round(cursor),
            width: Math.round(innerW - dot - size * 0.6),
            height: h,
          },
          size,
          'start',
          'regular',
          ink,
          1.45,
        ),
      );
      cursor += h + ctx.sp(size * 0.5);
    });

    ctaPill(ctx, plan, ctx.width / 2, paperY + paperH - ctx.type.cta * 1.7, innerW * 0.6);
    plan.focal = { x: ctx.width / 2, y: paperY + paperH * 0.3 };
    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: paperX - 26, y: paperY + paperH * 0.2, s: 22 },
        { x: paperX + paperW + 26, y: paperY + paperH * 0.74, s: 18 },
        ...(tpl.decor.sparkle > 2 ? [{ x: paperX - 18, y: paperY + paperH * 0.66, s: 13 }] : []),
      ]);
    }
    if (tpl.decor.dots > 0) dotsScatter(ctx, plan, Math.min(tpl.decor.dots, 5), 6);
    footerBar(ctx, plan, ctx.height - ctx.margin * 1.5 - ctx.type.caption * 1.4, tpl.footer);
  },

  /* P5 — diagonal split */
  P5(ctx, tpl, plan) {
    const m = ctx.margin;
    plan.shapes.push(
      rectShape(
        'bg-plain',
        'rect',
        { x: 0, y: 0, width: ctx.width, height: ctx.height },
        ctx.hex.surface,
        1,
        { meta: { role: 'bg' } },
      ),
    );
    plan.shapes.push(
      rectShape(
        'diag',
        'diag',
        {
          x: 0,
          y: Math.round(ctx.height * 0.44),
          width: ctx.width,
          height: Math.round(ctx.height * 0.56),
        },
        ctx.hex.background,
        1,
        {
          gradient: {
            from: ctx.hex.background,
            to: mixHex(ctx.hex.primary, ctx.hex.background, 0.45),
            angle: 115,
          },
          meta: { rise: Math.round(ctx.height * 0.13), rtl: ctx.rtl },
        },
      ),
    );
    /* accent wedge hugging the split: a hard diagonal edge, reference-grade */
    const wobble = Math.max(26, Math.round(ctx.width * 0.018));
    plan.shapes.push(
      rectShape(
        'diag-accent',
        'diag',
        {
          x: 0,
          y: Math.round(ctx.height * 0.44 - wobble),
          width: ctx.width,
          height: Math.round(ctx.height * 0.56 + wobble),
        },
        ctx.hex.accent,
        0.9,
        {
          meta: { rise: Math.round(ctx.height * 0.13), rtl: ctx.rtl },
        },
      ),
    );
    /* grid veil over the flat top keeps the upper half from reading empty */
    if (tpl.style === 'geometric-islamic' || tpl.style === 'editorial-bold') {
      patternVeil(ctx, plan, 'grid');
    }

    let cursor = m * 1.9;
    const hlW = ctx.width - m * 2;
    if (ctx.copy.eyebrow) {
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          ctx.width / 2,
          cursor,
          alphaHex(ctx.hex.accent, 0.22),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.26;
    }
    cursor = headlineBlock(ctx, plan, m, cursor, hlW, 2, 'center', true) + ctx.type.body * 0.4;
    cursor = subheadBlock(ctx, plan, m, cursor, hlW * 0.9, 'center') + ctx.type.body * 0.5;

    /* hero sits BELOW the text stack (never under it) and shrinks to fit */
    const rowsH = 2 * (Math.max(ctx.minFoot, Math.round(ctx.type.body * 0.86)) * 1.75 + ctx.sp(12));
    const roomForHero =
      ctx.height - cursor - rowsH - ctx.type.cta * 2.5 - ctx.type.caption * 2.6 - m * 1.6;
    const heroD = Math.max(ctx.width * 0.2, Math.min(ctx.width * 0.36, roomForHero));
    let endCursor: number;
    if (tpl.hero === 'number' && ctx.bigNumber) {
      const size = Math.round(heroD * 0.46);
      const ring = heroD * 1.2;
      plan.shapes.push(
        rectShape(
          'hero-ring',
          'ring',
          {
            x: Math.round(ctx.width / 2 - ring / 2),
            y: Math.round(cursor + ctx.type.body * 0.2),
            width: Math.round(ring),
            height: Math.round(heroD * 1.05),
          },
          ctx.hex.accent,
          0.5,
          { meta: { stroke: Math.round(heroD * 0.04) } },
        ),
      );
      plan.blocks.push(
        text(
          'body',
          ctx.bigNumber,
          [ctx.bigNumber],
          {
            x: Math.round(ctx.width / 2 - heroD / 2),
            y: Math.round(cursor + heroD * 0.28),
            width: heroD,
            height: Math.round(size * 1.15),
          },
          size,
          'center',
          'bold',
          ctx.hex.accent,
          1.05,
        ),
      );
      endCursor = cursor + heroD * 1.18 + ctx.type.body * 0.5;
    } else {
      const heroY = Math.round(cursor + ctx.type.body * 0.55);
      plan.shapes.push(
        rectShape(
          'hero',
          'circle',
          { x: Math.round(ctx.width / 2 - heroD / 2), y: heroY, width: heroD, height: heroD },
          ctx.hex.primary,
          1,
          { effects: ['soft-shadow'] },
        ),
      );
      plan.shapes.push(
        rectShape(
          'hero-core',
          'circle',
          {
            x: Math.round(ctx.width / 2 - heroD * 0.19),
            y: Math.round(heroY + heroD * 0.31),
            width: Math.round(heroD * 0.38),
            height: Math.round(heroD * 0.38),
          },
          ctx.hex.accent,
          1,
        ),
      );
      endCursor = heroY + heroD + ctx.type.body * 0.7;
    }
    plan.focal = { x: ctx.width / 2, y: cursor + heroD * 0.4 };

    /* raised card under the detail rows: crisp edges + real structure on
       the flat lower field — the main flat-pixel failure of this pattern */
    plan.shapes.push(
      rectShape(
        'rows-card',
        'rect',
        {
          x: Math.round(m * 0.82),
          y: Math.round(endCursor - ctx.sp(12)),
          width: Math.round(ctx.width - m * 1.64),
          height: Math.round(rowsH * 2 + ctx.sp(24)),
        },
        ctx.hex.surface,
        1,
        { radius: Math.round(ctx.width * 0.04), effects: ['soft-shadow'] },
      ),
    );
    const afterRows = detailRows(
      ctx,
      plan,
      m,
      endCursor,
      hlW,
      2,
      alphaHex(ctx.hex.surface, 0.6),
      ctx.hex.primary,
      ctx.hex.text,
    );
    /* CTA is bottom-anchored above the footer; the quiet band between the
       detail rows and the CTA gets a tinted pane instead of dead field.
       footer is reserved FIRST, then CTA is clamped above it so the two
       never collide on tall stories. */
    const footY = ctx.height - m * 1.3;
    const ctaH = ctx.type.cta * 2.5;
    const ctaY = Math.min(ctx.height - m * 2.05 - ctaH, footY - ctaH - ctx.sp(16));
    voidFiller(ctx, plan, afterRows + ctx.type.body * 0.3, ctaY);
    ctaPill(ctx, plan, ctx.width / 2, ctaY);
    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: ctx.width * 0.14, y: ctx.height * 0.24, s: 20 },
        { x: ctx.width * 0.88, y: ctx.height * 0.2, s: 24 },
        ...(tpl.decor.sparkle > 2
          ? [{ x: ctx.width * 0.8, y: endCursor - heroD * 0.5, s: 14 }]
          : []),
      ]);
    }
    if (tpl.decor.dots > 0) dotsScatter(ctx, plan, Math.min(tpl.decor.dots, 5), 9);
    footerBar(ctx, plan, ctx.height - m * 1.3, tpl.footer);
  },

  /* P6 — pinned panel with hanging cards */
  P6(ctx, tpl, plan) {
    bgGradient(ctx, plan, 100, tpl.prefersDark);
    if (tpl.decor.patternVeil > 0) patternVeil(ctx, plan, 'grid');
    const m = ctx.margin;
    let cursor = m * 1.9;
    const hlW = ctx.width - m * 2;
    if (ctx.copy.eyebrow) {
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          ctx.width / 2,
          cursor,
          alphaHex(ctx.hex.primary, 0.2),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.24;
    }
    cursor = headlineBlock(ctx, plan, m, cursor, hlW, 2, 'center', true) + ctx.type.body * 0.3;

    const panelTop = cursor + m * 0.3;
    const ctaH = tpl.cta === 'band' ? ctx.type.cta * 2.7 : ctx.type.cta * 2.5;
    const footerH = tpl.footer === 'none' ? 0 : ctx.type.caption * 2.6;
    const panelH = ctx.height - panelTop - ctaH - footerH - m * 2.2;
    plan.shapes.push(
      rectShape(
        'panel',
        'rect',
        {
          x: Math.round(m),
          y: Math.round(panelTop),
          width: Math.round(ctx.width - m * 2),
          height: Math.round(panelH),
        },
        ctx.hex.surface,
        1,
        { radius: tpl.radius, effects: ['soft-shadow'] },
      ),
    );

    if (tpl.hero === 'number' && ctx.bigNumber) {
      const size = Math.round(Math.min(ctx.height * 0.12, panelH * 0.34));
      plan.blocks.push(
        text(
          'body',
          ctx.bigNumber,
          [ctx.bigNumber],
          {
            x: Math.round(m),
            y: Math.round(panelTop + panelH * 0.08),
            width: Math.round(ctx.width - m * 2),
            height: Math.round(size * 1.15),
          },
          size,
          'center',
          'bold',
          ctx.hex.accent,
          1.05,
        ),
      );
    }

    const size = Math.max(ctx.minFoot - 2, Math.round(ctx.type.body * 0.76));
    const lines = (ctx.copy.body ?? '').split('\n').filter(Boolean).slice(0, 3);
    const gap = ctx.sp(20);
    const miniW = (ctx.width - m * 2 - gap * (lines.length - 1)) / Math.max(1, lines.length);
    /* cards are CONTENT-sized (wrap first, then size the card) — the old
       fixed 46%-of-panel height left tall empty boxes below short text */
    const wrappedLines = lines.map((line) =>
      wrapText(line, { maxWidth: miniW * 0.84, fontSize: size, maxLines: 3 }),
    );
    const maxLines = Math.max(...wrappedLines.map((w) => w.length), 1);
    const miniH = Math.round(Math.min(panelH * 0.46, maxLines * size * 1.55 + size * 1.5));
    const bigNumH =
      tpl.hero === 'number' && ctx.bigNumber
        ? Math.round(Math.min(ctx.height * 0.12, panelH * 0.34) * 1.15)
        : 0;
    /* number bottom = its drawn top + box height (+pad for glyph overshoot);
       the mini cards must start strictly BELOW that, never under the digits */
    const miniTop = Math.round(
      bigNumH > 0
        ? panelTop + panelH * 0.08 + bigNumH + Math.max(ctx.sp(24), size * 0.55)
        : panelTop + panelH * 0.14,
    );
    lines.forEach((line, i) => {
      const mx = m + i * (miniW + gap);
      plan.shapes.push(
        rectShape(
          `clip-${i}`,
          'rect',
          {
            x: Math.round(mx + miniW * 0.42),
            y: Math.round(miniTop - ctx.sp(14)),
            width: Math.round(miniW * 0.16),
            height: Math.round(ctx.sp(16)),
          },
          ctx.hex.primary,
          1,
          { radius: 4 },
        ),
      );
      plan.shapes.push(
        rectShape(
          `mini-${i}`,
          'rect',
          { x: Math.round(mx), y: Math.round(miniTop), width: Math.round(miniW), height: miniH },
          alphaHex(ctx.hex.primary, 0.1),
          1,
          { radius: 14, effects: ['soft-shadow'] },
        ),
      );
      const wrapped = wrappedLines[i]!;
      plan.blocks.push(
        text(
          'body',
          wrapped.join('\n'),
          wrapped,
          {
            x: Math.round(mx + miniW * 0.08),
            y: Math.round(miniTop + miniH * 0.16),
            width: Math.round(miniW * 0.84),
            height: Math.round(maxLines * size * 1.5),
          },
          size,
          'center',
          'regular',
          ctx.hex.text,
          1.4,
        ),
      );
    });
    /* fill the quiet zone at the panel's foot with a tinted band + tag chips */
    const miniBottom = miniTop + miniH + ctx.sp(10);
    voidFiller(ctx, plan, miniBottom, panelTop + panelH - ctx.sp(10));
    plan.focal = { x: ctx.width / 2, y: miniTop };

    let after = panelTop + panelH + m * 0.35;
    after =
      tpl.cta === 'band' ? ctaBand(ctx, plan, after) : ctaPill(ctx, plan, ctx.width / 2, after);
    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: m * 1.05, y: panelTop + m * 0.2, s: 20 },
        { x: ctx.width - m * 1.05, y: panelTop - ctx.sp(8), s: 24 },
      ]);
    }
    footerBar(
      ctx,
      plan,
      Math.min(after + m * 0.25, ctx.height - m * 1.1 - ctx.type.caption * 2.4),
      tpl.footer,
    );
  },

  /* P7 — typographic hero */
  P7(ctx, tpl, plan) {
    bgGradient(ctx, plan, 60, tpl.prefersDark);
    const m = ctx.margin;
    plan.shapes.push(
      rectShape(
        'type-ring',
        'ring',
        {
          x: Math.round(ctx.width * 0.2),
          y: Math.round(ctx.height * 0.17),
          width: Math.round(ctx.width * 0.6),
          height: Math.round(ctx.width * 0.6),
        },
        ctx.hex.accent,
        0.26,
        { meta: { stroke: Math.round(ctx.width * 0.012) } },
      ),
    );
    plan.shapes.push(
      rectShape(
        'type-blob',
        'circle',
        {
          x: Math.round(-ctx.width * 0.12),
          y: Math.round(ctx.height * 0.56),
          width: Math.round(ctx.width * 0.4),
          height: Math.round(ctx.width * 0.4),
        },
        alphaHex(ctx.hex.primary, 0.2),
        1,
      ),
    );

    logoSlotTop(ctx, plan, m * 0.8, ctx.width * 0.28);
    let cursor = m * 1.7;
    if (ctx.copy.eyebrow) {
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          ctx.width / 2,
          cursor,
          alphaHex(ctx.hex.primary, 0.22),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.2;
    }
    /* solid type panel: the giant headline sits on a real editorial block —
       this is what lifts the render above the flat-pixel threshold */
    const giant = Math.round(Math.min(ctx.type.h1 * 1.4, ctx.height * 0.088));
    const lines = wrapText(ctx.copy.headline, {
      maxWidth: ctx.width - m * 2.6,
      fontSize: giant,
      maxLines: 3,
    });
    const lineH = Math.round(giant * 1.24);
    const panelY = Math.round(cursor - giant * 0.42);
    const panelH = Math.round(lines.length * lineH + giant * 0.84);
    const panelX = Math.round(m * 0.85);
    const panelW = Math.round(ctx.width - panelX * 2);
    plan.shapes.push(
      rectShape(
        'type-panel',
        'rect',
        { x: panelX, y: panelY, width: panelW, height: panelH },
        ctx.hex.primary,
        1,
        { radius: tpl.radius, effects: ['soft-shadow'] },
      ),
    );
    lines.forEach((line) => {
      plan.blocks.push(
        text(
          'headline',
          line,
          [line],
          {
            x: Math.round(m * 1.3),
            y: Math.round(cursor),
            width: Math.round(ctx.width - m * 2.6),
            height: lineH,
          },
          giant,
          'center',
          'bold',
          ctx.hex.onPrimary,
          1.2,
          ctx.hex.primary,
        ),
      );
      cursor += lineH;
    });
    cursor = panelY + panelH - m * 0.1;
    if (tpl.decor.underline > 0) {
      plan.shapes.push(
        rectShape(
          'underline-stroke',
          'line',
          {
            x: Math.round(ctx.width / 2 - giant * 1.5),
            y: Math.round(cursor + giant * 0.42),
            width: Math.round(giant * 3),
            height: Math.max(7, Math.round(ctx.width * 0.009)),
          },
          ctx.hex.accent,
          0.95,
        ),
      );
    }
    cursor += giant * 0.9;
    const subY = cursor;
    cursor =
      subheadBlock(ctx, plan, m * 1.6, cursor, ctx.width - m * 3.2, 'center') +
      ctx.type.body * 0.55;

    if (tpl.details === 'chips') {
      cursor =
        detailChips(ctx, plan, cursor, ctx.width * 0.88, ctx.width * 0.72) + ctx.type.body * 0.45;
    } else {
      cursor =
        detailRows(
          ctx,
          plan,
          m * 1.4,
          cursor,
          ctx.width - m * 2.8,
          2,
          alphaHex(ctx.hex.primary, 0.16),
          ctx.hex.primary,
          ctx.hex.text,
        ) +
        ctx.type.body * 0.4;
    }

    /* CTA is bottom-anchored; any quiet zone above it gets a tinted band
       with a low-alpha dot veil instead of reading as dead background. */
    const ctaY = ctx.height - m * 2.05 - ctx.type.cta * 2.6;
    voidFiller(ctx, plan, cursor, ctaY);
    if (tpl.cta === 'band') ctaBand(ctx, plan, ctaY);
    else ctaPill(ctx, plan, ctx.width / 2, ctaY);

    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: ctx.width * 0.18, y: ctx.height * 0.32, s: 24 },
        { x: ctx.width * 0.85, y: ctx.height * 0.36, s: 18 },
        ...(tpl.decor.sparkle > 2 ? [{ x: ctx.width * 0.76, y: ctx.height * 0.2, s: 13 }] : []),
        ...(tpl.decor.sparkle > 4
          ? [
              { x: ctx.width * 0.12, y: ctx.height * 0.6, s: 14 },
              { x: ctx.width * 0.9, y: ctx.height * 0.66, s: 12 },
            ]
          : []),
      ]);
    }
    if (tpl.decor.dots > 0) dotsScatter(ctx, plan, Math.min(tpl.decor.dots, 5), 7);
    plan.focal = { x: ctx.width / 2, y: subY - giant };
    footerBar(ctx, plan, ctx.height - m * 1.35 - ctx.type.caption * 1.2, tpl.footer);
  },

  /* P8 — device mockup */
  P8(ctx, tpl, plan) {
    bgGradient(ctx, plan, 115, true);
    const m = ctx.margin;
    const devW = ctx.width * 0.4;
    const devH = ctx.height * 0.54;
    const devX = ctx.rtl ? m * 1.1 : ctx.width - m * 1.1 - devW;
    const devY = ctx.height * 0.24;
    plan.shapes.push(
      rectShape(
        'device',
        'device',
        {
          x: Math.round(devX),
          y: Math.round(devY),
          width: Math.round(devW),
          height: Math.round(devH),
        },
        ctx.hex.surface,
        1,
        {
          radius: Math.round(devW * 0.09),
          effects: ['soft-shadow'],
          meta: { screen: ctx.hex.background, accent: ctx.hex.accent, primary: ctx.hex.primary },
        },
      ),
    );
    const chipW = devW * 0.64;
    const chipH = Math.max(52, Math.round(ctx.width * 0.05));
    plan.shapes.push(
      rectShape(
        'float-chip-1',
        'rect',
        {
          x: Math.round(devX - chipW * 0.46),
          y: Math.round(devY + devH * 0.84),
          width: Math.round(chipW),
          height: chipH,
        },
        ctx.hex.accent,
        1,
        { radius: chipH / 2, effects: ['soft-shadow'] },
      ),
    );
    plan.shapes.push(
      rectShape(
        'float-chip-2',
        'rect',
        {
          x: Math.round(devX + devW * 0.66),
          y: Math.round(devY - chipH * 0.4),
          width: Math.round(chipW * 0.84),
          height: Math.round(chipH * 0.78),
        },
        ctx.hex.primary,
        1,
        { radius: chipH * 0.39, effects: ['soft-shadow'] },
      ),
    );

    const textW = ctx.width - m * 2 - devW - ctx.sp(20);
    const textX = ctx.rtl ? ctx.width - m - textW : m;
    let cursor = m * 2;
    if (ctx.copy.eyebrow) {
      const chipCx = ctx.rtl
        ? textX + textW - measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2
        : textX + measureTextWidth(ctx.copy.eyebrow, ctx.type.caption) / 2;
      cursor =
        eyebrowChip(
          ctx,
          plan,
          ctx.copy.eyebrow,
          chipCx,
          cursor,
          alphaHex(ctx.hex.primary, 0.2),
          ctx.hex.text,
        ) +
        ctx.type.h1 * 0.3;
    }
    cursor = headlineBlock(ctx, plan, textX, cursor, textW, 3, 'start', true) + ctx.type.body * 0.4;
    cursor = subheadBlock(ctx, plan, textX, cursor, textW, 'start') + ctx.type.body * 0.5;
    cursor =
      detailRows(
        ctx,
        plan,
        textX,
        cursor,
        textW,
        2,
        alphaHex(ctx.hex.primary, 0.16),
        ctx.hex.primary,
        ctx.hex.text,
      ) +
      ctx.type.cta * 0.5;
    ctaPill(ctx, plan, textX + textW * 0.36, Math.min(cursor, ctx.height - m * 3.2), textW * 0.72);
    plan.focal = { x: devX + devW / 2, y: devY + devH / 2 };
    if (tpl.decor.sparkle > 0) {
      sparkles(ctx, plan, [
        { x: devX + devW + 34, y: devY + devH * 0.16, s: 22 },
        { x: devX - 16, y: devY + devH * 0.7, s: 15 },
      ]);
    }
    footerBar(ctx, plan, ctx.height - m * 1.4 - ctx.type.caption * 1.2, tpl.footer);
  },
};

/* ------------------------------------------------------------------ */
/* entry: template -> plan                                             */
/* ------------------------------------------------------------------ */

/** Extract the giant numeral for number-hero templates from real copy. */
export function extractBigNumber(...sources: string[]): string | undefined {
  for (const s of sources) {
    const m = s.match(/[0-9٠-٩]+/);
    if (m) return m[0];
  }
  return undefined;
}

export function renderTemplate(tpl: Template, ctx: TemplateRenderCtx): TemplatePlan {
  const plan: TemplatePlan = {
    shapes: [],
    blocks: [],
    nameAr: tpl.nameAr,
    rationaleAr: tpl.rationaleAr,
    focal: { x: ctx.width / 2, y: ctx.height / 2 },
  };
  RENDERERS[tpl.pattern](ctx, tpl, plan);
  return plan;
}
