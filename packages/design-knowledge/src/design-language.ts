/**
 * Machine-readable design language extracted from the 61 approved references
 * (F:\Mubdi\resources\references — see docs/design-language.md for the full
 * analysis and contact sheets in docs/references/).
 *
 * These tokens are the shared vocabulary for templates (Q3), the asset kit
 * (Q4), typography (Q5), and the rubric (Q0/Q1). Nothing may invent a pattern
 * that is not listed here.
 */

/** P1..P8 composition patterns observed across the reference set. */
export interface LayoutPattern {
  id: string;
  nameAr: string;
  /** Share of canvas the hero/subject must occupy (min, max). */
  heroShare: [number, number];
  /** Which depth levels this pattern must include, back to front. */
  depthLevels: DepthLevel[];
  /** Distinctive elements this pattern is expected to contain. */
  signatureAr: string[];
}

export type DepthLevel =
  | 'background' // treated background: texture, gradient, rays, pattern
  | 'midground' // large shapes, glass card, colour block
  | 'hero' // 3D object / person / device / paper prop
  | 'typography' // headline + supporting text
  | 'foreground'; // sparkles, hand-drawn strokes, badges, floating icons

export const DEPTH_LEVELS: DepthLevel[] = [
  'background',
  'midground',
  'hero',
  'typography',
  'foreground',
];

export const LAYOUT_PATTERNS: LayoutPattern[] = [
  {
    id: 'P1',
    nameAr: 'البطاقة المركزية',
    heroShare: [0.6, 0.85],
    depthLevels: ['background', 'midground', 'typography', 'foreground'],
    signatureAr: [
      'بطاقة بزوايا مستديرة فوق خلفية معالَجة',
      'نقش أو أشعة في الخلفية',
      'تفاصيل داخل البطاقة بصفوف',
    ],
  },
  {
    id: 'P2',
    nameAr: 'البطل المُجسّم',
    heroShare: [0.35, 0.55],
    depthLevels: ['background', 'midground', 'hero', 'typography', 'foreground'],
    signatureAr: ['مجسم ثلاثي الأبعاد هو البطل', 'ظل لين يربطه بالأرض', 'العنوان يحتضن البطل'],
  },
  {
    id: 'P3',
    nameAr: 'المشهد الكامل',
    heroShare: [0.9, 1.0],
    depthLevels: ['background', 'hero', 'typography', 'foreground'],
    signatureAr: [
      'صورة بيئية بمعالجة لونية موحدة',
      'scrim متدرج تحت النص',
      'إضاءة سينمائية باتجاه واحد',
    ],
  },
  {
    id: 'P4',
    nameAr: 'الاستعارة الورقية',
    heroShare: [0.4, 0.65],
    depthLevels: ['background', 'hero', 'typography', 'foreground'],
    signatureAr: [
      'ورق بدبوس/مشبك/واشي تيب',
      'ملمس ورق وظل واقعي',
      'النص على الورقة لا على الخلفية',
    ],
  },
  {
    id: 'P5',
    nameAr: 'الانقسام القطري',
    heroShare: [0.3, 0.5],
    depthLevels: ['background', 'midground', 'hero', 'typography'],
    signatureAr: ['كتلة تدرج قطري', 'بطل فوق نقطة الفصل', 'نص في المنطقة الفاتحة'],
  },
  {
    id: 'P6',
    nameAr: 'اللوح المُعلَّق',
    heroShare: [0.4, 0.6],
    depthLevels: ['background', 'midground', 'hero', 'typography', 'foreground'],
    signatureAr: ['لوح أو سلك عرض', 'بطاقات معلقة بمشابك', 'زاوية خفيفة للبطاقات'],
  },
  {
    id: 'P7',
    nameAr: 'الطباعة هي البطل',
    heroShare: [0.3, 0.45],
    depthLevels: ['background', 'typography', 'hero', 'foreground'],
    signatureAr: [
      'عنوان ضخم 30-40% من الارتفاع',
      'عناصر مجسمة تتفاعل مع الحروف',
      'تلوين كلمات وخط يد',
    ],
  },
  {
    id: 'P8',
    nameAr: 'الواجهة المُحاكاة',
    heroShare: [0.35, 0.55],
    depthLevels: ['background', 'hero', 'typography', 'foreground'],
    signatureAr: [
      'إطار جهاز أو نافذة تطبيق',
      'عناصر عائمة (دردشة/أيقونات)',
      'تأثير عمق حول الجهاز',
    ],
  },
];

/** Typographic devices that recur across the references. */
export interface TypographicDevice {
  id: string;
  nameAr: string;
  /** Rendering contract for the renderer / PSD layers. */
  impl:
    'accent-word' | 'highlight-box' | 'kashida' | 'giant-number' | 'ribbon-text' | 'hand-circle';
}

export const TYPOGRAPHIC_DEVICES: TypographicDevice[] = [
  { id: 'accent-word', nameAr: 'تلوين كلمة مفتاحية', impl: 'accent-word' },
  { id: 'highlight-box', nameAr: 'بوكس هايلايتر خلف كلمة', impl: 'highlight-box' },
  { id: 'kashida', nameAr: 'كشيدة للامتداد', impl: 'kashida' },
  { id: 'giant-number', nameAr: 'أرقام عملاقة', impl: 'giant-number' },
  { id: 'ribbon-text', nameAr: 'نص على شريط', impl: 'ribbon-text' },
  { id: 'hand-circle', nameAr: 'دائرة بخط اليد', impl: 'hand-circle' },
];

