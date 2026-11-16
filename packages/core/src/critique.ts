import type { DesignBrief, DesignSpec } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';
import {
  coach,
  evaluateDesign,
  formatEvaluation,
  improveSpec,
  type CoachReport,
  type Evaluation,
  type RubricPreset,
} from '@mubdi/design-knowledge';

export interface CritiqueResult {
  score: number;
  issues: string[];
  fixes: string[];
  gradeAr: string;
  reportAr: string;
  evaluation: Evaluation;
  coach: CoachReport;
}

export function resolvePreset(spec: DesignSpec, preset?: Partial<RubricPreset>): RubricPreset {
  const platform = getPreset(spec.canvas.platform);
  return {
    width: spec.canvas.width,
    height: spec.canvas.height,
    margins: preset?.margins ?? platform?.margins ?? Math.round(Math.min(spec.canvas.width, spec.canvas.height) * 0.06),
    minFontSize: preset?.minFontSize ?? platform?.minFontSize ?? 22,
    safeZones:
      preset?.safeZones ??
      platform?.safeZones ?? { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

/**
 * Rubric-based criticism. The legacy fields (`score`, `issues`, `fixes`) are
 * preserved so existing callers keep working; the new fields carry measured
 * evaluation and the Arabic coaching report.
 */
export function critiqueSpec(spec: DesignSpec, brief: DesignBrief, preset?: Partial<RubricPreset>): CritiqueResult {
  const resolved = resolvePreset(spec, preset);
  const evaluation = evaluateDesign(spec, brief, resolved);
  const report = coach(evaluation, brief);
  return {
    score: evaluation.score,
    issues: evaluation.findings.map((f) => f.messageAr),
    fixes: evaluation.findings.map((f) => f.fixAr),
    gradeAr: evaluation.gradeAr,
    reportAr: `${report.text}\n\n${formatEvaluation(evaluation)}`,
    evaluation,
    coach: report,
  };
}

/**
 * Apply the design-knowledge auto-fix loop. Passing a brief is what enables
 * measurement; without one we can only normalise Arabic direction defaults.
 */
export function autoFixSpec(
  spec: DesignSpec,
  critique?: CritiqueResult,
  brief?: DesignBrief,
  preset?: Partial<RubricPreset>,
): DesignSpec {
  if (brief) {
    const resolved = resolvePreset(spec, preset);
    return improveSpec(spec, brief, resolved, { maxIterations: 3, targetScore: 95 }).spec;
  }
  const fixed = JSON.parse(JSON.stringify(spec)) as DesignSpec;
  for (const layer of fixed.layers) {
    if (layer.type === 'text' && layer.textRuns) {
      for (const run of layer.textRuns) {
        if (!run.direction) run.direction = 'rtl';
        if (run.direction === 'rtl') run.tracking = 0;
      }
    }
  }
  if (critique) fixed.version = (fixed.version || 1) + 1;
  return fixed;
}
