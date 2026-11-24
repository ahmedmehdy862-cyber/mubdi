import type { Color, DesignBrief, DesignSpec, Layer } from '@mubdi/schemas';
import { checkHierarchy, measureTextWidth } from './typography.js';
import {
  classifyPalette,
  contrastRatio,
  hexToRgb,
  requiredContrast,
  rgbToHex,
  rgbToHsl,
  type Rgb,
} from './color.js';
import { isOnGrid, makeGrid, SPACING_SCALE } from './grid.js';

/**
 * Measurable design criticism. Every number below is derived from the actual
 * spec geometry and colours (not from vibes), so the same report can be shown
 * to a user, stored for analytics, or fed back into an auto-fix loop.
 */

export type Severity = 'critical' | 'major' | 'minor' | 'info';

export interface Finding {
  id: string;
  category: CategoryId;
  severity: Severity;
  messageAr: string;
  messageEn: string;
  fixAr: string;
  principleId: string;
  layerId?: string;
  measured?: number;
  threshold?: number;
}

export type CategoryId =
  | 'contrast'
  | 'hierarchy'
  | 'spacing'
  | 'alignment'
  | 'balance'
  | 'density'
  | 'typography'
  | 'color'
  | 'platform';

export interface CategoryResult {
  id: CategoryId;
  nameAr: string;
  weight: number;
  score: number;
  findings: Finding[];
}

export interface DesignMetrics {
  minContrast: number;
  contrastOk: boolean;
  hierarchyRatio: number;
  hierarchyLevels: number;
  spacingOnGrid: number;
  alignmentEdges: number;
  balanceOffset: number;
  density: number;
  /** Total ink (text + shapes) / canvas — the `density.ink` handbook measure. */
  ink: number;
  colorCount: number;
  fontCount: number;
  safeZoneViolations: number;
}

export interface Evaluation {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  gradeAr: string;
  categories: CategoryResult[];
  findings: Finding[];
  metrics: DesignMetrics;
  strengthsAr: string[];
  improvementsAr: string[];
  summaryAr: string;
}

export interface RubricPreset {
  id?: string;
  width: number;
  height: number;
  margins?: number;
  minFontSize?: number;
  safeZones: { top: number; right: number; bottom: number; left: number };
}

const WEIGHTS: Array<{ id: CategoryId; nameAr: string; weight: number }> = [
  { id: 'contrast', nameAr: 'التباين والقراءة', weight: 18 },
  { id: 'hierarchy', nameAr: 'التسلسل البصري', weight: 15 },
  { id: 'spacing', nameAr: 'الإيقاع والمسافات', weight: 12 },
  { id: 'alignment', nameAr: 'المحاذاة والشبكة', weight: 12 },
  { id: 'balance', nameAr: 'التوازن', weight: 10 },
  { id: 'density', nameAr: 'الفراغ والكثافة', weight: 8 },
  { id: 'typography', nameAr: 'الطباعة', weight: 8 },
  { id: 'color', nameAr: 'اللون', weight: 10 },
  { id: 'platform', nameAr: 'المنصة والإنتاج', weight: 7 },
];

export const RUBRIC_WEIGHTS = WEIGHTS;

const PENALTY: Record<Severity, number> = { critical: 34, major: 18, minor: 8, info: 2 };

function colorHex(c: Color): string {
  return rgbToHex({ r: c.r, g: c.g, b: c.b });
}

function blend(a: Rgb, b: Rgb, alpha: number): Rgb {
  return {
    r: Math.round(a.r * alpha + b.r * (1 - alpha)),
    g: Math.round(a.g * alpha + b.g * (1 - alpha)),
    b: Math.round(a.b * alpha + b.b * (1 - alpha)),
  };
}

export function textLayers(spec: DesignSpec): Layer[] {
  return spec.layers.filter((l) => l.type === 'text' && Boolean(l.textRuns?.[0]));
}

