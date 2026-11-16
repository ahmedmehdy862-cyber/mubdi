/**
 * Colour theory engine.
 *
 * Everything here is deterministic and testable: harmonies are generated with
 * HSL rotations, accessibility is measured with the WCAG 2.x relative
 * luminance formula, and palettes are built so that text always clears the
 * required contrast ratio before a design is ever rendered.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export type HarmonyScheme =
  'monochromatic' | 'analogous' | 'complementary' | 'split-complementary' | 'triadic' | 'tetradic';

export interface Palette {
  mode: 'dark' | 'light';
  scheme: HarmonyScheme;
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  onPrimary: string;
  border: string;
  ramp: Record<string, string>;
  colors: string[];
}

export interface PaletteOptions {
  primary: string;
  accent?: string;
  scheme?: HarmonyScheme;
  mode?: 'dark' | 'light';
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace(/^#/, '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const safe = full.length === 8 ? full.slice(0, 6) : full.padEnd(6, '0');
  return {
    r: parseInt(safe.slice(0, 2), 16) || 0,
    g: parseInt(safe.slice(2, 4), 16) || 0,
    b: parseInt(safe.slice(4, 6), 16) || 0,
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rp: number;
  let gp: number;
  let bp: number;
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance(rgb: Rgb): number {
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two colours (1 = identical, 21 = black/white). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export function contrastHex(a: string, b: string): number {
  return contrastRatio(hexToRgb(a), hexToRgb(b));
}

/** WCAG thresholds: 4.5 body, 3.0 large text (>=24px or >=18.66px bold). */
export function requiredContrast(fontSize: number, bold: boolean): number {
  const large = fontSize >= 24 || (bold && fontSize >= 18.66);
  return large ? 3 : 4.5;
}

export function mix(a: Rgb, b: Rgb, weight: number): Rgb {
  const t = clamp(weight, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

export function lighten(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: clamp(hsl.l + amount, 0, 1) }));
}

export function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

export function saturate(hex: string, amount: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, s: clamp(hsl.s + amount, 0, 1) }));
}

export function withLightness(hex: string, l: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: clamp(l, 0, 1) }));
}

export function withSaturation(hex: string, s: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, s: clamp(s, 0, 1) }));
}

export function rotateHue(hex: string, deg: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ ...hsl, h: (hsl.h + deg + 360) % 360 }));
}

/** 50..900 tonal ramp — the backbone of every professional palette. */
export function toneRamp(baseHex: string): Record<string, string> {
  const steps: Array<[string, number]> = [
    ['50', 0.95],
    ['100', 0.9],
    ['200', 0.8],
    ['300', 0.68],
    ['400', 0.55],
    ['500', 0.44],
    ['600', 0.34],
    ['700', 0.25],
    ['800', 0.16],
    ['900', 0.1],
  ];
  const hsl = rgbToHsl(hexToRgb(baseHex));
  const out: Record<string, string> = {};
  for (const [key, l] of steps) {
    // Keep hue, taper saturation at both extremes to avoid neon or mud.
    const s = hsl.s * (l > 0.8 ? 0.55 : l < 0.2 ? 0.85 : 1);
    out[key] = rgbToHex(hslToRgb({ h: hsl.h, s: clamp(s, 0.08, 1), l }));
  }
  out['500'] = baseHex;
  return out;
}

