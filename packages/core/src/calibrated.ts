import type { DesignBrief, DesignSpec } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';
import {
  evaluateQuality,
  finalizeQuality,
  improveSpec,
  stripArtifacts,
  variantSimilarity,
  type QFinding,
  type QualityEvaluation,
} from '@mubdi/design-knowledge';
import { analyzeSpecRender, renderSpecToPng, type PixelStats } from '@mubdi/renderer';
import { resolvePreset } from './critique';

/**
 * Q1 — the calibrated critic that actually says no.
 *
 * Three layers, in order of objectivity:
 *   1. Spec rubric        (evaluateQuality: measurable structure + content)
 *   2. Pixel ground truth (what the renderer really painted, Thresholds
 *                          calibrated against 61 references vs 60 flat
 *                          renders — all four metrics separate cleanly)
 *   3. Reference gaps     (pairwise: where the render sits below the 10th
 *                          percentile of the approved reference set)
 *
 * The show gate is hard: nothing under 80 reaches the user. The quality loop
 * strips artifacts, applies conservative fixes and re-reviews up to 3 times;
 * if still failing it escalates (Q3 will regenerate with a different template).
 */

/** Calibrated thresholds (out/critic-calibration.json, 2026-11-16). */
export const PIXEL_THRESHOLDS = {
  edgeDensity: 0.065,
  detailCoverage: 0.203,
  bgShare: 0.582,
  lumaClusters: 2,
} as const;

/** 10th..90th percentile of the 61 approved references. */
export const REFERENCE_PIXEL_BANDS = {
  edgeDensity: [0.074, 0.181] as [number, number],
  detailCoverage: [0.27, 0.591] as [number, number],
  bgShare: [0.173, 0.626] as [number, number],
  lumaClusters: [3, 5] as [number, number],
  hueFamilies: [2, 6] as [number, number],
} as const;

export const SHOW_GATE = 80;

export interface CalibratedReview {
  score: number;
  pass: boolean;
  gradeAr: string;
  specEvaluation: QualityEvaluation;
  pixel: PixelStats;
  pixelFindingsAr: string[];
  gapsAr: string[];
  topWeaknessesAr: string[];
  summaryAr: string;
}

/* ------------------------------------------------------------------ */
/* pixel findings + reference gaps                                     */
/* ------------------------------------------------------------------ */

function pixelFindings(pixel: PixelStats): QFinding[] {
  const findings: QFinding[] = [];
  if (pixel.edgeDensity < PIXEL_THRESHOLDS.edgeDensity) {
    findings.push({
      id: 'pixel.flat',
      category: 'richness',
      severity: 'critical',
      messageAr: `قياس البكسل: كثافة الحواف ${(pixel.edgeDensity * 100).toFixed(1)}% والمطلوب ≥ ${(PIXEL_THRESHOLDS.edgeDensity * 100).toFixed(1)}% — اللوحة ترسم فعلياً كلون مسطح مع نص.`,
      fixAr:
        'البناء الحالي لا يُنتج عمقاً حقيقياً؛ يلزم قالب بنمط P1-P8 (بطاقة/بطل/ورق) لا إضافة لمسات على نص.',
      measured: pixel.edgeDensity,
      threshold: PIXEL_THRESHOLDS.edgeDensity,
    });
  }
  if (pixel.detailCoverage < PIXEL_THRESHOLDS.detailCoverage) {
    findings.push({
      id: 'pixel.detail',
      category: 'richness',
      severity: pixel.detailCoverage < 0.1 ? 'critical' : 'major',
      messageAr: `قياس البكسل: التفاصيل والمواد (ملمس/صورة/ظلال) تغطي ${(pixel.detailCoverage * 100).toFixed(0)}% من اللوحة والمطلوب ≥ 20%.`,
      fixAr: 'أضف بطل مصوّراً أو مجسّماً بنسيج وظل، أو نقش خلفي، أو بطاقة بمحتوى صفوف.',
      measured: pixel.detailCoverage,
      threshold: PIXEL_THRESHOLDS.detailCoverage,
    });
  }
  if (pixel.bgShare > PIXEL_THRESHOLDS.bgShare) {
    findings.push({
      id: 'pixel.bg',
      category: 'space',
      severity: 'major',
      messageAr: `قياس البكسل: لون واحد يغطي ${(pixel.bgShare * 100).toFixed(0)}% من اللوحة (الحد ${(PIXEL_THRESHOLDS.bgShare * 100).toFixed(0)}%) — الفراغ ميت لا مهيكل.`,
      fixAr:
        'قسّم المساحة: خلفية معالجة + بطاقة/بطل + لمسات؛ الخلفية الواحدة في المراجع لا تتجاوز 63%.',
      measured: pixel.bgShare,
      threshold: PIXEL_THRESHOLDS.bgShare,
    });
  }
  if (pixel.lumaClusters < PIXEL_THRESHOLDS.lumaClusters) {
    findings.push({
      id: 'pixel.tonality',
      category: 'color',
      severity: 'major',
      messageAr: `قياس البكسل: التصميم يشغل نطاقاً إضاءة واحداً من 5 — بلا تباين نبرة مستوى الصورة.`,
      fixAr: 'أدخل نطاقات إضاءة متعددة: scrim داكن، سطح فاتح، ظل، ولمسة مضيئة.',
      measured: pixel.lumaClusters,
      threshold: PIXEL_THRESHOLDS.lumaClusters,
    });
  }
  return findings;
}

