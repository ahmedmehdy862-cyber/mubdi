/**
 * Typography engine — modular scales, Arabic-specific rules, and a text
 * measurement/wrapping routine that works without a canvas so layouts stay
 * deterministic and testable.
 */

export type ScaleName =
  | 'minor-second'
  | 'major-second'
  | 'minor-third'
  | 'major-third'
  | 'perfect-fourth'
  | 'augmented-fourth'
  | 'perfect-fifth'
  | 'golden';

export const TYPE_SCALES: Record<ScaleName, number> = {
  'minor-second': 1.067,
  'major-second': 1.125,
  'minor-third': 1.2,
  'major-third': 1.25,
  'perfect-fourth': 1.333,
  'augmented-fourth': 1.414,
  'perfect-fifth': 1.5,
  golden: 1.618,
};

export interface TypeScale {
  name: ScaleName;
  ratio: number;
  display: number;
  h1: number;
  h2: number;
  h3: number;
  body: number;
  caption: number;
  eyebrow: number;
  cta: number;
  /** Multipliers applied to font size to get line box height. */
  leading: { display: number; heading: number; body: number; caption: number };
}

export interface TypeScaleOptions {
  canvasMin: number;
  scale?: ScaleName;
  baseSize?: number;
  /** Floor for every level (usually the platform's minFontSize). */
  minSize?: number;
}

const round = (n: number): number => Math.round(n);

/** Modular type scale anchored to the canvas size, with Arabic legibility floors. */
export function makeTypeScale(opts: TypeScaleOptions): TypeScale {
  const name = opts.scale ?? 'major-third';
  const ratio = TYPE_SCALES[name];
  const base = opts.baseSize ?? Math.min(44, Math.max(26, opts.canvasMin * 0.03));
  const floor = opts.minSize ?? 0;
  const step = (n: number): number => round(base * Math.pow(ratio, n));
  const displayCap = round(opts.canvasMin * 0.12);
  return {
    name,
    ratio,
    display: Math.min(displayCap, Math.max(step(4), round(opts.canvasMin * 0.08))),
    h1: step(3),
    h2: step(2),
    h3: step(1),
    body: Math.max(step(0), round(opts.canvasMin * 0.026), floor),
    caption: Math.max(step(-1), floor),
    eyebrow: Math.max(round(base * 0.82), floor),
    cta: Math.max(round(base * 0.9), floor),
    leading: { display: 1.24, heading: 1.32, body: 1.62, caption: 1.45 },
  };
}

/** Hard rules that keep Arabic typography from breaking. */
export const ARABIC_TYPE_RULES = [
  {
    id: 'tracking-zero',
    rule: 'لا تضف تباعد أحرف (tracking) للنص العربي المتصل.',
    why: 'التباعد يفك اتصال الحروف ويحوّل الكلمة إلى شكل غير مقروء.',
    en: 'Never letter-space connected Arabic script.',
  },
  {
    id: 'leading-generous',
    rule: 'استخدم ارتفاع سطر 1.5–1.8 للنص العربي، و1.2–1.35 للعناوين الكبيرة.',
    why: 'التشكيل والصعود والهبوط يحتاجان مساحة رأسية أكبر من اللاتيني.',
    en: 'Use 1.5–1.8 leading for Arabic body text.',
  },
  {
    id: 'no-fake-caps',
    rule: 'لا تستخدم الأحرف الكبيرة للعربية؛ استخدم الوزن (Bold/Black) للتأكيد.',
    why: 'العربية لا تحتوي حالة أحرف، والـ uppercase أداة لاتينية فقط.',
    en: 'Use weight, not uppercase, for Arabic emphasis.',
  },
  {
    id: 'min-size',
    rule: 'لا تقلّ عن 24px على كانفس 1080، و32px على 1920.',
    why: 'الحد الأدنى للقراءة على الهاتف داخل خلاصة مزدحمة.',
    en: 'Never go below 24px at 1080 wide.',
  },
  {
    id: 'diacritics-clearance',
    rule: 'اترك هامشاً أعلى النص 0.15em على الأقل عند وجود تشكيل.',
    why: 'الفتحة والضمة تُقصّ عند ضيق صندوق النص.',
    en: 'Leave 0.15em headroom when diacritics are present.',
  },
  {
    id: 'measure',
    rule: 'اجعل سطر العنوان 16–34 حرفاً وسطر النص 30–55 حرفاً.',
    why: 'العين العربية تمسح السطر من اليمين لليسار؛ السطر الطويل يفقد التتبّع.',
    en: 'Keep headline lines 16–34 characters, body 30–55.',
  },
  {
    id: 'numerals-consistency',
    rule: 'اختر نظام أرقام واحد (١٢٣ أو 123) ولا تخلط بينهما في التصميم.',
    why: 'الخلط يربك القارئ ويُضعف الإحساس بالاحترافية.',
    en: 'Pick one numeral system per design.',
  },
  {
    id: 'alignment-rtl',
    rule: 'في التصميم العربي حاذِ النص لليمين، واعكس اتجاه التسلسل البصري.',
    why: 'محاذاة اليسار في نص عربي تُقطع بداية الجملة وتُربك القراءة.',
    en: 'Right-align Arabic text and mirror the reading flow.',
  },
] as const;