const HARMONY_ROTATIONS: Record<HarmonyScheme, number[]> = {
  monochromatic: [0, 0, 0],
  analogous: [0, 30, -30],
  complementary: [0, 180, 0],
  'split-complementary': [0, 150, -150],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

export function harmony(baseHex: string, scheme: HarmonyScheme): string[] {
  const rotations = HARMONY_ROTATIONS[scheme];
  return rotations.map((deg, i) => {
    const hsl = rgbToHsl(hexToRgb(baseHex));
    // Slight lightness offset keeps same-hue harmonies readable side by side.
    const l = clamp(hsl.l + (i === 0 ? 0 : i % 2 === 0 ? -0.08 : 0.08), 0.12, 0.88);
    return rgbToHex(hslToRgb({ h: (hsl.h + deg + 360) % 360, s: hsl.s, l }));
  });
}

/** Adjust fg lightness until it clears `min` against bg. Returns the closest passing tone. */
export function ensureContrast(fgHex: string, bgHex: string, min = 4.5): string {
  if (contrastHex(fgHex, bgHex) >= min) return fgHex;
  const bg = hexToRgb(bgHex);
  const fg = rgbToHsl(hexToRgb(fgHex));
  const goLighter = relativeLuminance(bg) < 0.5;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate = rgbToHex(hslToRgb({ ...fg, l: goLighter ? mid : 1 - mid }));
    if (contrastHex(candidate, bgHex) >= min) {
      if (goLighter) hi = mid;
      else lo = mid;
    } else if (goLighter) lo = mid;
    else hi = mid;
  }
  const result = rgbToHex(
    hslToRgb({ ...fg, l: goLighter ? clamp(hi, 0, 1) : clamp(1 - lo, 0, 1) }),
  );
  // Fallback to pure white/black if the hue cannot reach the ratio.
  if (contrastHex(result, bgHex) < min) {
    return contrastHex('#ffffff', bgHex) >= contrastHex('#000000', bgHex) ? '#ffffff' : '#000000';
  }
  return result;
}

export function bestTextOn(bgHex: string): string {
  return contrastHex('#f8fafc', bgHex) >= contrastHex('#0b1020', bgHex) ? '#f8fafc' : '#0b1020';
}

/**
 * Build a complete, accessible palette.
 * Guarantees: bg/text >= 7, bg/textMuted >= 4.5, primary/bg >= 3, onPrimary/primary >= 4.5.
 */