/**
 * Visible ink of a shape. Frames and rules are strokes, not filled rectangles:
 * counting their bounding box would claim the whole canvas is covered.
 */
export function shapeInk(l: Layer): number {
  const kind = typeof l.metadata?.['shape'] === 'string' ? (l.metadata['shape'] as string) : 'rect';
  if (kind === 'frame') {
    const thickness = Math.max(2, Math.round(Math.min(l.width, l.height) * 0.004));
    return 2 * (l.width + l.height) * thickness;
  }
  if (kind === 'line') return l.width * Math.max(1, l.height);
  return l.width * l.height;
}

export function fontSizeOf(layer: Layer): number {
  return layer.textRuns?.[0]?.size ?? 0;
}

/** Colour a viewer actually sees behind a layer (handles overlap + opacity). */
export function effectiveBackground(spec: DesignSpec, layer: Layer): string {
  const base = hexToRgb(colorHex(spec.canvas.background));
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const candidates = spec.layers
    .filter((l) => l.visible !== false && l.z < layer.z && l.type !== 'text' && l.fill)
    .filter((l) => cx >= l.x && cx <= l.x + l.width && cy >= l.y && cy <= l.y + l.height)
    .sort((a, b) => b.z - a.z);
  const top = candidates[0];
  if (!top?.fill) return colorHex(spec.canvas.background);
  const gradient = top.metadata['gradient'] as { from?: Color } | undefined;
  const fill = gradient?.from ?? top.fill;
  const overlay = hexToRgb(colorHex(fill));
  return rgbToHex(blend(overlay, base, Math.min(1, Math.max(0, top.opacity))));
}

function severityFor(ratio: number, required: number): Severity {
  if (ratio < required * 0.75) return 'critical';
  if (ratio < required) return 'major';
  return 'info';
}

function pushFinding(list: Finding[], f: Finding): void {
  list.push(f);
}

function categoryScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) score -= PENALTY[f.severity];
  return Math.max(0, Math.min(100, score));
}

