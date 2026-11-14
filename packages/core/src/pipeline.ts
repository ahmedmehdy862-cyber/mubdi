import { critiqueSpec, autoFixSpec } from './critique';
import type { DesignSpec, DesignBrief } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';

export interface PipelineResult {
  spec: DesignSpec;
  score: number;
  iterations: number;
  issues: string[];
}

export function runCritiqueLoop(spec: DesignSpec, brief: DesignBrief): PipelineResult {
  let current = spec;
  let result = critiqueSpec(current, brief, getPreset(current.canvas.platform)!);
  let iterations = 0;
  while (result.score < 85 && iterations < 2) {
    current = autoFixSpec(current, result);
    iterations++;
    result = critiqueSpec(current, brief, getPreset(current.canvas.platform)!);
  }
  return { spec: current, score: result.score, iterations, issues: result.issues };
}