export function buildPalette(opts: PaletteOptions): Palette {
  const scheme: HarmonyScheme = opts.scheme ?? 'analogous';
  const mode = opts.mode ?? 'dark';
  const primary = opts.primary;
  const hsl = rgbToHsl(hexToRgb(primary));

  const background =
    mode === 'dark'
      ? rgbToHex(hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.55, 0.12, 0.42), l: 0.085 }))
      : rgbToHex(hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.35, 0.05, 0.22), l: 0.965 }));

  const surface =
    mode === 'dark'
      ? rgbToHex(hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.5, 0.1, 0.38), l: 0.13 }))
      : rgbToHex(hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.4, 0.06, 0.25), l: 0.92 }));

  const harmonyColors = harmony(primary, scheme);
  const accentBase = opts.accent ?? harmonyColors[1] ?? rotateHue(primary, 180);

  const readablePrimary =
    contrastHex(primary, background) >= 3
      ? primary
      : lighten(ensureContrast(primary, background, 3), mode === 'dark' ? 0.04 : 0);

  const text = ensureContrast(mode === 'dark' ? '#f8fafc' : '#0b1020', background, 7);
  const textMuted = ensureContrast(
    rgbToHex(mix(hexToRgb(text), hexToRgb(background), mode === 'dark' ? 0.32 : 0.28)),
    background,
    4.5,
  );
  const onPrimary = ensureContrast(bestTextOn(readablePrimary), readablePrimary, 4.5);
  const border = rgbToHex(mix(hexToRgb(text), hexToRgb(background), 0.72));

  return {
    mode,
    scheme,
    background,
    surface,
    primary: readablePrimary,
    accent: accentBase,
    text,
    textMuted,
    onPrimary,
    border,
    ramp: toneRamp(readablePrimary),
    colors: [background, surface, readablePrimary, accentBase, text, textMuted],
  };
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** Which classic harmony best explains a set of colours? Used by the rubric. */
export function classifyPalette(hexes: string[]): { scheme: HarmonyScheme; confidence: number } {
  const hues = hexes
    .map((hex) => rgbToHsl(hexToRgb(hex)))
    .filter((hsl) => hsl.s > 0.12)
    .map((hsl) => hsl.h);
  if (hues.length < 2) return { scheme: 'monochromatic', confidence: 1 };

  // Distinct hue families (collapse near-duplicates).
  const families: number[] = [];
  for (const hue of hues) {
    if (!families.some((f) => hueDistance(f, hue) <= 14)) families.push(hue);
  }
  const base = families[0]!;
  const offsets = families
    .slice(1)
    .map((h) => hueDistance(base, h))
    .sort((a, b) => a - b);
  const tolerance = 18;
  const near = (value: number, target: number): boolean => Math.abs(value - target) <= tolerance;

  const candidates: Array<{ scheme: HarmonyScheme; ok: boolean; confidence: number }> = [
    { scheme: 'monochromatic', ok: offsets.every((o) => o <= 12), confidence: 1 },
    { scheme: 'analogous', ok: offsets.every((o) => o <= 45), confidence: 0.95 },
    { scheme: 'complementary', ok: offsets.length === 1 && near(offsets[0]!, 180), confidence: 1 },
    {
      scheme: 'split-complementary',
      ok: offsets.length >= 1 && offsets.every((o) => near(o, 150) || near(o, 210)),
      confidence: 0.9,
    },
    {
      scheme: 'triadic',
      ok: offsets.length >= 1 && offsets.every((o) => near(o, 120) || near(o, 240)),
      confidence: 0.9,
    },
    {
      scheme: 'tetradic',
      ok: offsets.length >= 1 && offsets.every((o) => near(o, 90) || near(o, 180) || near(o, 270)),
      confidence: 0.85,
    },
  ];

  const match = candidates.find((c) => c.ok);
  if (match) return { scheme: match.scheme, confidence: match.confidence };

  // No clean scheme: report the closest one by average error.
  const ideals: Array<[HarmonyScheme, number[]]> = [
    ['analogous', [0, 30]],
    ['complementary', [180]],
    ['split-complementary', [150, 210]],
    ['triadic', [120, 240]],
    ['tetradic', [90, 180, 270]],
  ];
  let bestScheme: HarmonyScheme = 'analogous';
  let bestError = Number.POSITIVE_INFINITY;
  for (const [scheme, targets] of ideals) {
    const error = offsets.reduce((acc, o) => {
      const closest = Math.min(...targets.map((t) => Math.abs(o - t)));
      return acc + closest;
    }, 0);
    if (error < bestError) {
      bestError = error;
      bestScheme = scheme;
    }
  }
  return { scheme: bestScheme, confidence: Number((1 - Math.min(1, bestError / 180)).toFixed(2)) };
}

export interface ColorPsychology {
  hex: string;
  nameAr: string;
  nameEn: string;
  meaningAr: string;
  industries: string[];
  menaNote: string;
}

