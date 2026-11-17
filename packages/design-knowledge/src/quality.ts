import type { Color, DesignSpec, Layer } from '@mubdi/schemas';
import { rgbToHsl, type Rgb } from './color.js';
import { shapeInk } from './rubric.js';
import { QUALITY_RUBRIC_WEIGHTS, DENSITY_GUIDE } from './design-language.js';

/**
 * Quality Rubric v2 — the calibrated yardstick for the recovery sprint (Q0).
 *
 * Deterministic and measurable: every number is derived from the spec's real
 * geometry, colours and content. The calibrated gates follow the sprint brief:
 *   - flat colour+text  -> capped below 40 (automatic fail)
 *   - missing content   -> capped at 45
 *   - debug artifacts   -> critical finding, capped at 62
 *   - everything green  -> 85+
 *
 * Vision-model review and pairwise reference comparison attach here in Q1.
 */

export type QSeverity = 'critical' | 'major' | 'minor' | 'pass';

export interface QFinding {
  id: string;
  category: QCategoryId;
  severity: QSeverity;
  messageAr: string;
  fixAr: string;
  measured?: number;
  threshold?: number;
}

export type QCategoryId =
  | 'richness'
  | 'content'
  | 'hierarchy'
  | 'space'
  | 'typography'
  | 'color'
  | 'composition'
  | 'diversity';

export interface QualityCategory {
  id: QCategoryId;
  nameAr: string;
  weight: number;
  score: number; // 0-100
  findings: QFinding[];
}

export interface QualityMetrics {
  elementCount: number;
  depthLevels: number;
  depthLevelIds: string[];
  heroShare: number;
  negativeSpace: number;
  deadZone: number;
  contentChecks: Record<string, boolean>;
  accentShare: number;
  backgroundShare: number;
  hierarchyRatio: number;
  fontFamilies: number;
  artifacts: number;
  safeZoneViolations: number;
}

