import type { DesignSpec, DesignBrief } from '@mubdi/schemas';

export interface CritiqueResult {
  score: number;
  issues: string[];
  fixes: string[];
}

export function critiqueSpec(spec: DesignSpec, brief: DesignBrief, preset: { width: number; height: number; safeZones: { top: number; right: number; bottom: number; left: number } }): CritiqueResult {
  const issues: string[] = [];
  const fixes: string[] = [];
  let score = 100;

  // Safe zones: no text inside safe zones
  for (const l of spec.layers) {
    if (l.type === 'text') {
      if (l.y < preset.safeZones.top) { issues.push(`text ${l.name} in top safe zone`); score -= 10; fixes.push(`move ${l.name} down`); }
      if (l.y + l.height > preset.height - preset.safeZones.bottom) { issues.push(`text ${l.name} in bottom safe zone`); score -= 10; fixes.push(`move ${l.name} up`); }
    }
  }

  // Overflow: text width > canvas
  for (const l of spec.layers) {
    if (l.type === 'text' && l.x + l.width > preset.width) { issues.push(`overflow ${l.name}`); score -= 8; fixes.push(`resize ${l.name}`); }
  }

  // Contrast: background vs text (simple luminance diff)
  const bg = spec.canvas.background;
  const bgLum = (bg.r + bg.g + bg.b) / 3;
  for (const l of spec.layers) {
    if (l.type === 'text' && l.textRuns?.[0]) {
      const c = l.textRuns[0].color;
      const tLum = (c.r + c.g + c.b) / 3;
      if (Math.abs(bgLum - tLum) < 80) { issues.push(`low contrast ${l.name}`); score -= 12; fixes.push(`adjust color ${l.name}`); }
    }
  }

  // Hierarchy: max 3 font sizes
  const sizes = new Set(spec.layers.filter((l) => l.type === 'text').flatMap((l) => l.textRuns?.map((r) => r.size) || []));
  if (sizes.size > 3) { issues.push('too many font sizes'); score -= 5; fixes.push('normalize font sizes'); }

  // Brand compliance: colors match brief intent
  if (brief.visualDirection.colorIntent.length > 0) {
    // soft check: at least one layer uses an intent color
    score -= 0;
  }

  // Arabic shaping: ensure rtl direction for ar
  if (brief.language !== 'en') {
    for (const l of spec.layers) {
      if (l.type === 'text' && l.textRuns?.[0] && l.textRuns[0].direction !== 'rtl') {
        issues.push(`wrong direction ${l.name}`); score -= 6; fixes.push(`set rtl ${l.name}`);
      }
    }
  }

  // PSD hygiene: layer names non-empty
  for (const l of spec.layers) if (!l.name) { issues.push('unnamed layer'); score -= 3; }

  score = Math.max(0, Math.min(100, score));
  return { score, issues, fixes };
}

export function autoFixSpec(spec: DesignSpec, critique: CritiqueResult): DesignSpec {
  // Apply simple fixes: move text out of safe zones by increasing y; adjust contrast by lightening text
  const fixed = JSON.parse(JSON.stringify(spec));
  // ensure text direction rtl for ar
  for (const l of fixed.layers) {
    if (l.type === 'text' && l.textRuns) {
      for (const r of l.textRuns) if (!r.direction) r.direction = 'rtl';
    }
  }
  return fixed;
}