function referenceGaps(pixel: PixelStats): string[] {
  const gaps: string[] = [];
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  if (pixel.edgeDensity < REFERENCE_PIXEL_BANDS.edgeDensity[0]) {
    gaps.push(
      `كثافة الحواف ${pct(pixel.edgeDensity)} تقع تحت أدنى مرجع معتمد (${pct(REFERENCE_PIXEL_BANDS.edgeDensity[0])}) — التصميم أفرغ من أقل مرجع.`,
    );
  }
  if (pixel.detailCoverage < REFERENCE_PIXEL_BANDS.detailCoverage[0]) {
    gaps.push(
      `تغطية التفاصيل ${pct(pixel.detailCoverage)} تحت أدنى مرجع (${pct(REFERENCE_PIXEL_BANDS.detailCoverage[0])}) — أضف صورة/نسيج/ظلال.`,
    );
  }
  if (pixel.bgShare > REFERENCE_PIXEL_BANDS.bgShare[1]) {
    gaps.push(
      `الخلفية الفردية ${pct(pixel.bgShare)} تتجاوز أعلى مرجع (${pct(REFERENCE_PIXEL_BANDS.bgShare[1])}).`,
    );
  }
  if (pixel.lumaClusters < REFERENCE_PIXEL_BANDS.lumaClusters[0]) {
    gaps.push(
      `نطاقات الإضاءة ${pixel.lumaClusters} تحت أدنى مرجع (${REFERENCE_PIXEL_BANDS.lumaClusters[0]}) — التباين النبري مفقود.`,
    );
  }
  if (pixel.hueFamilies < REFERENCE_PIXEL_BANDS.hueFamilies[0]) {
    gaps.push(
      `عائلات اللون المرئية ${pixel.hueFamilies} تحت أدنى مرجع (${REFERENCE_PIXEL_BANDS.hueFamilies[0]}) — النظام اللوني بلا طبقات لونية.`,
    );
  }
  return gaps;
}

/* ------------------------------------------------------------------ */
/* the calibrated review                                               */
/* ------------------------------------------------------------------ */

export async function calibratedReview(spec: DesignSpec): Promise<CalibratedReview> {
  const specEvaluation = evaluateQuality(spec);
  const png = renderSpecToPng(spec);
  const pixel = await analyzeSpecRender(png);

  const findings = pixelFindings(pixel);
  const gaps = referenceGaps(pixel);

  for (const f of findings) {
    specEvaluation.findings.push(f);
    const cat = specEvaluation.categories.find((c) => c.id === f.category);
    if (cat) {
      cat.findings.push(f);
      if (f.id === 'pixel.flat') cat.score = Math.min(cat.score, 15);
      else if (f.id === 'pixel.detail')
        cat.score = Math.min(cat.score, f.severity === 'critical' ? 25 : 40);
      else if (f.id === 'pixel.bg') cat.score = Math.min(cat.score, 50);
      else if (f.id === 'pixel.tonality') cat.score = Math.min(cat.score, 60);
    }
  }
  finalizeQuality(specEvaluation);

  return {
    score: specEvaluation.score,
    pass: specEvaluation.pass,
    gradeAr: specEvaluation.gradeAr,
    specEvaluation,
    pixel,
    pixelFindingsAr: findings.map((f) => f.messageAr),
    gapsAr: gaps,
    topWeaknessesAr: specEvaluation.topWeaknessesAr,
    summaryAr:
      gaps.length && specEvaluation.pass
        ? `${specEvaluation.summaryAr} فجوات.vs المراجع: ${gaps[0]}`
        : specEvaluation.summaryAr,
  };
}