export interface QualityEvaluation {
  score: number;
  gradeAr: string;
  pass: boolean; // >= 80 gate
  categories: QualityCategory[];
  findings: QFinding[];
  metrics: QualityMetrics;
  topWeaknessesAr: string[];
  summaryAr: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function normId(id: string): string {
  return id.replace(/-\d+$/, '');
}

function area(l: Layer): number {
  return Math.max(0, l.width) * Math.max(0, l.height);
}

/** Visible ink of a shape (frames/strokes count as strokes, not bounding boxes). */
function inkArea(l: Layer): number {
  if (l.type === 'shape') return shapeInk(l);
  return area(l);
}

function colorToRgb(c: Color | undefined): Rgb | null {
  if (!c) return null;
  return { r: c.r, g: c.g, b: c.b };
}

function rgbToHexOrNull({ r, g, b }: Rgb): string | null {
  const h = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
void rgbToHexOrNull;

function saturationOf(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b) / 255;
  const min = Math.min(c.r, c.g, c.b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function luminanceOf(c: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function contrastOf(a: Rgb, b: Rgb): number {
  const l1 = luminanceOf(a);
  const l2 = luminanceOf(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function textRunOf(layer: Layer) {
  return layer.textRuns?.[0];
}

function roleOf(layer: Layer): string {
  const role = (layer.metadata as Record<string, unknown> | undefined)?.['role'];
  if (typeof role === 'string') return role;
  return layer.name.toLowerCase();
}

/* ------------------------------------------------------------------ */
/* occupancy / dead zone                                               */
/* ------------------------------------------------------------------ */

const GX = 20;
const GY = 25;

function occupancyGrid(spec: DesignSpec, layers: Layer[]): Uint8Array {
  const grid = new Uint8Array(GX * GY);
  const cw = spec.canvas.width / GX;
  const ch = spec.canvas.height / GY;
  for (const l of layers) {
    if (l.type === 'guide' || !l.visible) continue;
    const x0 = Math.max(0, Math.floor(l.x / cw));
    const y0 = Math.max(0, Math.floor(l.y / ch));
    const x1 = Math.min(GX - 1, Math.floor((l.x + l.width - 0.01) / cw));
    const y1 = Math.min(GY - 1, Math.floor((l.y + l.height - 0.01) / ch));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) grid[gy * GX + gx] = 1;
    }
  }
  return grid;
}

function largestEmptyRegion(grid: Uint8Array): number {
  const visited = new Uint8Array(grid.length);
  let best = 0;
  const stack: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] || visited[i]) continue;
    let count = 0;
    stack.push(i);
    visited[i] = 1;
    while (stack.length) {
      const cur = stack.pop()!;
      count++;
      const cx = cur % GX;
      const cy = (cur / GX) | 0;
      const neighbours = [
        cx > 0 ? cur - 1 : -1,
        cx < GX - 1 ? cur + 1 : -1,
        cy > 0 ? cur - GX : -1,
        cy < GY - 1 ? cur + GX : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && !grid[n] && !visited[n]) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }
    best = Math.max(best, count);
  }
  return best / grid.length;
}

/* ------------------------------------------------------------------ */
/* element + depth detection                                           */
/* ------------------------------------------------------------------ */

function visualElements(
  spec: DesignSpec,
  exclude: Set<Layer>,
): { layers: Layer[]; elements: Set<string>; accents: number } {
  const canvasArea = spec.canvas.width * spec.canvas.height;
  const elements = new Set<string>();
  let accents = 0;
  const layers: Layer[] = [];
  for (const l of spec.layers) {
    if (l.type === 'guide' || !l.visible) continue;
    layers.push(l);
    if (exclude.has(l)) continue; // debug artifacts are not design elements
    if (l.type === 'background') continue;
    if (l.type === 'text') {
      elements.add(`t:${roleOf(l)}`);
      continue;
    }
    const a = inkArea(l) / canvasArea;
    if (a < 0.0008) continue; // invisible slivers do not count
    const id = normId(l.id);
    if (a < 0.02) {
      // small decorations: count the group once, extra copies count as accents
      if (!elements.has(`s:${id}`)) elements.add(`s:${id}`);
      accents++;
      continue;
    }
    elements.add(`s:${id}`);
    if ((l.metadata as Record<string, unknown> | undefined)?.['gradient']) {
      elements.add('fx:gradient');
    }
  }
  accents = Math.min(accents, 6);
  return { layers, elements, accents };
}

function detectDepth(
  spec: DesignSpec,
  layers: Layer[],
  exclude: Set<Layer>,
): { ids: string[]; heroShare: number; backgroundShare: number } {
  const canvasArea = spec.canvas.width * spec.canvas.height;
  const ids = new Set<string>();
  let heroShare = 0;
  let backgroundShare = 0;
  let bigMid = 0;
  let small = 0;
  // A hero is an element that *carries content*: a meaningful image, or a
  // block with text placed on/inside it. Decorative blobs with nothing on
  // top are midground at best — never heroes.
  const textCenters = layers
    .filter((l) => l.type === 'text' && l.visible)
    .map((l) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 }));
  const carriesText = (l: Layer) =>
    textCenters.some(
      (c) => c.x >= l.x && c.x <= l.x + l.width && c.y >= l.y && c.y <= l.y + l.height,
    );
  for (const l of layers) {
    if (exclude.has(l)) continue;
    const a = inkArea(l) / canvasArea;
    if (l.type === 'background') {
      ids.add('background');
      backgroundShare = Math.max(backgroundShare, a);
      continue;
    }
    if (l.type === 'text') {
      ids.add('typography');
      continue;
    }
    if (l.type === 'image') {
      if (a >= 0.08) {
        ids.add('hero');
        heroShare = Math.max(heroShare, a);
      }
      continue;
    }
    if (l.type === 'overlay') continue; // scrims/veils are treatment, not structure
    if (a >= 0.08 && a <= 0.8 && carriesText(l) && roleOf(l) !== 'cta-bg') {
      ids.add('hero');
      heroShare = Math.max(heroShare, a);
    } else if (a >= 0.05) {
      bigMid++;
      ids.add('midground');
    } else if (a >= 0.0008) {
      small++;
    }
  }
  if (small >= 2) ids.add('foreground');
  if (bigMid >= 1 && !ids.has('hero')) ids.add('midground');
  return { ids: [...ids], heroShare, backgroundShare };
}

/* ------------------------------------------------------------------ */
/* artifacts (debug marks leaking into the artwork)                    */
/* ------------------------------------------------------------------ */

function detectArtifacts(spec: DesignSpec, layers: Layer[]): { count: number; marks: Set<Layer> } {
  const W = spec.canvas.width;
  const H = spec.canvas.height;
  const marks = new Set<Layer>();
  const cornerHits: Layer[] = [];
  for (const l of layers) {
    if (l.type !== 'shape' || !l.visible) continue;
    const a = area(l) / (W * H);
    if (a > 0.004) continue; // only tiny marks
    const nearLeft = l.x <= W * 0.12;
    const nearRight = l.x + l.width >= W * 0.88;
    const nearTop = l.y <= H * 0.12;
    const nearBottom = l.y + l.height >= H * 0.88;
    if (!((nearLeft || nearRight) && (nearTop || nearBottom))) continue;
    const rgb = colorToRgb(l.fill);
    if (!rgb) continue;
    const sat = saturationOf(rgb);
    if (sat > 0.4) cornerHits.push(l);
  }
  // Debug handles appear symmetrically in all four corners — that symmetry is
  // the fingerprint. >= 3 saturated corner marks = selection/debug artifact.
  if (cornerHits.length >= 3) {
    for (const l of cornerHits) marks.add(l);
  }
  return { count: marks.size, marks };
}