export function evaluateDesign(
  spec: DesignSpec,
  brief: DesignBrief,
  preset: RubricPreset,
): Evaluation {
  const findings: Finding[] = [];
  const texts = textLayers(spec);
  const headline = texts.find((l) => l.name === 'HEADLINE');
  const margins =
    preset.margins ?? Math.round(Math.min(spec.canvas.width, spec.canvas.height) * 0.06);
  const minFontSize = preset.minFontSize ?? 22;
  const grid = makeGrid({
    width: spec.canvas.width,
    height: spec.canvas.height,
    margin: margins,
    rtl: brief.direction !== 'ltr',
  });

  // ---------------------------------------------------------------- contrast
  let minContrast = 99;
  for (const layer of texts) {
    const run = layer.textRuns![0]!;
    const bg = effectiveBackground(spec, layer);
    const ratio = Number(contrastRatio(hexToRgb(colorHex(run.color)), hexToRgb(bg)).toFixed(2));
    minContrast = Math.min(minContrast, ratio);
    const required = requiredContrast(run.size, run.bold);
    if (ratio < required) {
      pushFinding(findings, {
        id: 'contrast.text',
        category: 'contrast',
        severity: severityFor(ratio, required),
        messageAr: `تباين النص «${layer.name}» ${ratio}:1 وهو أقل من الحد المطلوب ${required}:1.`,
        messageEn: `Text "${layer.name}" contrast is ${ratio}:1, below the ${required}:1 requirement.`,
        fixAr: 'غيّر لون النص أو أضف تعتيماً خلفه حتى يصل التباين إلى الحد الأدنى.',
        principleId: 'contrast',
        layerId: layer.id,
        measured: ratio,
        threshold: required,
      });
    }
  }
  if (minContrast === 99) minContrast = 0;

  // --------------------------------------------------------------- hierarchy
  const sizes = texts.filter((l) => l.name !== 'LOGO').map((l) => fontSizeOf(l));
  const hierarchy = checkHierarchy(sizes);
  if (!hierarchy.ok) {
    pushFinding(findings, {
      id: 'hierarchy.ratio',
      category: 'hierarchy',
      severity: sizes.length < 2 ? 'critical' : 'major',
      messageAr: hierarchy.messageAr,
      messageEn: 'Hierarchy needs 3–4 levels with at least a 2× jump from body to headline.',
      fixAr: 'كبّر العنوان أو صغّر النص الثانوي حتى يصبح الفرق 2.5–4×.',
      principleId: 'hierarchy',
      measured: hierarchy.ratio,
      threshold: 2,
    });
  }
  if (headline && sizes.length > 1) {
    const maxSize = Math.max(...sizes);
    if (fontSizeOf(headline) < maxSize - 0.5) {
      pushFinding(findings, {
        id: 'hierarchy.headline',
        category: 'hierarchy',
        severity: 'major',
        messageAr: 'العنوان الرئيسي ليس أكبر عنصر نصي؛ هناك عنصر ينافسه على البؤرة.',
        messageEn: 'The headline is not the largest text element.',
        fixAr: 'كبّر HEADLINE إلى أعلى درجة في المقياس الطباعي.',
        principleId: 'hierarchy',
        layerId: headline.id,
      });
    }
    const maxCount = sizes.filter((s) => Math.abs(s - maxSize) < 0.5).length;
    if (maxCount > 1) {
      pushFinding(findings, {
        id: 'hierarchy.competition',
        category: 'hierarchy',
        severity: 'minor',
        messageAr: `يوجد ${maxCount} عناصر بنفس أكبر حجم؛ البؤرة غير حاسمة.`,
        messageEn: `${maxCount} elements share the largest size; the focal point is ambiguous.`,
        fixAr: 'اجعل عنصراً واحداً فقط في أعلى درجة، وخفّض الباقي درجة.',
        principleId: 'hierarchy',
      });
    }
  }

  // ------------------------------------------------------------------ spacing
  const sorted = [...texts].sort((a, b) => a.y - b.y);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    const gap = next.y - (prev.y + prev.height);
    // A gap wider than 96px is a deliberate section break, not rhythm spacing:
    // empty space between a header cluster and a footer is intentional.
    if (gap >= 0 && gap <= 96) gaps.push(Math.round(gap));
  }
  const offScale = gaps.filter((g) => !SPACING_SCALE.some((s) => Math.abs(s - g) <= 3));
  if (gaps.length > 0 && offScale.length / gaps.length > 0.34) {
    pushFinding(findings, {
      id: 'spacing.scale',
      category: 'spacing',
      severity: 'minor',
      messageAr: `المسافات بين الكتل لا تتبع مقياساً ثابتاً (${offScale.slice(0, 3).join('، ')}px خارج المقياس).`,
      messageEn: `Block gaps are off the spacing scale (${offScale.slice(0, 3).join(', ')}px).`,
      fixAr:
        'استخدم 8/16/24/32/48 فقط بين الكتل، وثبّت المسافة داخل المجموعة أصغر من المسافة بين المجموعات.',
      principleId: 'proximity',
      measured: Number((offScale.length / gaps.length).toFixed(2)),
      threshold: 0.34,
    });
  }
  const yOffGrid = texts.filter((l) => !isOnGrid(l.y, 4, 1.5)).length;
  if (texts.length > 0 && yOffGrid / texts.length > 0.7) {
    pushFinding(findings, {
      id: 'spacing.baseline',
      category: 'spacing',
      severity: 'info',
      messageAr: 'معظم الكتل خارج شبكة الـ 8 نقاط؛ الإيقاع الرأسي غير منتظم.',
      messageEn: 'Most blocks are off the 8pt grid; vertical rhythm is inconsistent.',
      fixAr: 'قرّب مواضع الكتل إلى مضاعفات 8.',
      principleId: 'grid-8pt',
      measured: Number((yOffGrid / texts.length).toFixed(2)),
    });
  }

  // ---------------------------------------------------------------- alignment
  // Alignment is measured against meaningful anchors only: the content
  // margins, the grid columns, the centre axis, and edges shared by at least
  // two text blocks. A lone off-grid edge is a problem; an intentional offset
  // that repeats on siblings is a system.
  // Centred blocks are judged by their centre axis, not by their leading edge:
  // three centred blocks of different widths are perfectly aligned.
  const leadingEdge = (l: Layer): number => {
    const align = typeof l.metadata?.['align'] === 'string' ? (l.metadata['align'] as string) : '';
    if (align === 'center') return l.x + l.width / 2;
    return brief.direction === 'ltr' ? l.x : l.x + l.width;
  };
  const bucket = (v: number): number => Math.round(v / 4) * 4;
  const edges = new Set<number>(texts.map((l) => bucket(leadingEdge(l))));
  if (edges.size > 3) {
    pushFinding(findings, {
      id: 'alignment.edges',
      category: 'alignment',
      severity: 'minor',
      messageAr: `النص يتمحور على ${edges.size} حواف مختلفة؛ المحاذاة مشتّتة.`,
      messageEn: `Text uses ${edges.size} different alignment edges.`,
      fixAr: 'قلّل المحاذاة إلى حافتين كحد أقصى (بداية + وسط).',
      principleId: 'alignment',
      measured: edges.size,
      threshold: 3,
    });
  }
  const sharedEdges = new Map<number, number>();
  for (const l of texts) {
    for (const value of [l.x, l.x + l.width]) {
      const edge = bucket(value);
      sharedEdges.set(edge, (sharedEdges.get(edge) ?? 0) + 1);
    }
  }
  const anchors = new Set<number>([
    bucket(grid.content.x),
    bucket(grid.content.x + grid.content.width),
    bucket(grid.content.x + grid.content.width / 2),
    bucket(spec.canvas.width / 2),
    ...grid.physical.map((c) => bucket(c.x)),
    ...grid.physical.map((c) => bucket(c.x + c.width)),
  ]);
  for (const [edge, count] of sharedEdges) {
    if (count >= 2) anchors.add(edge);
  }
  const aligned = texts.filter((l) =>
    [l.x, l.x + l.width, l.x + l.width / 2].some((value) =>
      [...anchors].some((edge) => Math.abs(edge - bucket(value)) <= 3),
    ),
  ).length;
  if (texts.length > 0 && aligned / texts.length < 0.6) {
    pushFinding(findings, {
      id: 'alignment.grid',
      category: 'alignment',
      severity: 'major',
      messageAr: 'أقل من نصف العناصر النصية محاذاة على أعمدة الشبكة أو الهامش.',
      messageEn: 'Fewer than half of text layers align to grid columns or margins.',
      fixAr: 'حاذِ الكتل على أعمدة الشبكة الـ12 أو على الهامش.',
      principleId: 'alignment',
      measured: Number((aligned / texts.length).toFixed(2)),
    });
  }

  // ------------------------------------------------------------------ balance
  const bgRgb = hexToRgb(colorHex(spec.canvas.background));
  let weightSum = 0;
  let cxSum = 0;
  let cySum = 0;
  for (const l of spec.layers) {
    if (l.visible === false || l.type === 'guide') continue;
    const fill = l.fill
      ? hexToRgb(colorHex(l.fill))
      : l.textRuns?.[0]
        ? hexToRgb(colorHex(l.textRuns[0].color))
        : { r: 128, g: 128, b: 128 };
    const diff = contrastRatio(fill, bgRgb);
    const weight =
      Math.pow(l.width * l.height, 0.85) * Math.max(0.05, l.opacity) * Math.min(3, diff);
    weightSum += weight;
    cxSum += (l.x + l.width / 2) * weight;
    cySum += (l.y + l.height / 2) * weight;
  }
  const cx = weightSum ? cxSum / weightSum / spec.canvas.width : 0.5;
  const cy = weightSum ? cySum / weightSum / spec.canvas.height : 0.5;
  const balanceOffset = Number(Math.hypot(cx - 0.5, cy - 0.5).toFixed(3));
  if (balanceOffset > 0.18) {
    pushFinding(findings, {
      id: 'balance.centroid',
      category: 'balance',
      severity: 'major',
      messageAr: `مركز الثقل البصري بعيد عن المركز بمسافة ${Math.round(balanceOffset * 100)}% من الإطار.`,
      messageEn: `Visual weight centroid is ${Math.round(balanceOffset * 100)}% away from the frame centre.`,
      fixAr: 'أضف عنصراً معاكساً في الجهة المقابلة أو انقل الكتلة الثقيلة إلى المركز.',
      principleId: 'balance',
      measured: balanceOffset,
      threshold: 0.18,
    });
  }

  // ------------------------------------------------------------------ density
  // Measure *text ink*, not bounding boxes: a full-width column box with a
  // short headline is not 40% of the frame. Glyph advance × line height is the
  // closest deterministic proxy without rasterising the spec.
  const canvasArea = spec.canvas.width * spec.canvas.height;
  let textInk = 0;
  for (const l of texts) {
    const run = l.textRuns![0]!;
    const leading = run.leading ?? 1.45;
    for (const line of run.text.split('\n')) {
      textInk += measureTextWidth(line, run.size) * run.size * leading;
    }
  }
  const density = Number(Math.min(1, textInk / canvasArea).toFixed(3));
  if (density > 0.4) {
    pushFinding(findings, {
      id: 'density.text',
      category: 'density',
      severity: density > 0.55 ? 'major' : 'minor',
      messageAr: `كثافة النص ${Math.round(density * 100)}% من الإطار — التصميم مزدحم.`,
      messageEn: `Text covers ${Math.round(density * 100)}% of the frame.`,
      fixAr: 'اختصر النص أو قلّل عدد الأسطر أو كبّر الفراغ حول الكتل.',
      principleId: 'white-space',
      measured: density,
      threshold: 0.4,
    });
  }
  const shapeArea = spec.layers
    .filter(
      (l) =>
        l.type !== 'text' && l.type !== 'guide' && l.type !== 'background' && l.visible !== false,
    )
    .reduce((sum, l) => sum + shapeInk(l) * l.opacity, 0);
  const inkRatio = Math.min(1, (textInk + shapeArea) / canvasArea);
  if (inkRatio > 0.85) {
    pushFinding(findings, {
      id: 'density.ink',
      category: 'density',
      severity: 'minor',
      messageAr: 'لا توجد مساحة سلبية كافية؛ العين لا تجد مكاناً للراحة.',
      messageEn: 'Not enough negative space for the eye to rest.',
      fixAr: 'قلّل مساحة الأشكال الخلفية واترك 25–40% فراغاً.',
      principleId: 'white-space',
      measured: Number(inkRatio.toFixed(2)),
    });
  }

  // --------------------------------------------------------------- typography
  const minSize = Math.max(minFontSize, 20);
  for (const l of texts) {
    const run = l.textRuns![0]!;
    if (run.size < minSize) {
      pushFinding(findings, {
        id: 'typography.minSize',
        category: 'typography',
        severity: run.size < minSize * 0.8 ? 'major' : 'minor',
        messageAr: `حجم الخط في «${l.name}» ${run.size}px أقل من الحد الأدنى ${minSize}px.`,
        messageEn: `${l.name} is ${run.size}px, below the ${minSize}px minimum.`,
        fixAr: 'ارفع الحجم إلى الحد الأدنى المقروء على الهاتف.',
        principleId: 'arabic-flow',
        layerId: l.id,
        measured: run.size,
        threshold: minSize,
      });
    }
    if (run.direction === 'rtl' && run.tracking !== 0) {
      pushFinding(findings, {
        id: 'typography.tracking',
        category: 'typography',
        severity: 'critical',
        messageAr: `«${l.name}» يستخدم تباعد أحرف ${run.tracking} على نص عربي متصل — يكسر تشكيل الحروف.`,
        messageEn: `${l.name} uses ${run.tracking} tracking on connected Arabic script.`,
        fixAr: 'اجعل tracking = 0 لكل نص عربي.',
        principleId: 'arabic-flow',
        layerId: l.id,
        measured: run.tracking,
        threshold: 0,
      });
    }
    const lines = run.text.split('\n');
    if (lines.length > 5) {
      pushFinding(findings, {
        id: 'typography.lines',
        category: 'typography',
        severity: 'minor',
        messageAr: `«${l.name}» يمتد على ${lines.length} أسطر؛ يصعب مسحه بصرياً.`,
        messageEn: `${l.name} runs ${lines.length} lines.`,
        fixAr: 'اختصر النص إلى 3–4 أسطر كحد أقصى.',
        principleId: 'measure',
        layerId: l.id,
      });
    }
    const longest = Math.max(...lines.map((line) => line.length));
    const isHeadline = l.name === 'HEADLINE';
    const maxChars = isHeadline ? 40 : 65;
    if (longest > maxChars) {
      pushFinding(findings, {
        id: 'typography.measure',
        category: 'typography',
        severity: 'minor',
        messageAr: `أطول سطر في «${l.name}» ${longest} حرفاً — أطول من الحد المريح ${maxChars}.`,
        messageEn: `Longest line in ${l.name} is ${longest} characters (max ${maxChars}).`,
        fixAr: 'قلّل عرض صندوق النص أو أضف كسراً يدوياً.',
        principleId: 'measure',
        layerId: l.id,
        measured: longest,
        threshold: maxChars,
      });
    }
  }
  const fonts = new Set(texts.map((l) => l.textRuns![0]!.font.replace('-Bold', '')));
  if (fonts.size > 2) {
    pushFinding(findings, {
      id: 'typography.fonts',
      category: 'typography',
      severity: 'minor',
      messageAr: `التصميم يستخدم ${fonts.size} عائلات خطية؛ الاتساق يحتاج عائلتين كحد أقصى.`,
      messageEn: `Design uses ${fonts.size} font families.`,
      fixAr: 'وحّد العائلات: واحدة للعناوين وواحدة للنص.',
      principleId: 'repetition',
      measured: fonts.size,
      threshold: 2,
    });
  }

  // -------------------------------------------------------------------- colour
  // Count colours the way a designer does: distinct hue families plus the
  // neutral system (one dark, one light). A surface tint that is 8% away from
  // the background is not a "sixth colour".
  const colorSet = new Set<string>();
  for (const l of spec.layers) {
    if (l.fill) colorSet.add(colorHex(l.fill));
    if (l.textRuns) for (const r of l.textRuns) colorSet.add(colorHex(r.color));
  }
  const neutralBands = new Set<number>();
  const hueBuckets = new Map<number, string>();
  for (const hex of colorSet) {
    const hsl = rgbToHsl(hexToRgb(hex));
    if (hsl.s < 0.15 || hsl.l < 0.12 || hsl.l > 0.9) {
      neutralBands.add(hsl.l < 0.35 ? 0 : 1);
      continue;
    }
    const key = Math.round(hsl.h / 24) % 15;
    if (!hueBuckets.has(key)) hueBuckets.set(key, hex);
  }
  const chromatic = [...hueBuckets.values()];
  const colorCount = chromatic.length + neutralBands.size;
  if (colorCount > 5) {
    pushFinding(findings, {
      id: 'color.count',
      category: 'color',
      severity: colorCount > 8 ? 'major' : 'minor',
      messageAr: `اللوحة تحتوي ${colorCount} لوناً؛ الحد الاحترافي 3–5.`,
      messageEn: `Palette has ${colorCount} colours; professional range is 3–5.`,
      fixAr: 'احتفظ بالخلفية + لون أساسي + لكنة + أبيض/رمادي، واحذف الباقي.',
      principleId: 'repetition',
      measured: colorCount,
      threshold: 5,
    });
  }
  if (chromatic.length >= 2) {
    const harmony = classifyPalette(chromatic);
    if (harmony.confidence < 0.6) {
      pushFinding(findings, {
        id: 'color.harmony',
        category: 'color',
        severity: 'minor',
        messageAr: 'الألوان المشبعة لا تتبع علاقة لونية واضحة على العجلة.',
        messageEn: 'Chromatic colours do not follow a clear harmony relation.',
        fixAr: 'اختر نظاماً واحداً: متجاورة أو متكاملة أو ثلاثية، والتزم به.',
        principleId: 'color-harmony',
        measured: harmony.confidence,
        threshold: 0.6,
      });
    }
  }
  const accentShare =
    spec.layers
      .filter((l) => l.fill && l.type !== 'background' && l.visible !== false)
      .filter((l) => {
        const hsl = rgbToHsl(hexToRgb(colorHex(l.fill!)));
        return hsl.s >= 0.2 && hsl.l > 0.12 && hsl.l < 0.9;
      })
      .reduce((sum, l) => sum + shapeInk(l) * l.opacity, 0) / canvasArea;
  if (accentShare > 0.28) {
    pushFinding(findings, {
      id: 'color.accentShare',
      category: 'color',
      severity: 'minor',
      messageAr: `الأشكال الملونة تغطي ${Math.round(accentShare * 100)}% من الإطار؛ اللون المميز يفقد قيمته.`,
      messageEn: `Coloured shapes cover ${Math.round(accentShare * 100)}% of the frame.`,
      fixAr: 'قلّل مساحة الأشكال الملوّنة إلى أقل من 20% واترك الخلفية تتنفس.',
      principleId: 'accent-scarcity',
      measured: Number(accentShare.toFixed(2)),
    });
  }

  // ---------------------------------------------------------------- platform
  let safeViolations = 0;
  for (const l of texts) {
    if (
      l.y < preset.safeZones.top - 1 ||
      l.y + l.height > preset.height - preset.safeZones.bottom + 1 ||
      l.x < preset.safeZones.left - 1 ||
      l.x + l.width > preset.width - preset.safeZones.right + 1
    ) {
      safeViolations++;
      pushFinding(findings, {
        id: 'platform.safeZone',
        category: 'platform',
        severity: 'major',
        messageAr: `«${l.name}» يدخل مساحة محجوزة بواجهة المنصة.`,
        messageEn: `${l.name} enters a platform safe zone.`,
        fixAr: 'أعد توزيع الكتل داخل المستطيل الآمن للـ preset.',
        principleId: 'safe-zones',
        layerId: l.id,
      });
    }
  }
  const marginViolations = spec.layers.filter(
    (l) =>
      l.visible !== false &&
      l.type !== 'guide' &&
      l.type !== 'background' &&
      (l.x < margins - 2 || l.x + l.width > spec.canvas.width - margins + 2),
  ).length;
  if (marginViolations > 0) {
    pushFinding(findings, {
      id: 'platform.margins',
      category: 'platform',
      severity: 'minor',
      messageAr: `${marginViolations} عنصراً يخرج عن هامش ${margins}px.`,
      messageEn: `${marginViolations} layers break the ${margins}px margin.`,
      fixAr: 'أعد العناصر داخل الهامش الآمن.',
      principleId: 'white-space',
      measured: marginViolations,
    });
  }
  if (!spec.layers.some((l) => l.name === 'LOGO' || l.id === 'logo')) {
    pushFinding(findings, {
      id: 'platform.logo',
      category: 'platform',
      severity: 'minor',
      messageAr: 'لا يوجد شعار في التصميم؛ العلامة لن تُعرَف عند إعادة النشر.',
      messageEn: 'No logo layer present.',
      fixAr: 'أضف الشعار أعلى بداية القراءة مع مساحة أمان حوله.',
      principleId: 'brand-consistency',
    });
  }

  // ---------------------------------------------------------------- assembly
  const categories: CategoryResult[] = WEIGHTS.map((w) => {
    const catFindings = findings.filter((f) => f.category === w.id);
    return {
      id: w.id,
      nameAr: w.nameAr,
      weight: w.weight,
      score: categoryScore(catFindings),
      findings: catFindings,
    };
  });
  // A weighted average alone lets one critical failure hide behind nine clean
  // categories. A critical must cap the grade: a design that is unreadable is
  // not "excellent" because its spacing is nice.
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const majorCount = findings.filter((f) => f.severity === 'major').length;
  let score = Math.round(categories.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0));
  if (criticalCount >= 2) score = Math.min(score, 62);
  else if (criticalCount === 1) score = Math.min(score, 79);
  else if (majorCount >= 3) score = Math.min(score, 84);
  const grade =
    score >= 95
      ? 'A+'
      : score >= 90
        ? 'A'
        : score >= 80
          ? 'B'
          : score >= 70
            ? 'C'
            : score >= 60
              ? 'D'
              : 'F';
  const gradeAr =
    score >= 95
      ? 'احترافي'
      : score >= 90
        ? 'ممتاز'
        : score >= 80
          ? 'جيد جداً'
          : score >= 70
            ? 'جيد'
            : score >= 60
              ? 'مقبول'
              : 'يحتاج مراجعة';

  const sortedCats = [...categories].sort((a, b) => b.score - a.score);
  const strengthsAr = sortedCats
    .slice(0, 3)
    .filter((c) => c.score >= 85)
    .map((c) => `${c.nameAr}: ${c.score}/100`);
  const improvementsAr = [...findings]
    .sort((a, b) => PENALTY[b.severity] - PENALTY[a.severity])
    .slice(0, 5)
    .map((f) => f.fixAr);

  const summaryAr =
    findings.length === 0
      ? `التصميم متوازن على كل المعايير (${score}/100 — ${gradeAr}).`
      : `التقييم ${score}/100 (${gradeAr}) — ${criticalCount} مشكلة حرجة و${majorCount} رئيسية. أهم تحسين: ${improvementsAr[0] ?? 'لا شيء'}${criticalCount > 0 ? ' (سقف الدرجة مفعّل بسبب مشكلة حرجة)' : ''}`;

  return {
    score,
    grade,
    gradeAr,
    categories,
    findings,
    metrics: {
      minContrast,
      contrastOk: !findings.some((f) => f.category === 'contrast'),
      hierarchyRatio: hierarchy.ratio,
      hierarchyLevels: hierarchy.levels.length,
      spacingOnGrid: gaps.length ? Number((1 - offScale.length / gaps.length).toFixed(2)) : 1,
      alignmentEdges: edges.size,
      balanceOffset,
      density,
      ink: inkRatio,
      colorCount,
      fontCount: fonts.size,
      safeZoneViolations: safeViolations,
    },
    strengthsAr,
    improvementsAr,
    summaryAr,
  };
}

export function formatEvaluation(evaluation: Evaluation): string {
  const head = `النتيجة: ${evaluation.score}/100 (${evaluation.gradeAr})`;
  const cats = evaluation.categories.map((c) => `- ${c.nameAr}: ${c.score}/100`).join('\n');
  const findings = evaluation.findings.length
    ? evaluation.findings.map((f) => `• [${f.severity}] ${f.messageAr} → ${f.fixAr}`).join('\n')
    : '• لا ملاحظات.';
  return `${head}\n${cats}\n\n${findings}`;
}