export const FONT_PAIRINGS = [
  {
    id: 'cairo-cairo',
    display: 'Cairo',
    body: 'Cairo',
    nameAr: 'كايرو / كايرو',
    noteAr: 'عائلة واحدة بأوزان متباعدة — أنظف خيار وأكثره أماناً.',
  },
  {
    id: 'cairo-almarai',
    display: 'Cairo',
    body: 'Almarai',
    nameAr: 'كايرو للعناوين / المراعي للنص',
    noteAr: 'تباين هندسي هادئ؛ العناوين قوية والنص مريح للقراءة الطويلة.',
  },
  {
    id: 'almarai-cairo',
    display: 'Almarai',
    body: 'Cairo',
    nameAr: 'المراعي للعناوين / كايرو للنص',
    noteAr: 'عنوان أكثر نعومة مع نص محايد؛ مناسب للطابع التحريري.',
  },
] as const;

/** Wide/narrow character classes tuned for Arabic-first text. */
function charWidthEm(ch: string): number {
  if (/[\u064B-\u0652\u0670\u06D6-\u06ED]/.test(ch)) return 0; // diacritics
  if (ch === ' ') return 0.28;
  if (/[\u0600-\u06FF]/.test(ch)) {
    if (/[أإآ]/.test(ch)) return 0.5;
    if (/[ىي]/.test(ch)) return 0.56;
    if (/[موس]/.test(ch)) return 0.6;
    return 0.54;
  }
  if (/[0-9]/.test(ch)) return 0.56;
  if (/[A-Z]/.test(ch)) return 0.67;
  if (/[a-z]/.test(ch)) return 0.52;
  if (/[.,،;؛:!?]/.test(ch)) return 0.26;
  if (/[-–—]/.test(ch)) return 0.4;
  return 0.5;
}

export function measureTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += charWidthEm(ch);
  return em * fontSize;
}

export interface WrapOptions {
  maxWidth: number;
  fontSize: number;
  maxLines?: number;
}

/**
 * Greedy wrap with orphan control. Returns explicit lines — the renderer and
 * the PSD writer both consume these lines, so what you see is what you get.
 */
export function wrapText(text: string, opts: WrapOptions): string[] {
  const maxWidth = Math.max(opts.fontSize * 2, opts.maxWidth);
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureTextWidth(candidate, opts.fontSize) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  // Orphan control: avoid a final line shorter than 35% of the block width.
  if (lines.length > 1) {
    const last = lines[lines.length - 1]!;
    if (measureTextWidth(last, opts.fontSize) < maxWidth * 0.35) {
      const prev = lines[lines.length - 2]!;
      const words = prev.split(' ');
      if (words.length > 2) {
        const moved = words.pop()!;
        lines[lines.length - 2] = words.join(' ');
        lines[lines.length - 1] = `${moved} ${last}`;
      }
    }
  }

  const maxLines = opts.maxLines ?? 6;
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1]!;
    kept[maxLines - 1] = last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : last;
    return kept;
  }
  return lines;
}

export function textBlockHeight(lines: string[], fontSize: number, leading: number): number {
  const count = Math.max(1, lines.length);
  return Math.round(count * fontSize * leading + fontSize * 0.18);
}

export interface HierarchyCheck {
  ok: boolean;
  levels: number[];
  ratio: number;
  messageAr: string;
}

/** A professional hierarchy shows 3–4 levels with a visible jump (>=1.25). */
export function checkHierarchy(sizes: number[]): HierarchyCheck {
  const levels = [...new Set(sizes.map((s) => Math.round(s)))].sort((a, b) => b - a);
  if (levels.length < 2) {
    return { ok: false, levels, ratio: 1, messageAr: 'لا يوجد تدرّج واضح في أحجام الخط؛ التصميم يفتقد تسلسلاً بصرياً.' };
  }
  const top = levels[0]!;
  const bottom = levels[levels.length - 1]!;
  const ratio = Number((top / bottom).toFixed(2));
  const ok = ratio >= 2 && levels.length <= 4;
  const messageAr = !ok
    ? levels.length > 4
      ? `عدد المستويات الطباعية ${levels.length} أكبر من اللازم؛ اكتفِ بـ3–4 مستويات.`
      : `الفرق بين أكبر وأصغر حجم ${ratio}× فقط؛ تحتاج تبايناً لا يقل عن 2× (الأفضل 2.5–4×).`
    : `تسلسل طباعي سليم: ${levels.length} مستويات بتباين ${ratio}×.`;
  return { ok, levels, ratio, messageAr };
}

export function fontPairingFor(id: string): (typeof FONT_PAIRINGS)[number] {
  return FONT_PAIRINGS.find((p) => p.id === id) ?? FONT_PAIRINGS[0]!;
}