/* ------------------------------------------------------------------ */
/* content pack coverage                                               */
/* ------------------------------------------------------------------ */

function contentChecks(spec: DesignSpec): Record<string, boolean> {
  const roles = new Set<string>();
  for (const l of spec.layers) {
    if (l.type !== 'text' || !l.visible) continue;
    roles.add(roleOf(l));
  }
  const hasImage = spec.layers.some((l) => l.type === 'image' && l.visible);
  const details =
    (roles.has('body') ? 1 : 0) +
    (roles.has('footer') ? 1 : 0) +
    (roles.has('eyebrow') ? 1 : 0) +
    (roles.has('details') ? 1 : 0);
  return {
    headline: roles.has('headline'),
    subhead: roles.has('subhead'),
    details: details >= 2,
    cta: roles.has('cta'),
    brand: roles.has('logo') || hasImage,
  };
}

/* ------------------------------------------------------------------ */
/* colour roles                                                        */
/* ------------------------------------------------------------------ */

function colourRoles(spec: DesignSpec): { backgroundShare: number; accentShare: number } {
  const canvasArea = spec.canvas.width * spec.canvas.height;
  let backgroundShare = 0;
  let accentShare = 0;
  const bgRgb = colorToRgb(spec.canvas.background);
  const bgHue = bgRgb ? rgbToHsl(bgRgb).h : -1;
  for (const l of spec.layers) {
    if (l.type === 'guide' || !l.visible) continue;
    const a = area(l) / canvasArea;
    if (l.type === 'background') {
      backgroundShare += a;
      continue;
    }
    if (l.type !== 'shape' || a < 0.005) continue;
    const rgb = colorToRgb(l.fill);
    if (!rgb) continue;
    const { h, s } = rgbToHsl(rgb);
    const sameFamily =
      bgHue >= 0 && s > 0.15 && Math.min(Math.abs(h - bgHue), 360 - Math.abs(h - bgHue)) < 30;
    const neutral = s < 0.12;
    if (!sameFamily && !neutral && a >= 0.02 && a <= 0.25) accentShare += a;
  }
  return { backgroundShare: Math.max(backgroundShare, 1), accentShare };
}

/* ------------------------------------------------------------------ */
/* main evaluation                                                     */
/* ------------------------------------------------------------------ */

function band(value: number, [lo, hi]: [number, number]): number {
  if (value >= lo && value <= hi) return 1;
  const dist = value < lo ? (lo - value) / lo : (value - hi) / hi;
  return Math.max(0, 1 - dist * 2);
}

