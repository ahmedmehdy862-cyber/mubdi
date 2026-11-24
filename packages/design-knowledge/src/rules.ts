/**
 * P0-5 — `ruleGates`: تشغيل قواعد handbook وقت التوليد، قبل القبول.
 *
 * كل قاعدة تحمل `measure` تُحوَّل إلى بوابة قياس فعلية على الـspec:
 *
 *   - `pending:*`        → status `pending` (مسجّلة في PROJECT_STATE.md، لا تُشغَّل).
 *   - `rubric.*` + ids   → من `evaluateDesign` نفسه (findings + metrics + score).
 *   - `pixel.edge`       → يُحقن من `calibratedReview` (opts.pixelEdge) — الوحيد الذي يحتاج رسمًا.
 *   - `surface.separation` و`collision.probe.*` → هندسة/لون خالص على الـspec، بلا رسم.
 *   - `tests.logoCarriesBrandName` و`rationaleAr.nonEmpty` → تُحقن من الناتج المولّد.
 *
 * contract: لا يُمرَّر قياس بصمت — ما لا يمكن قياسه يعود `unavailable`
 * بدل `pass` كاذب، والاختبار يرفض أي قياسًا غير `pending:` لم يُشغَّل.
 */
import type { Color, DesignBrief, DesignSpec, Layer } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';
import { colorDistance, rgbToHex } from './color.js';
import {
  evaluateDesign,
  type DesignMetrics,
  type Evaluation,
  type Finding,
  type RubricPreset,
} from './rubric.js';

export type GateStatus = 'pass' | 'fail' | 'pending' | 'unavailable';

export interface RuleGate {
  ruleId: string;
  domain: string;
  measure: string;
  status: GateStatus;
  /** القيمة المقاسة فعلياً (عدد الـfindings أو metric أو قياس خاص). */
  value?: number;
  /** العتبة المكتوبة في measure (بعد تحليل `floor` إلى حد المنصة). */
  threshold?: number;
  detailAr?: string;
}

/** الشكل الأدنى من قاعدة handbook — لا حاجة لتحميل الملف داخل الحزمة. */
export interface HandbookMeasureRule {
  id: string;
  domain: string;
  measure: string;
}

export interface RuleGatesOptions {
  /** preset الـrubric؛ يُشتق من منصة الـspec عند غيابه (نفس منطق resolvePreset). */
  preset?: RubricPreset;
  /** كثافة الحواف من calibratedReview — لقياس `pixel.edge`. */
  pixelEdge?: number;
  /** اسم العلامة الذي يحمله الشعار — لقياس `tests.logoCarriesBrandName`. */
  brandName?: string;
  /** مبرر النسخة المولّدة — لقياس `rationaleAr.nonEmpty`. */
  rationaleAr?: string;
}

export interface RuleGatesResult {
  gates: RuleGate[];
  evaluation: Evaluation;
  passed: number;
  failed: number;
  pending: number;
  unavailable: number;
}

type MetricKey = Exclude<keyof DesignMetrics, 'contrastOk'>;

/** مقاييس handbook التي تقابلها metric حقيقي متاح دائماً في Evaluation. */
const METRIC_ALIASES: Record<string, MetricKey> = {
  'hierarchy.ratio': 'hierarchyRatio',
  'spacing.scale': 'spacingOnGrid',
  'alignment.edges': 'alignmentEdges',
  'balance.centroid': 'balanceOffset',
  'color.count': 'colorCount',
  'platform.safeZone': 'safeZoneViolations',
  'density.ink': 'ink',
  'density.text': 'density',
};

/** ids التي يبنيها evaluateDesign فعلاً — أي مسار آخر = measure غير موصول. */
const KNOWN_FINDINGS = new Set<string>([
  'contrast.text',
  'hierarchy.ratio',
  'hierarchy.headline',
  'hierarchy.competition',
  'spacing.scale',
  'spacing.baseline',
  'alignment.edges',
  'alignment.grid',
  'balance.centroid',
  'density.text',
  'density.ink',
  'typography.minSize',
  'typography.tracking',
  'typography.lines',
  'typography.measure',
  'typography.fonts',
  'color.count',
  'color.harmony',
  'color.accentShare',
  'platform.safeZone',
  'platform.margins',
  'platform.logo',
]);

