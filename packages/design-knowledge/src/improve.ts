import type { Color, DesignBrief, DesignSpec, Layer } from '@mubdi/schemas';
import {
  evaluateDesign,
  effectiveBackground,
  type Evaluation,
  type RubricPreset,
} from './rubric.js';
import { contrastHex, ensureContrast, hexToRgb, requiredContrast } from './color.js';
import { SPACING_SCALE } from './grid.js';

/**
 * Iterative auto-fix.
 *
 * The loop is deliberately conservative: every pass measures the design,
 * applies only the fixes it can prove (contrast, tracking, type floor,
 * hierarchy ladder, spacing rhythm, safe areas), re-measures, and keeps the
 * best-scoring spec. It never "improves" by guessing — if a fix makes the
 * score worse, the pass is discarded.
 */

export interface ImproveOptions {
  maxIterations?: number;
  targetScore?: number;
  /** Keep the highest-scoring intermediate spec (default true). */
  keepBest?: boolean;
}

export interface ImproveStep {
  iteration: number;
  before: number;
  after: number;
  actionsAr: string[];
  remainingAr: string[];
}

export interface ImproveResult {
  spec: DesignSpec;
  before: Evaluation;
  after: Evaluation;
  steps: ImproveStep[];
  improved: boolean;
}

function clone(spec: DesignSpec): DesignSpec {
  return JSON.parse(JSON.stringify(spec)) as DesignSpec;
}