export function evaluateQuality(
  spec: DesignSpec,
  options: { minFontSize?: number } = {},
): QualityEvaluation {
  const W = spec.canvas.width;
  const H = spec.canvas.height;
  const canvasArea = W * H;
  const findings: QFinding[] = [];
  const push = (f: QFinding) => findings.push(f);

  const artifactScan = detectArtifacts(
    spec,
    spec.layers.filter((l) => l.type !== 'guide' && l.visible !== false),
  );
  const artifacts = artifactScan.count;
  const { layers, elements, accents } = visualElements(spec, artifactScan.marks);
  const depth = detectDepth(spec, layers, artifactScan.marks);
  const content = contentChecks(spec);
  const grid = occupancyGrid(spec, layers);
  const deadZone = largestEmptyRegion(grid);
  const occupancy = grid.reduce((s, v) => s + v, 0) / grid.length;
  const negativeSpace = 1 - occupancy;
  const roles = colourRoles(spec);
  const weights = QUALITY_RUBRIC_WEIGHTS;

  /* ---- richness ---- */
  const elementCount = elements.size + Math.min(accents, 4);
  const depthCount = depth.ids.length;
  const hasImagery = layers.some(
    (l) => l.type === 'image' && area(l) / (spec.canvas.width * spec.canvas.height) >= 0.08,
  );
  const flat = !depth.ids.includes('hero') && !hasImagery;
  if (flat) {
    push({
      id: 'richness.flat',
      category: 'richness',
      severity: 'critical',
      messageAr:
        'تصميم مسطح: نص على خلفية بلون واحد بلا بطل بصري ولا صورة — رفض تلقائي وفق لغة التصميم (لا يوجد مرجع واحد بهذا الشكل).',
      fixAr: 'اختر قالباً بنمط P1-P8: بطاقة مركزية، بطل مُجسّم، استعارة ورقية… إلخ.',
    });
  }
  const richnessScore =
    Math.min(1, elementCount / DENSITY_GUIDE.minElements) * 45 +
    Math.min(1, depthCount / DENSITY_GUIDE.minDepthLevels) * 35 +
    (depth.ids.includes('hero') ? 10 : 0) +
    Math.min(1, accents / 3) * 10;
  if (elementCount < DENSITY_GUIDE.minElements) {
    push({
      id: 'richness.elements',
      category: 'richness',
      severity: elementCount < 6 ? 'critical' : 'major',
      messageAr: `العناصر المرئية ذات المعنى ${elementCount} والمطلوب ${DENSITY_GUIDE.minElements} على الأقل — التصميم يبدو فارغاً.`,
      fixAr: 'أضف بطاقة/بطل بصري/زخارف (نجوم، خطوط، نقش) وشريط تواصل سفلي.',
      measured: elementCount,
      threshold: DENSITY_GUIDE.minElements,
    });
  }
  if (depthCount < DENSITY_GUIDE.minDepthLevels) {
    push({
      id: 'richness.depth',
      category: 'richness',
      severity: depthCount < 3 ? 'critical' : 'major',
      messageAr: `مستويات العمق ${depthCount} والمطلوب ${DENSITY_GUIDE.minDepthLevels} (خلفية معالجة/وسط/بطل/طباعة/لمسات).`,
      fixAr: 'ابنِ طبقات: خلفية بنقش أو تدرج، شكل وسطي، بطل بصري بظل، ولمسات أمامية متداخلة.',
      measured: depthCount,
      threshold: DENSITY_GUIDE.minDepthLevels,
    });
  }
  if (!depth.ids.includes('hero')) {
    push({
      id: 'richness.hero',
      category: 'richness',
      severity: 'major',
      messageAr: 'لا يوجد بطل بصري (مجسم/صورة/بطاقة رئيسية) يشغل 12% أو أكثر من اللوحة.',
      fixAr: 'أضف عنصراً بطلاً وفق أحد الأنماط الثمانية (P1-P8).',
      measured: depth.heroShare,
      threshold: 0.12,
    });
  }

  /* ---- content ---- */
  const missingContent = Object.entries(content).filter(([, ok]) => !ok);
  for (const [key] of missingContent) {
    const critical = key === 'headline' || key === 'cta' || key === 'brand';
    push({
      id: `content.${key}`,
      category: 'content',
      severity: critical ? 'critical' : 'major',
      messageAr: `عنصر المحتوى «${key}» مفقود — الباك المحتوى غير مكتمل.`,
      fixAr: 'أضف العنصر كطبقة نصية حقيقية (placeholder قابل للتحرير إن كانت المعلومة غير معروفة).',
    });
  }

  /* ---- hierarchy ---- */
  const sizes = layers
    .filter((l) => l.type === 'text')
    .map((l) => textRunOf(l)?.size ?? 0)
    .filter((s) => s > 0)
    .sort((a, b) => b - a);
  const hierarchyRatio = sizes.length >= 2 ? sizes[0]! / sizes[sizes.length - 1]! : 0;
  let hierarchyScore = 0;
  const distinctSizes = new Set(sizes.map((s) => Math.round(s / 4)));
  hierarchyScore += distinctSizes.size >= 3 ? 45 : distinctSizes.size === 2 ? 25 : 0;
  hierarchyScore += hierarchyRatio >= 1.6 ? 30 : Math.max(0, (hierarchyRatio / 1.6) * 30);
  const focalDominant = sizes.length >= 2 ? sizes[0]! / sizes[1]! >= 1.25 : false;
  hierarchyScore += focalDominant ? 25 : 0;
  if (distinctSizes.size < 3) {
    push({
      id: 'hierarchy.levels',
      category: 'hierarchy',
      severity: 'major',
      messageAr: `مستويات القراءة ${distinctSizes.size} والمطلوب 3 على الأقل (عنوان/فرعي/تفاصيل).`,
      fixAr: 'أضف عنواناً فرعياً وتفاصيل بأحجام مميزة: العنوان >= 1.6× الفرعي >= 1.6× التفاصيل.',
      measured: distinctSizes.size,
      threshold: 3,
    });
  }

  /* ---- space ---- */
  let spaceScore = band(negativeSpace, DENSITY_GUIDE.negativeSpace as [number, number]) * 55;
  spaceScore += (1 - Math.min(1, deadZone / DENSITY_GUIDE.maxDeadZone)) * 45;
  if (deadZone > DENSITY_GUIDE.maxDeadZone) {
    push({
      id: 'space.deadzone',
      category: 'space',
      severity: deadZone > 0.3 ? 'critical' : 'major',
      messageAr: `فراغ ميت متصل يشغل ${(deadZone * 100).toFixed(0)}% من اللوحة (الحد ${(DENSITY_GUIDE.maxDeadZone * 100).toFixed(0)}%).`,
      fixAr: 'املأ الفراغ بزخارف أو بطاقة تفاصيل أو نجوم — الفراغ يجب أن يكون حول البطل.',
      measured: deadZone,
      threshold: DENSITY_GUIDE.maxDeadZone,
    });
  }

  /* ---- typography ---- */
  const textLayers = layers.filter((l) => l.type === 'text');
  const families = new Set(textLayers.map((l) => (textRunOf(l)?.font ?? '').replace(/-Bold$/, '')));
  const fontFamilies = families.size;
  let typoScore = fontFamilies <= 2 ? 35 : 0;
  const hasBold = textLayers.some((l) => textRunOf(l)?.bold);
  const hasRegular = textLayers.some((l) => !textRunOf(l)?.bold);
  if (hasBold && hasRegular) typoScore += 20;
  const trackingsOk = textLayers.every((l) => (textRunOf(l)?.tracking ?? 0) === 0);
  if (trackingsOk) typoScore += 20;
  const leadings = textLayers.map((l) => textRunOf(l)?.leading ?? 1.4);
  const leadingOk = leadings.every((v) => v >= 1.3 && v <= 1.8);
  if (leadingOk) typoScore += 15;
  const minSize = Math.min(...(sizes.length ? sizes : [0]));
  const floor = options.minFontSize ?? 22;
  if (minSize >= floor) typoScore += 10;
  if (!trackingsOk) {
    push({
      id: 'typography.tracking',
      category: 'typography',
      severity: 'critical',
      messageAr: 'تباعد أحرف غير صفري يكسر تشكيل الحروف العربية.',
      fixAr: 'اجعل tracking = 0 لكل النصوص العربية.',
    });
  }
  if (fontFamilies > 2) {
    push({
      id: 'typography.families',
      category: 'typography',
      severity: 'minor',
      messageAr: `عدد العائلات الخطية ${fontFamilies} والحد 2.`,
      fixAr: 'قلّل إلى عائلتين: خط عرض للعناوين وخط نص.',
      measured: fontFamilies,
      threshold: 2,
    });
  }

  /* ---- colour ---- */
  let colourScore = 0;
  const bgTextLayers = textLayers.filter((l) => l.visible);
  let minContrast = 21;
  for (const l of bgTextLayers) {
    const run = textRunOf(l);
    if (!run) continue;
    const bgFill =
      l.id === 'cta' || roleOf(l) === 'cta'
        ? layers.find((s) => s.id === 'cta-bg')?.fill
        : spec.layers.find((s) => s.type === 'background')?.fill;
    const frgb = colorToRgb(run.color);
    const brgb = colorToRgb(bgFill ?? spec.canvas.background);
    if (frgb && brgb) minContrast = Math.min(minContrast, contrastOf(frgb, brgb));
  }
  colourScore += minContrast >= 4.5 ? 40 : minContrast >= 3 ? 25 : 0;
  const accentInBand = roles.accentShare > 0.015 && roles.accentShare <= 0.22;
  colourScore += accentInBand ? 25 : 12;
  const hueCount = new Set(
    layers
      .filter((l) => l.type === 'shape' && l.visible && area(l) / canvasArea > 0.004)
      .map((l) => {
        const rgb = colorToRgb(l.fill);
        return rgb ? Math.round(rgbToHsl(rgb).h / 45) : -1;
      })
      .filter((h) => h >= 0),
  ).size;
  colourScore += hueCount <= 4 ? 20 : 8;
  colourScore += roles.backgroundShare >= 0.85 ? 15 : 5;
  if (!accentInBand) {
    push({
      id: 'color.accent',
      category: 'color',
      severity: 'minor',
      messageAr: `نسبة اللون المميز ${(roles.accentShare * 100).toFixed(0)}% خارج النطاق المطلوب (2-20%).`,
      fixAr: 'اجعل اللون المميز نادراً ومقصوداً: كلمة مفتاحية وأيقونات فقط.',
      measured: roles.accentShare,
    });
  }

  /* ---- composition ---- */
  const safe = { top: 0, right: 0, bottom: 0, left: 0 };
  let safeViolations = 0;
  for (const l of textLayers) {
    if (
      l.x < safe.left ||
      l.y < safe.top ||
      l.x + l.width > W - safe.right ||
      l.y + l.height > H - safe.bottom
    ) {
      safeViolations++;
    }
  }
  let compScore = 100;
  if (artifacts > 0) {
    compScore -= 60;
    push({
      id: 'composition.artifacts',
      category: 'composition',
      severity: 'critical',
      messageAr: `${artifacts} علامة تشبه مقابض التحرير/الأدوات داخل العمل الفني — يجب ألا تظهر أبداً في التصدير.`,
      fixAr: 'احذف العلامات الصغيرة المشبعة في الزوايا؛ مقابض التحديد للواجهة فقط.',
      measured: artifacts,
      threshold: 0,
    });
  }
  if (safeViolations > 0) compScore -= 40;
  compScore = Math.max(0, compScore);
  if (safeViolations > 0) {
    push({
      id: 'composition.safeZones',
      category: 'composition',
      severity: 'major',
      messageAr: `${safeViolations} طبقة نصية تخترق هوامش اللوحة.`,
      fixAr: 'أعد الكتل داخل الهامش الآمن.',
      measured: safeViolations,
      threshold: 0,
    });
  }

  /* ---- assemble categories ---- */
  const categories: QualityCategory[] = [
    {
      id: 'richness',
      nameAr: 'الثراء البصري والعمق',
      weight: weights.richness,
      score: Math.round(flat ? Math.min(richnessScore, 15) : richnessScore),
      findings: [],
    },
    {
      id: 'content',
      nameAr: 'اكتمال المحتوى',
      weight: weights.content,
      score: Math.round((Object.values(content).filter(Boolean).length / 5) * 100),
      findings: [],
    },
    {
      id: 'hierarchy',
      nameAr: 'التسلسل البصري',
      weight: weights.hierarchy,
      score: Math.round(Math.min(100, hierarchyScore)),
      findings: [],
    },
    {
      id: 'space',
      nameAr: 'الفراغ والكثافة',
      weight: weights.space,
      score: Math.round(spaceScore),
      findings: [],
    },
    {
      id: 'typography',
      nameAr: 'الطباعة',
      weight: weights.typography,
      score: Math.round(typoScore),
      findings: [],
    },
    {
      id: 'color',
      nameAr: 'اللون',
      weight: weights.color,
      score: Math.round(colourScore),
      findings: [],
    },
    {
      id: 'composition',
      nameAr: 'التكوين والنظافة',
      weight: weights.composition,
      score: Math.round(compScore),
      findings: [],
    },
    { id: 'diversity', nameAr: 'تنوّع النسخ', weight: weights.diversity, score: 100, findings: [] },
  ];

  let score = categories.reduce((s, c) => s + (c.weight / 100) * c.score, 0);

  /* ---- gates ---- */
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const majors = findings.filter((f) => f.severity === 'major').length;
  if (flat) score = Math.min(score, 38);
  if (!content.headline || !content.cta || !content.brand) score = Math.min(score, 45);
  if (criticalCount >= 2) score = Math.min(score, 55);
  else if (criticalCount === 1) score = Math.min(score, 62);
  else if (majors >= 3) score = Math.min(score, 74);
  score = Math.round(score);

  for (const f of findings) {
    const cat = categories.find((c) => c.id === f.category);
    if (cat) cat.findings.push(f);
  }

  const gradeAr =
    score >= 95
      ? 'احترافي مرجعي'
      : score >= 85
        ? 'احترافي'
        : score >= 80
          ? 'جيد جداً'
          : score >= 70
            ? 'جيد'
            : score >= 55
              ? 'ضعيف'
              : 'مرفوض';

  const sorted = [...categories].sort((a, b) => a.score - b.score);
  const topWeaknessesAr = sorted.slice(0, 2).map((c) => {
    const fix = c.findings.find((f) => f.severity !== 'pass')?.fixAr;
    return `${c.nameAr} (${c.score}/100)${fix ? ` — ${fix}` : ''}`;
  });

  return {
    score,
    gradeAr,
    pass: score >= 80 && criticalCount === 0,
    categories,
    findings,
    metrics: {
      elementCount,
      depthLevels: depthCount,
      depthLevelIds: depth.ids,
      heroShare: depth.heroShare,
      negativeSpace,
      deadZone,
      contentChecks: content,
      accentShare: roles.accentShare,
      backgroundShare: roles.backgroundShare,
      hierarchyRatio,
      fontFamilies,
      artifacts,
      safeZoneViolations: safeViolations,
    },
    topWeaknessesAr,
    summaryAr:
      score >= 80
        ? `التصميم يجتاز بوابة الجودة (${score}/100 — ${gradeAr}).`
        : `التصميم لا يجتاز بوابة الجودة (${score}/100 — ${gradeAr}). أهم ضعفين: ${topWeaknessesAr.join('؛ ')}.`,
  };
}

