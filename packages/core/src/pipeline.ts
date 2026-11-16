import type { DesignBrief, DesignSpec } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';
import { coach, improveSpec } from '@mubdi/design-knowledge';
import { resolvePreset } from './critique';

export interface PipelineResult {
  spec: DesignSpec;
  score: number;
  iterations: number;
  issues: string[];
  reportAr: string;
  improved: boolean;
}

/**
 * Generate → measure → auto-fix → measure again. Keeps the best spec and
 * returns the Arabic report so the UI can explain *why* it changed.
 */
export function runCritiqueLoop(spec: DesignSpec, brief: DesignBrief, targetScore = 95): PipelineResult {
  const preset = resolvePreset(spec, getPreset(spec.canvas.platform) ?? undefined);
  const result = improveSpec(spec, brief, preset, { maxIterations: 3, targetScore });
  const report = coach(result.after, brief);
  return {
    spec: result.spec,
    score: result.after.score,
    iterations: result.steps.length,
    issues: result.after.findings.map((f) => f.messageAr),
    reportAr: report.text,
    improved: result.improved,
  };
}