/** Colour meaning that is safe to ship in Arabic-first markets. */
export const COLOR_PSYCHOLOGY: ColorPsychology[] = [
  {
    hex: '#1f7a3d',
    nameAr: 'أخضر',
    nameEn: 'Green',
    meaningAr: 'نمو، ثقة، استدامة، انتماء',
    industries: ['تعليم', 'بيئة', 'صحة', 'مجتمع'],
    menaNote: 'مرتبط إيجابياً بالخير والعطاء؛ مناسب للمبادرات والهويات الوطنية.',
  },
  {
    hex: '#c9a227',
    nameAr: 'ذهبي',
    nameEn: 'Gold',
    meaningAr: 'فخامة، احتفاء، قيمة عالية',
    industries: ['فعاليات', 'مجوهرات', 'ضيافة'],
    menaNote: 'مقبول جداً كلكنة فخامة، بشرط عدم تغطيته على مساحات ضخمة.',
  },
  {
    hex: '#1e3a8a',
    nameAr: 'أزرق',
    nameEn: 'Blue',
    meaningAr: 'ثقة، تقنية، هدوء، مؤسسية',
    industries: ['تقنية', 'مال', 'حكومة'],
    menaNote: 'لون مؤسسي آمن؛ يفضّل دفؤه بلمسة ذهبية أو تركوازية.',
  },
  {
    hex: '#b91c1c',
    nameAr: 'أحمر',
    nameEn: 'Red',
    meaningAr: 'طاقة، إلحاح، شغف',
    industries: ['بيع', 'طعام', 'رياضة'],
    menaNote: 'استخدمه بجرعات صغيرة (CTA/شارة) لأنه قد يُقرأ كتحذير.',
  },
  {
    hex: '#7c3aed',
    nameAr: 'بنفسجي',
    nameEn: 'Purple',
    meaningAr: 'إبداع، خيال، تميّز',
    industries: ['إبداع', 'تعليم', 'ترفيه'],
    menaNote: 'مناسب للجمهور الشاب؛ يوازنه الأبيض الدافئ.',
  },
  {
    hex: '#ea580c',
    nameAr: 'برتقالي',
    nameEn: 'Orange',
    meaningAr: 'حيوية، ودّ، دعوة للفعل',
    industries: ['تجارة', 'أغذية', 'مبادرات'],
    menaNote: 'قوي للـ CTA على خلفيات داكنة، وأقل نجاحاً على الأبيض البارد.',
  },
  {
    hex: '#0f766e',
    nameAr: 'تركوازي',
    nameEn: 'Teal',
    meaningAr: 'تجدّد، صفاء، حداثة',
    industries: ['صحة', 'سياحة', 'تعليم'],
    menaNote: 'يرتبط بالماء والضيافة الخليجية؛ يعمل بامتياز مع الرملي.',
  },
  {
    hex: '#0f172a',
    nameAr: 'كحلي',
    nameEn: 'Navy',
    meaningAr: 'رصانة، احترافية، عمق',
    industries: ['مؤسسي', 'تقنية', 'تعليم'],
    menaNote: 'الأساس الأكثر أماناً للتصاميم العربية الداكنة؛ يوفر تبايناً عالياً.',
  },
  {
    hex: '#f8fafc',
    nameAr: 'أبيض دافئ',
    nameEn: 'Off-white',
    meaningAr: 'نقاء، مساحة تنفّس، وضوح',
    industries: ['جميع القطاعات'],
    menaNote: 'الأبيض النقي قد يبدو بارداً؛ الأبيض المائل للكريمي أدفأ للسياق العربي.',
  },
  {
    hex: '#a16207',
    nameAr: 'رملي',
    nameEn: 'Sand',
    meaningAr: 'دفء، تراث، أرضية',
    industries: ['ثقافة', 'ضيافة', 'عقار'],
    menaNote: 'حجر أساس لهوية عربية معاصرة؛ ينسجم مع الأخضر والكحلي.',
  },
];

export function nearestColorName(hex: string): ColorPsychology {
  const target = rgbToHsl(hexToRgb(hex));
  let best = COLOR_PSYCHOLOGY[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of COLOR_PSYCHOLOGY) {
    const hsl = rgbToHsl(hexToRgb(entry.hex));
    const distance =
      hsl.l < 0.12 || hsl.l > 0.9
        ? Math.abs(target.l - hsl.l) * 180
        : hueDistance(target.h, hsl.h) + Math.abs(target.l - hsl.l) * 60;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return best;
}

export function paletteAdvice(primaryHex: string, scheme: HarmonyScheme): string {
  const info = nearestColorName(primaryHex);
  const schemeAr: Record<HarmonyScheme, string> = {
    monochromatic: 'أحادية اللون (تدرّجات فقط)',
    analogous: 'متجاورة (ألوان متقاربة على العجلة)',
    complementary: 'متكاملة (لون + مقابله)',
    'split-complementary': 'متكاملة منقسمة (أكثر توازناً من المتكاملة)',
    triadic: 'ثلاثية متساوية البعد',
    tetradic: 'رباعية (لونان متكاملان)',
  };
  return `اللوحة ${schemeAr[scheme]} مبنية على ${info.nameAr}: ${info.meaningAr}. ${info.menaNote}`;
}