/* ------------------------------------------------------------------ */
/* variant diversity                                                   */
/* ------------------------------------------------------------------ */

function textBucket(spec: DesignSpec, l: Layer): string {
  const bx = Math.min(2, Math.max(0, Math.floor((l.x + l.width / 2) / (spec.canvas.width / 3))));
  const by = Math.min(3, Math.max(0, Math.floor((l.y + l.height / 2) / (spec.canvas.height / 4))));
  return `${bx},${by}`;
}

function hueFamily(c: Color | undefined): number {
  const rgb = colorToRgb(c);
  if (!rgb) return -1;
  const { h, s } = rgbToHsl(rgb);
  return s < 0.12 ? -1 : Math.round(h / 45);
}

/**
 * Layout similarity between two variants (0 = identical, 1 = unrelated).
 * Compares text placement, shape layout, palette families and typography.
 * Similarity > 0.7 fails the diversity gate.
 */
export function variantSimilarity(a: DesignSpec, b: DesignSpec): number {
  const hist = (spec: DesignSpec) => {
    const m = new Map<string, number>();
    for (const l of spec.layers) {
      if (l.type === 'text' && l.visible) {
        const k = textBucket(spec, l);
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return m;
  };
  const histDist = (ha: Map<string, number>, hb: Map<string, number>) => {
    const keys = new Set([...ha.keys(), ...hb.keys()]);
    let diff = 0;
    let total = 0;
    for (const k of keys) {
      diff += Math.abs((ha.get(k) ?? 0) - (hb.get(k) ?? 0));
      total += (ha.get(k) ?? 0) + (hb.get(k) ?? 0);
    }
    return total === 0 ? 1 : diff / total;
  };
  const shapeSig = (spec: DesignSpec) =>
    spec.layers
      .filter(
        (l) =>
          (l.type === 'shape' || l.type === 'image') &&
          l.visible &&
          area(l) > 0.001 * spec.canvas.width * spec.canvas.height,
      )
      .map(
        (l) =>
          `${textBucket(spec, l)}:${Math.round((area(l) / spec.canvas.width / spec.canvas.height) * 10)}`,
      )
      .sort()
      .join('|');
  const shapeDist = (sa: string, sb: string) => {
    const A = new Set(sa.split('|').filter(Boolean));
    const B = new Set(sb.split('|').filter(Boolean));
    if (A.size + B.size === 0) return 1;
    let common = 0;
    for (const k of A) if (B.has(k)) common++;
    return 1 - common / Math.max(A.size, B.size);
  };
  const paletteSig = (spec: DesignSpec) =>
    new Set(
      spec.layers
        .filter((l) => l.type === 'shape' && l.visible)
        .map((l) => hueFamily(l.fill))
        .filter((h) => h >= 0),
    );
  const paletteDist = (pa: Set<number>, pb: Set<number>) => {
    const all = new Set([...pa, ...pb]);
    if (all.size === 0) return 1;
    let common = 0;
    for (const h of pa) if (pb.has(h)) common++;
    return 1 - common / all.size;
  };
  const fontSig = (spec: DesignSpec) =>
    new Set(
      spec.layers
        .filter((l) => l.type === 'text')
        .map(
          (l) =>
            `${textRunOf(l)?.font?.replace(/-Bold$/, '')}:${Math.round((textRunOf(l)?.size ?? 0) / 12)}`,
        ),
    );
  const setDist = (sa: Set<string>, sb: Set<string>) => {
    const all = new Set([...sa, ...sb]);
    if (all.size === 0) return 1;
    let common = 0;
    for (const k of sa) if (sb.has(k)) common++;
    return 1 - common / all.size;
  };

  const textD = histDist(hist(a), hist(b));
  const shapeD = shapeDist(shapeSig(a), shapeSig(b));
  const paletteD = paletteDist(paletteSig(a), paletteSig(b));
  const fontD = setDist(fontSig(a), fontSig(b));
  const similarity = 1 - (0.4 * textD + 0.3 * shapeD + 0.15 * paletteD + 0.15 * fontD);
  return Math.max(0, Math.min(1, similarity));
}

/** Evaluate a variant set: each variant + pairwise diversity findings. */
export function evaluateVariantSetQuality(
  specs: DesignSpec[],
  options: { minFontSize?: number } = {},
): QualityEvaluation[] {
  const evaluations = specs.map((s) => evaluateQuality(s, options));
  const weights = QUALITY_RUBRIC_WEIGHTS;
  for (let i = 0; i < specs.length; i++) {
    for (let j = i + 1; j < specs.length; j++) {
      const sim = variantSimilarity(specs[i]!, specs[j]!);
      if (sim > 0.7) {
        for (const [target, other] of [
          [evaluations[i]!, j],
          [evaluations[j]!, i],
        ] as const) {
          const cat = target.categories.find((c) => c.id === 'diversity')!;
          cat.score = 20;
          const finding: QFinding = {
            id: 'diversity.similarity',
            category: 'diversity',
            severity: 'critical',
            messageAr: `النسخة متشابهة جداً مع النسخة ${other + 1} (تشابه تكويني ${(sim * 100).toFixed(0)}% — الحد 70%).`,
            fixAr: 'اختر قالباً/نمطاً تكوينياً مختلفاً ولون خلفية مختلف العائلة.',
            measured: sim,
            threshold: 0.7,
          };
          cat.findings.push(finding);
          target.findings.push(finding);
          target.score = Math.round(
            target.categories.reduce((s, c) => s + (weights[c.id] / 100) * c.score, 0),
          );
          const criticalCount = target.findings.filter((f) => f.severity === 'critical').length;
          if (criticalCount >= 2) target.score = Math.min(target.score, 55);
          else if (criticalCount >= 1) target.score = Math.min(target.score, 62);
          target.pass = target.score >= 80 && criticalCount === 0;
          target.gradeAr =
            target.score >= 95
              ? 'احترافي مرجعي'
              : target.score >= 85
                ? 'احترافي'
                : target.score >= 80
                  ? 'جيد جداً'
                  : target.score >= 70
                    ? 'جيد'
                    : target.score >= 55
                      ? 'ضعيف'
                      : 'مرفوض';
          target.topWeaknessesAr = [...target.categories]
            .sort((x, y) => x.score - y.score)
            .slice(0, 2)
            .map(
              (c) =>
                `${c.nameAr} (${c.score}/100)${c.findings[0] ? ` — ${c.findings[0].fixAr}` : ''}`,
            );
          target.summaryAr =
            target.score >= 80
              ? `التصميم يجتاز بوابة الجودة (${target.score}/100 — ${target.gradeAr}).`
              : `التصميم لا يجتاز بوابة الجودة (${target.score}/100 — ${target.gradeAr}). أهم ضعفين: ${target.topWeaknessesAr.join('؛ ')}.`;
        }
      }
    }
  }
  return evaluations;
}

/** Convenience: flat "text on colour" reference spec used for calibration. */
export function isFlatDesign(metrics: QualityMetrics): boolean {
  return metrics.elementCount < 5 && metrics.depthLevels <= 2;
}

/** Layers fingerprinted as selection/debug handles (corner marks). */
export function artifactMarks(spec: DesignSpec): Layer[] {
  const visible = spec.layers.filter((l) => l.type !== 'guide' && l.visible);
  return [...detectArtifacts(spec, visible).marks];
}

/**
 * Remove fingerprinted debug artifacts from a spec. Safe for already-clean
 * specs (returns the same spec object when nothing matches).
 */
export function stripArtifacts(spec: DesignSpec): { spec: DesignSpec; removed: number } {
  const marks = artifactMarks(spec);
  if (marks.length === 0) return { spec, removed: 0 };
  const ids = new Set(marks.map((m) => m.id));
  return {
    spec: { ...spec, layers: spec.layers.filter((l) => !ids.has(l.id)) },
    removed: marks.length,
  };
}

/**
 * Recompute score / pass / grade / weaknesses from the current categories and
 * findings. Used by the calibrated reviewer after appending new findings, so
 * gates stay enforced no matter who added them.
 */
export function finalizeQuality(evaluation: QualityEvaluation, passGate = 80): void {
  const weights = QUALITY_RUBRIC_WEIGHTS;
  evaluation.score = Math.round(
    evaluation.categories.reduce((s, c) => s + (weights[c.id] / 100) * c.score, 0),
  );
  const criticalCount = evaluation.findings.filter((f) => f.severity === 'critical').length;
  const majors = evaluation.findings.filter((f) => f.severity === 'major').length;
  const flat = evaluation.findings.some((f) => f.id === 'richness.flat' || f.id === 'pixel.flat');
  const contentBroken =
    !Object.values(evaluation.metrics.contentChecks).every(Boolean) &&
    ['headline', 'cta', 'brand'].some((k) => !evaluation.metrics.contentChecks[k]);
  if (flat) evaluation.score = Math.min(evaluation.score, 38);
  if (contentBroken) evaluation.score = Math.min(evaluation.score, 45);
  if (criticalCount >= 2) evaluation.score = Math.min(evaluation.score, 55);
  else if (criticalCount === 1) evaluation.score = Math.min(evaluation.score, 62);
  else if (majors >= 3) evaluation.score = Math.min(evaluation.score, 74);
  evaluation.score = Math.round(evaluation.score);
  evaluation.pass = evaluation.score >= passGate && criticalCount === 0;
  evaluation.gradeAr =
    evaluation.score >= 95
      ? 'احترافي مرجعي'
      : evaluation.score >= 85
        ? 'احترافي'
        : evaluation.score >= passGate
          ? 'جيد جداً'
          : evaluation.score >= 70
            ? 'جيد'
            : evaluation.score >= 55
              ? 'ضعيف'
              : 'مرفوض';
  evaluation.topWeaknessesAr = [...evaluation.categories]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((c) => `${c.nameAr} (${c.score}/100)${c.findings[0] ? ` — ${c.findings[0].fixAr}` : ''}`);
  evaluation.summaryAr =
    evaluation.score >= passGate
      ? `التصميم يجتاز بوابة الجودة (${evaluation.score}/100 — ${evaluation.gradeAr}).`
      : `التصميم لا يجتاز بوابة الجودة (${evaluation.score}/100 — ${evaluation.gradeAr}). أهم ضعفين: ${evaluation.topWeaknessesAr.join('؛ ')}.`;
}