/** قياسات خاصة تُشتق من الـspec مباشرة (بلا finding ولا metric). */
const SPECIAL_PATHS = new Set([
  'pixel.edge',
  'surface.separation',
  'collision.probe.crossings',
  'collision.probe.logoText',
]);

const TERM_RE = /^([a-zA-Z][\w.]*)\s*(==|>=|<=|>|<)?\s*(\S+)?$/;

interface Ctx {
  spec: DesignSpec;
  opts: RuleGatesOptions;
  preset: RubricPreset;
  evaluation: Evaluation;
  collision?: { crossings: number; logoText: number };
}

interface TermOutcome {
  status: GateStatus;
  value?: number;
  threshold?: number;
  detailAr?: string;
}

function compare(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case '==':
      return value === threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    default:
      return false;
  }
}

function defaultPreset(spec: DesignSpec): RubricPreset {
  const platform = getPreset(spec.canvas.platform);
  return {
    width: spec.canvas.width,
    height: spec.canvas.height,
    margins:
      platform?.margins ?? Math.round(Math.min(spec.canvas.width, spec.canvas.height) * 0.06),
    minFontSize: platform?.minFontSize ?? 22,
    safeZones: platform?.safeZones ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

function findingFor(findings: Finding[], path: string): Finding | undefined {
  // `color.harmony.confidence` → يبحث عن finding `color.harmony` أولًا.
  for (const id of idPrefixes(path)) {
    const hit = findings.find((f) => f.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** كل بادئة مطابقة من الأقصر للأطول: `color`، `color.harmony`، `color.harmony.confidence`. */
function idPrefixes(path: string): string[] {
  const parts = path.split('.');
  const out: string[] = [];
  for (let i = parts.length; i >= 1; i--) out.push(parts.slice(0, i).join('.'));
  return out;
}

function hex(c: Color): string {
  return rgbToHex({ r: c.r, g: c.g, b: c.b });
}

/** لون فوق خلفية (يُراعي alpha): لوح شبه شفاف لا يُحسب كفصل حقيقي. */
function over(bg: Color, fg: Color): string {
  const a = fg.a;
  return hex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  });
}

/**
 * `surface.separation` — أدنى مسافة لونية بين أي لوح مصمت (rect مملوء)
 * وأي خلفية (canvas.background + طبقات background). بدون ألواح = 1 (لا مخالفة).
 */
function surfaceSeparation(spec: DesignSpec): number {
  const backgrounds: Color[] = [spec.canvas.background];
  for (const l of spec.layers) {
    if (l.type === 'background' && l.fill) backgrounds.push(l.fill);
  }
  let min = 1;
  let panels = 0;
  for (const l of spec.layers) {
    if (!l.visible || l.type !== 'shape' || !l.fill || l.id === 'bg') continue;
    if (String(l.metadata?.['shape'] ?? '') !== 'rect') continue;
    panels++;
    for (const bg of backgrounds) {
      min = Math.min(min, colorDistance(over(bg, l.fill), hex(bg)));
    }
  }
  return panels === 0 ? 1 : Number(min.toFixed(3));
}

/* ---------------------------------------------------------------- collision */
/* منقول بنيةً وحسبةً من إسطوانة البوابة out/collision-probe.ts — نفس
 * التعريفات (حاوية = rect محاط، لوح = rect مملوء، سماحية 1px) حتى يعطي
 * ruleGates نفس الرقم الذي تعطيه البوابة المنشورة. */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const box = (l: Layer): Box => ({ x: l.x, y: l.y, w: l.width, h: l.height });

function overlap(a: Box, b: Box): { x: number; y: number } {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return { x: Math.max(0, x), y: Math.max(0, y) };
}

const strictlyOverlaps = (a: Box, b: Box): boolean => {
  const o = overlap(a, b);
  return o.x > 1 && o.y > 1;
};

const inside = (p: Box, f: Box): boolean =>
  p.x >= f.x - 1 && p.y >= f.y - 1 && p.x + p.w <= f.x + f.w + 1 && p.y + p.h <= f.y + f.h + 1;

function collisionCounts(spec: DesignSpec): { crossings: number; logoText: number } {
  const visible = spec.layers.filter((l) => l.visible);
  const shapeKind = (l: Layer): string => String((l.metadata ?? {})['shape'] ?? '');
  const logos = visible.filter((l) => l.name === 'LOGO' || l.id === 'logo' || l.id === 'logo-text');
  const texts = visible.filter(
    (l) => l.type === 'text' && !logos.some((logo) => logo.id === l.id && logo.name === l.name),
  );

  let logoText = 0;
  for (const logo of logos) {
    for (const t of texts) {
      const o = overlap(box(logo), box(t));
      if (o.x > 1 && o.y > 1) logoText++;
    }
  }

  const isContainer = (l: Layer): boolean =>
    l.visible && l.type === 'shape' && shapeKind(l) === 'rect' && Boolean(l.stroke);
  const isPanel = (l: Layer): boolean => {
    if (!l.visible || l.type !== 'shape') return false;
    if (shapeKind(l) !== 'rect') return false;
    if (l.id === 'bg') return false;
    return Boolean(l.fill);
  };
  const containers = visible.filter(isContainer);
  const panels = visible.filter(isPanel);

  let crossings = 0;
  for (const f of containers) {
    for (const p of panels) {
      if (p.id === f.id) continue;
      const fb = box(f);
      const pb = box(p);
      if (!strictlyOverlaps(fb, pb)) continue;
      if (fb.w * fb.h <= pb.w * pb.h) continue; // الحاوية أكبر مساحة
      if (!inside(pb, fb)) crossings++;
    }
  }
  return { crossings, logoText };
}

/* ------------------------------------------------------------------- terms */

function evalTerm(term: string, ctx: Ctx): TermOutcome {
  const m = TERM_RE.exec(term.trim());
  if (!m) return { status: 'unavailable', detailAr: `صيغة measure غير معروفة: ${term}` };
  const path = m[1]!;
  const op = m[2];
  const rawValue = m[3];

  /* -------- مقاييس boolean (بلا معامل) -------- */
  if (!op) {
    if (path === 'tests.logoCarriesBrandName') {
      const logos = ctx.spec.layers.filter(
        (l) => l.visible && (l.name === 'LOGO' || l.id === 'logo' || l.id === 'logo-text'),
      );
      if (logos.length === 0) {
        return { status: 'fail', value: 0, detailAr: 'لا توجد طبقة LOGO تحمل العلامة' };
      }
      const brand = ctx.opts.brandName;
      if (!brand) {
        return { status: 'unavailable', detailAr: 'قياس الشعار يحتاج opts.brandName' };
      }
      const carries = logos.some(
        (l) => l.type === 'image' || (l.textRuns ?? []).some((r) => r.text.includes(brand)),
      );
      return carries
        ? { status: 'pass', value: 1, detailAr: 'الشعار يحمل اسم العلامة' }
        : { status: 'fail', value: 0, detailAr: 'الشعار لا يحمل اسم العلامة' };
    }
    if (path === 'rationaleAr.nonEmpty') {
      const r = ctx.opts.rationaleAr;
      if (r === undefined) {
        return { status: 'unavailable', detailAr: 'قياس المبرر يحتاج opts.rationaleAr' };
      }
      return r.trim().length > 0
        ? { status: 'pass', value: 1, detailAr: 'النسخة تحمل مبرراً مفاهيمياً' }
        : { status: 'fail', value: 0, detailAr: 'النسخة بلا مبرر' };
    }
    return { status: 'unavailable', detailAr: `measure غير موصول: ${path}` };
  }

  /* -------- عتبة -------- */
  if (rawValue === undefined) {
    return { status: 'unavailable', detailAr: `measure بلا عتبة: ${term}` };
  }
  const threshold = rawValue === 'floor' ? (ctx.preset.minFontSize ?? 22) : Number(rawValue);
  if (Number.isNaN(threshold)) {
    return { status: 'unavailable', detailAr: `عتبة غير معروفة: ${rawValue}` };
  }

  /* -------- تحقق المسار (بالبادئة: color.harmony.confidence ← color.harmony) -------- */
  const isKnown =
    path === 'rubric.score' ||
    SPECIAL_PATHS.has(path) ||
    path in METRIC_ALIASES ||
    idPrefixes(path).some((id) => KNOWN_FINDINGS.has(id));
  if (!isKnown) return { status: 'unavailable', detailAr: `measure غير موصول: ${path}` };

  /* -------- قيمة -------- */
  let value: number;
  if (path === 'rubric.score') {
    value = ctx.evaluation.score;
  } else if (path === 'typography.minSize') {
    // الحجم الأدنى الفعلي في الـspec — قيمة حقيقية حتى بلا finding.
    const sizes = ctx.spec.layers
      .filter((l) => l.visible && l.type === 'text' && l.textRuns?.[0])
      .map((l) => l.textRuns![0]!.size);
    value = sizes.length > 0 ? Math.min(...sizes) : threshold;
  } else if (path === 'pixel.edge') {
    if (ctx.opts.pixelEdge === undefined) {
      return {
        status: 'unavailable',
        detailAr: 'قياس البكسل يحتاج opts.pixelEdge من calibratedReview',
      };
    }
    value = ctx.opts.pixelEdge;
  } else if (path === 'surface.separation') {
    value = surfaceSeparation(ctx.spec);
  } else if (path === 'collision.probe.crossings' || path === 'collision.probe.logoText') {
    ctx.collision ??= collisionCounts(ctx.spec);
    value = path.endsWith('crossings') ? ctx.collision.crossings : ctx.collision.logoText;
  } else {
    const alias = METRIC_ALIASES[path];
    if (alias) {
      value = ctx.evaluation.metrics[alias];
    } else if (op === '==') {
      // finding لا يُبنى إلا عند المخالفة: العدّ = صفر يعني القياس مطابق.
      value = ctx.evaluation.findings.filter((f) => f.id === path).length;
    } else {
      const f = findingFor(ctx.evaluation.findings, path);
      if (!f) {
        return { status: 'pass', threshold, detailAr: 'لا يوجد finding — القياس مطابق' };
      }
      value = f.measured ?? 0;
    }
  }

  const ok = compare(value, op, threshold);
  const outcome: TermOutcome = { status: ok ? 'pass' : 'fail', value, threshold };
  if (!ok) {
    outcome.detailAr = `${path}=${value} لا يحقق ${op}${threshold}`;
  }
  return outcome;
}

function gateFor(rule: HandbookMeasureRule, ctx: Ctx): RuleGate {
  const gate: RuleGate = {
    ruleId: rule.id,
    domain: rule.domain,
    measure: rule.measure,
    status: 'pass',
  };

  if (rule.measure.startsWith('pending:')) {
    gate.status = 'pending';
    gate.detailAr = 'مقاييس غير مفعّل — مسجّل في PROJECT_STATE.md';
    return gate;
  }

  const outcomes = rule.measure.split('&&').map((t) => evalTerm(t, ctx));
  gate.status = outcomes.some((o) => o.status === 'fail')
    ? 'fail'
    : outcomes.some((o) => o.status === 'unavailable')
      ? 'unavailable'
      : outcomes.some((o) => o.status === 'pending')
        ? 'pending'
        : 'pass';

  const primary =
    outcomes.find((o) => o.status === 'fail') ??
    outcomes.find((o) => o.status === 'unavailable') ??
    outcomes.find((o) => o.value !== undefined);
  if (primary?.value !== undefined) gate.value = primary.value;
  if (primary?.threshold !== undefined) gate.threshold = primary.threshold;
  const details = outcomes.map((o) => o.detailAr).filter((d): d is string => Boolean(d));
  if (details.length > 0) gate.detailAr = details.join('؛ ');
  return gate;
}

/**
 * شغّل كل قواعد handbook على spec واحد وارجع بواباتها مع تقييم الـrubric.
 *
 * `rules` تُمرَّر من الخارج (knowledge/loader.handbookRules()) لأن الحزمة
 * لا تقرأ ملفات خارج جذرها — نفس عقد knowledge schema.
 */
export function ruleGates(
  spec: DesignSpec,
  brief: DesignBrief,
  rules: HandbookMeasureRule[],
  opts: RuleGatesOptions = {},
): RuleGatesResult {
  const preset = opts.preset ?? defaultPreset(spec);
  const evaluation = evaluateDesign(spec, brief, preset);
  const ctx: Ctx = { spec, opts, preset, evaluation };
  const gates = rules.map((rule) => gateFor(rule, ctx));
  return {
    gates,
    evaluation,
    passed: gates.filter((g) => g.status === 'pass').length,
    failed: gates.filter((g) => g.status === 'fail').length,
    pending: gates.filter((g) => g.status === 'pending').length,
    unavailable: gates.filter((g) => g.status === 'unavailable').length,
  };
}