function toHex(color: Color): string {
  const to = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(color.r)}${to(color.g)}${to(color.b)}`;
}

function fromHex(hex: string): Color {
  const rgb = hexToRgb(hex);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };
}

function textLayers(spec: DesignSpec): Layer[] {
  // P0-4: locked layers are never auto-fixed — the user froze them on purpose.
  return spec.layers.filter((l) => l.type === 'text' && Boolean(l.textRuns?.[0]) && !l.locked);
}

function marginsOf(spec: DesignSpec, preset: RubricPreset): number {
  return preset.margins ?? Math.round(Math.min(spec.canvas.width, spec.canvas.height) * 0.06);
}

function minFontOf(preset: RubricPreset): number {
  return preset.minFontSize ?? 22;
}

function shiftedPartner(spec: DesignSpec, layer: Layer, dy: number): void {
  if (dy === 0) return;
  const partnerId = layer.name === 'CTA' ? 'cta-bg' : layer.id === 'cta' ? 'cta-bg' : undefined;
  if (!partnerId) return;
  const partner = spec.layers.find((l) => l.id === partnerId);
  if (partner && !partner.locked) partner.y += dy;
}

/**
 * Fix contrast by walking the foreground lightness until it clears WCAG.
 * Applies to every text layer, including muted copy.
 */
function fixContrast(spec: DesignSpec, actions: string[]): void {
  for (const layer of textLayers(spec)) {
    const run = layer.textRuns![0]!;
    const bg = effectiveBackground(spec, layer);
    const fg = toHex(run.color);
    const need = requiredContrast(run.size, run.bold);
    const ratio = Number(contrastHex(fg, bg).toFixed(2));
    if (ratio >= need) continue;
    const fixed = ensureContrast(fg, bg, need);
    run.color = fromHex(fixed);
    actions.push(
      `ضبط تباين «${layer.name}» من ${ratio}:1 إلى ${requiredContrast(run.size, run.bold)}:1`,
    );
  }
}

function fixArabicTracking(spec: DesignSpec, actions: string[]): void {
  for (const layer of textLayers(spec)) {
    for (const run of layer.textRuns ?? []) {
      if (run.direction === 'rtl' && run.tracking !== 0) {
        run.tracking = 0;
        actions.push(`تصفير تباعد الأحرف في «${layer.name}» (قاعدة العربية)`);
      }
    }
  }
}

function fixTypeFloor(spec: DesignSpec, preset: RubricPreset, actions: string[]): void {
  const minFontSize = minFontOf(preset);
  for (const layer of textLayers(spec)) {
    const run = layer.textRuns![0]!;
    if (run.size < minFontSize) {
      actions.push(`رفع حجم «${layer.name}» من ${run.size}px إلى ${minFontSize}px`);
      run.size = minFontSize;
      layer.height = Math.max(layer.height, Math.round(run.size * 1.4));
    }
    const leading = run.leading ?? 1.45;
    if (leading < 1.35) {
      run.leading = 1.45;
      actions.push(`زيادة ارتفاع السطر في «${layer.name}» إلى 1.45 لوضوح العربية`);
    }
  }
}

/**
 * Rebuild the type ladder from the headline down: 1×, 1/1.35, 1/2, 1/2.9.
 * This creates a measurable 2×+ jump while keeping every level above the
 * platform floor.
 */
function fixHierarchy(spec: DesignSpec, preset: RubricPreset, actions: string[]): void {
  const texts = textLayers(spec).filter((l) => l.name !== 'LOGO');
  const headline = texts.find((l) => l.name === 'HEADLINE');
  if (!headline || texts.length < 2) return;
  const others = texts
    .filter((l) => l !== headline)
    .sort((a, b) => (b.textRuns![0]!.size ?? 0) - (a.textRuns![0]!.size ?? 0));
  const maxOther = others[0]?.textRuns?.[0]?.size ?? 0;
  const headlineRun = headline.textRuns![0]!;
  if (maxOther > 0 && headlineRun.size < maxOther * 2) {
    const target = Math.max(headlineRun.size, Math.round(maxOther * 2.6));
    headlineRun.size = target;
    headline.height = Math.max(headline.height, Math.round(target * 1.3));
    actions.push(`تكبير العنوان إلى ${target}px ليكون أعلى درجة بفارق واضح`);
  }
  const base = headline.textRuns![0]!.size;
  const ladder = [base, Math.round(base / 1.35), Math.round(base / 2), Math.round(base / 2.9)];
  others.forEach((layer, index) => {
    const run = layer.textRuns![0]!;
    const target = Math.max(minFontOf(preset), ladder[Math.min(index + 1, ladder.length - 1)]!);
    if (Math.abs(run.size - target) >= 1) {
      run.size = target;
      layer.height = Math.max(layer.height, Math.round(target * 1.45));
      actions.push(`ضبط «${layer.name}» على الدرجة ${index + 2} من المقياس (${target}px)`);
    }
  });
}

/** Snap vertical gaps to the 8pt scale when the correction is tiny (<= 6px). */
function fixSpacing(spec: DesignSpec, actions: string[]): void {
  const sorted = [...textLayers(spec)].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const next = sorted[i]!;
    const gap = next.y - (prev.y + prev.height);
    if (gap < 0) continue;
    const nearest = SPACING_SCALE.reduce(
      (best, s) => (Math.abs(s - gap) < Math.abs(best - gap) ? s : best),
      0,
    );
    const dy = nearest - gap;
    if (Math.abs(dy) > 0 && Math.abs(dy) <= 6) {
      next.y += dy;
      shiftedPartner(spec, next, dy);
      actions.push(`تقريب المسافة قبل «${next.name}» إلى ${nearest}px (شبكة 8)`);
    }
  }
}

/** Nudge edges that are almost aligned onto the grid or the margin. */
function fixAlignment(
  spec: DesignSpec,
  brief: DesignBrief,
  preset: RubricPreset,
  actions: string[],
): void {
  const rtl = brief.direction !== 'ltr';
  const margins = marginsOf(spec, preset);
  const content = {
    left: Math.max(margins, preset.safeZones.left),
    right: spec.canvas.width - Math.max(margins, preset.safeZones.right),
  };
  for (const layer of textLayers(spec)) {
    const start = rtl ? layer.x + layer.width : layer.x;
    const contentStart = rtl ? content.right : content.left;
    const delta = contentStart - start;
    if (Math.abs(delta) > 0 && Math.abs(delta) <= 8) {
      const x = layer.x + delta;
      if (x >= 0 && x + layer.width <= spec.canvas.width) {
        layer.x = x;
        shiftedPartner(spec, layer, 0);
        const shape = spec.layers.find(
          (l) => l.name === 'CTA-bg' && Math.abs(l.y - layer.y) < layer.height,
        );
        if (shape && !shape.locked) shape.x = x;
        actions.push(`محاذاة «${layer.name}» على هامش المحتوى`);
      }
    }
  }
}

/** Clamp every visible text layer inside the platform safe rectangle. */
function fixSafeZones(spec: DesignSpec, preset: RubricPreset, actions: string[]): void {
  const margins = marginsOf(spec, preset);
  const left = Math.max(margins, preset.safeZones.left);
  const top = Math.max(margins, preset.safeZones.top);
  const right = spec.canvas.width - Math.max(margins, preset.safeZones.right);
  const bottom = spec.canvas.height - Math.max(margins, preset.safeZones.bottom);
  for (const layer of textLayers(spec)) {
    let dx = 0;
    let dy = 0;
    if (layer.x < left) dx = left - layer.x;
    else if (layer.x + layer.width > right) dx = right - (layer.x + layer.width);
    if (layer.y < top) dy = top - layer.y;
    else if (layer.y + layer.height > bottom) dy = bottom - (layer.y + layer.height);
    if (dx !== 0 || dy !== 0) {
      layer.x = Math.round(layer.x + dx);
      layer.y = Math.round(layer.y + dy);
      shiftedPartner(spec, layer, dy);
      const shape = spec.layers.find((l) => l.id === 'cta-bg');
      if (shape && !shape.locked && layer.name === 'CTA') {
        shape.x = layer.x;
        shape.y = layer.y;
      }
      actions.push(`إعادة «${layer.name}» داخل مساحة الأمان`);
    }
  }
}

const ACTION_FIXERS: Array<
  (spec: DesignSpec, brief: DesignBrief, preset: RubricPreset, actions: string[]) => void
> = [
  (spec, _brief, _preset, actions) => fixContrast(spec, actions),
  (spec, _brief, _preset, actions) => fixArabicTracking(spec, actions),
  (spec, _brief, preset, actions) => fixTypeFloor(spec, preset, actions),
  (spec, _brief, preset, actions) => fixHierarchy(spec, preset, actions),
  (spec, _brief, _preset, actions) => fixSpacing(spec, actions),
  (spec, brief, preset, actions) => fixAlignment(spec, brief, preset, actions),
  (spec, _brief, preset, actions) => fixSafeZones(spec, preset, actions),
];

export function improveSpec(
  spec: DesignSpec,
  brief: DesignBrief,
  preset: RubricPreset,
  options: ImproveOptions = {},
): ImproveResult {
  const maxIterations = options.maxIterations ?? 3;
  const targetScore = options.targetScore ?? 96;
  const keepBest = options.keepBest ?? true;

  const before = evaluateDesign(spec, brief, preset);
  let current = clone(spec);
  let evaluation = before;
  let best = clone(spec);
  let bestEvaluation = before;
  const steps: ImproveStep[] = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (evaluation.score >= targetScore) break;
    const actions: string[] = [];
    for (const fixer of ACTION_FIXERS) {
      fixer(current, brief, preset, actions);
    }
    if (actions.length === 0) break;

    const nextEvaluation = evaluateDesign(current, brief, preset);
    steps.push({
      iteration,
      before: evaluation.score,
      after: nextEvaluation.score,
      actionsAr: [...new Set(actions)],
      remainingAr: nextEvaluation.findings.slice(0, 4).map((f) => f.fixAr),
    });

    if (keepBest && nextEvaluation.score < bestEvaluation.score) {
      // Regression: discard the pass and stop.
      current = clone(best);
      evaluation = bestEvaluation;
      break;
    }
    evaluation = nextEvaluation;
    if (evaluation.score >= bestEvaluation.score) {
      best = clone(current);
      bestEvaluation = evaluation;
    }
  }

  return {
    spec: keepBest ? best : current,
    before,
    after: keepBest ? bestEvaluation : evaluation,
    steps,
    improved: (keepBest ? bestEvaluation.score : evaluation.score) > before.score,
  };
}