/** Imagery / object treatments the pipeline must support. */
export type ImageryTreatment =
  | 'soft-3d-object' // studio-lit soft 3D object with drop shadow
  | 'cutout-person' // clean cut-out person, optionally with device mockups
  | 'environmental-photo' // full-bleed graded scene
  | 'paper-prop' // realistic paper, envelope, newspaper
  | 'holo-glass'; // translucent holographic panels / frosted glass

export const IMAGERY_TREATMENTS: ImageryTreatment[] = [
  'soft-3d-object',
  'cutout-person',
  'environmental-photo',
  'paper-prop',
  'holo-glass',
];

/** Decoration system with per-canvas budgets. */
export interface DecorationSpec {
  id: string;
  nameAr: string;
  minCount: number;
  maxCount: number;
}

export const DECORATION_SYSTEM: DecorationSpec[] = [
  { id: 'sparkle', nameAr: 'نجوم وبريق', minCount: 2, maxCount: 6 },
  { id: 'underline-stroke', nameAr: 'خط تحته بخط اليد', minCount: 1, maxCount: 2 },
  { id: 'hand-circle', nameAr: 'دوائر تأكيد بخط اليد', minCount: 0, maxCount: 3 },
  { id: 'pattern-veil', nameAr: 'نقش هندسي خلفي', minCount: 0, maxCount: 1 },
  { id: 'tape-pin-clip', nameAr: 'تثبيت ورقي', minCount: 0, maxCount: 4 },
  { id: 'icon-badge', nameAr: 'شارات بأيقونة للتفاصيل', minCount: 2, maxCount: 4 },
  { id: 'arrow-path', nameAr: 'أسهم ومسارات', minCount: 0, maxCount: 2 },
  { id: 'footer-bar', nameAr: 'شريط تواصل سفلي', minCount: 1, maxCount: 1 },
];

/** Colour role split (60/30/10) with recurring background+accent pairs. */
export interface ColorPair {
  backgroundAr: string;
  accentAr: string;
  /** Rough hex anchors sampled from the references. */
  background: string;
  accent: string;
  moodAr: string;
}

export const COLOR_PAIRS: ColorPair[] = [
  {
    backgroundAr: 'أزرق ملكي',
    accentAr: 'برتقالي',
    background: '#1e3fae',
    accent: '#f5a623',
    moodAr: 'ثقة وتعليم',
  },
  {
    backgroundAr: 'قرمزي',
    accentAr: 'أصفر/أبيض',
    background: '#b3121f',
    accent: '#ffd23f',
    moodAr: 'طاقة وإلحاح',
  },
  {
    backgroundAr: 'زمردي',
    accentAr: 'ليموني/ذهبي',
    background: '#0e6e4e',
    accent: '#cddc39',
    moodAr: 'نمو وخدمات',
  },
  {
    backgroundAr: 'بنفسجي عميق',
    accentAr: 'أصفر/زجاجي',
    background: '#5b2d8e',
    accent: '#f9c74f',
    moodAr: 'إبداع وأسئلة',
  },
  {
    backgroundAr: 'عاجي فاتح',
    accentAr: 'لون الهوية',
    background: '#f2ece4',
    accent: '#5b2d8e',
    moodAr: 'هدوء وتحرير',
  },
  {
    backgroundAr: 'تدرج أزرق عمودي',
    accentAr: 'أزرق نيون',
    background: '#0b1e6b',
    accent: '#3f8cff',
    moodAr: 'تقني وبنكي',
  },
];

export const COLOR_ROLE_SPLIT = { background: 0.6, card: 0.3, accent: 0.1 } as const;

/** Density guide measured from the references. */
export const DENSITY_GUIDE = {
  /** Total negative-space band the references occupy. */
  negativeSpace: [0.3, 0.45] as [number, number],
  /** Hero/subject share of canvas. */
  heroShare: [0.35, 0.55] as [number, number],
  /** Largest allowed connected empty region (as share of canvas). */
  maxDeadZone: 0.2,
  /** Minimum distinct meaningful visual elements. */
  minElements: 8,
  /** Minimum distinct depth levels. */
  minDepthLevels: 4,
  /** Headline height share (of canvas height). */
  headlineShare: [0.22, 0.4] as [number, number],
} as const;

/** Quality rubric weights (0-100). Deterministic part — Q0. */
export const QUALITY_RUBRIC_WEIGHTS = {
  richness: 22, // visual elements × depth levels
  content: 18, // content-pack completeness
  hierarchy: 12, // focal point + 3-level order + ratio >= 1.6
  space: 10, // negative space 25-45%, no dead zones > 20%
  typography: 12, // 2 families, Arabic shaping, leading
  color: 10, // 60/30/10 roles, AA contrast, purposeful accent
  composition: 8, // grid, balance, safe zones, no artifacts
  diversity: 8, // variant similarity <= 0.7
} as const;

/** Reference sets shipped with the product (relative to the app resources). */
export const REFERENCE_SETS = [
  {
    id: 'events',
    nameAr: 'إعلان فعالية',
    count: 6,
    contactSheet: 'docs/references/contact-events.png',
  },
  { id: 'teaser', nameAr: 'تشويقي', count: 15, contactSheet: 'docs/references/contact-teaser.png' },
  {
    id: 'social',
    nameAr: 'سوشيال عام',
    count: 33,
    contactSheet: 'docs/references/contact-social.png',
  },
  {
    id: 'angles',
    nameAr: 'زوايا التصوير',
    count: 7,
    contactSheet: 'docs/references/contact-angles.png',
  },
] as const;