/** Review a variant set: per-variant calibrated review + shared diversity gate. */
export async function calibratedReviewSet(specs: DesignSpec[]): Promise<CalibratedReview[]> {
  const reviews = await Promise.all(specs.map((s) => calibratedReview(s)));
  for (let i = 0; i < specs.length; i++) {
    for (let j = i + 1; j < specs.length; j++) {
      const sim = variantSimilarity(specs[i]!, specs[j]!);
      if (sim <= 0.7) continue;
      for (const [target, other] of [
        [reviews[i]!, j],
        [reviews[j]!, i],
      ] as const) {
        const evaluation = target.specEvaluation;
        const finding: QFinding = {
          id: 'diversity.similarity',
          category: 'diversity',
          severity: 'critical',
          messageAr: `النسخة متشابهة جداً مع النسخة ${other + 1} (تشابه تكويني ${(sim * 100).toFixed(0)}% — الحد 70%).`,
          fixAr: 'اختر قالباً/نمطاً تكوينياً مختلفاً لا مجرد لون مختلف.',
          measured: sim,
          threshold: 0.7,
        };
        evaluation.findings.push(finding);
        const cat = evaluation.categories.find((c) => c.id === 'diversity');
        if (cat) {
          cat.score = 20;
          cat.findings.push(finding);
        }
        finalizeQuality(evaluation);
        target.score = evaluation.score;
        target.pass = evaluation.pass;
        target.gradeAr = evaluation.gradeAr;
        target.topWeaknessesAr = evaluation.topWeaknessesAr;
        target.summaryAr = evaluation.summaryAr;
      }
    }
  }
  return reviews;
}

/* ------------------------------------------------------------------ */
/* the quality loop: fix → re-review → escalate                        */
/* ------------------------------------------------------------------ */

export interface QualityLoopResult {
  spec: DesignSpec;
  review: CalibratedReview;
  iterations: number;
  actionsAr: string[];
  /** True when the best result still fails the gate — Q3 replaces the template. */
  escalateAr: string | null;
}

/**
 * Hard show gate with a bounded repair loop:
 *   1. strip fingerprinted debug artifacts
 *   2. run the conservative auto-fixer (contrast/type ladder/spacing…)
 *   3. re-review; keep the best; stop when >= 80 or after 3 rounds
 * It never inflates the score: what comes back is what the pixels show.
 */
export async function runQualityLoop(
  spec: DesignSpec,
  brief: DesignBrief,
  options: { maxIterations?: number } = {},
): Promise<QualityLoopResult> {
  const maxIterations = options.maxIterations ?? 3;
  const presetPseudo = resolvePreset(spec, getPreset(spec.canvas.platform) ?? undefined);
  const actions: string[] = [];
  let current = spec;

  const stripped = stripArtifacts(current);
  if (stripped.removed > 0) {
    current = stripped.spec;
    actions.push(`حذف ${stripped.removed} علامة تحديد/تصحيح من العمل الفني`);
  }

  let review = await calibratedReview(current);
  let bestSpec = current;
  let bestReview = review;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (review.pass) break;
    const improved = improveSpec(current, brief, presetPseudo, {
      maxIterations: 1,
      targetScore: SHOW_GATE,
    });
    if (improved.spec === current || !improved.improved) break;
    current = improved.spec;
    for (const step of improved.steps) actions.push(...step.actionsAr);
    review = await calibratedReview(current);
    if (review.score > bestReview.score) {
      bestSpec = current;
      bestReview = review;
    }
  }

  return {
    spec: bestSpec,
    review: bestReview,
    iterations: actions.length > 0 ? Math.min(maxIterations, Math.max(1, actions.length)) : 0,
    actionsAr: [...new Set(actions)],
    escalateAr: bestReview.pass
      ? null
      : 'فشل الإصلاح الحتمي بعد 3 جولات — يلزم إعادة توليد بقالب مختلف (سيُفعَّل مع محرك القوالب في Q3).',
  };
}
