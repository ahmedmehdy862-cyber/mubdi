import type { Color, DesignSpec } from '@mubdi/schemas';

export type SpecDiff =
  | { op: 'set'; target: string; value: unknown }
  | { op: 'scale'; target: string; value: number }
  | { op: 'recolor'; target: string; value: Color };

export function parseEditCommand(cmd: string): SpecDiff[] {
  const diffs: SpecDiff[] = [];

  // "كبّر العنوان" / "make headline bigger"
  if (/كبّر|أكبر|bigger|larger|enlarge/i.test(cmd) && /عنوان|headline|title/i.test(cmd)) {
    diffs.push({ op: 'scale', target: 'HEADLINE', value: 1.25 });
  }
  const bgMatch = cmd.match(/(أزرق\s*الداكن|الأزرق\s*الداكن|dark blue|dark navy)/i);
  if (bgMatch) {
    diffs.push({ op: 'recolor', target: 'background', value: { r: 10, g: 18, b: 32, a: 1 } });
  } else if (/خلفية.*أزرق|background.*blue|غيّر.*للأزرق/i.test(cmd)) {
    diffs.push({ op: 'recolor', target: 'background', value: { r: 30, g: 58, b: 138, a: 1 } });
  }
  // "غيّر العنوان للأحمر"
  if (/عنوان.*أحمر|headline.*red/i.test(cmd)) {
    diffs.push({ op: 'recolor', target: 'HEADLINE', value: { r: 220, g: 38, b: 38, a: 1 } });
  }
  return diffs;
}

export function applyDiff(spec: DesignSpec, diff: SpecDiff): DesignSpec {
  const out = JSON.parse(JSON.stringify(spec)) as DesignSpec;
  for (const layer of out.layers) {
    if (diff.op === 'recolor' && diff.target === 'background' && layer.type === 'background') {
      layer.fill = diff.value;
      out.canvas.background = diff.value;
    }
    if (layer.name === diff.target) {
      if (diff.op === 'scale' && layer.type === 'text' && layer.textRuns?.[0]) {
        layer.textRuns[0].size = Math.round(layer.textRuns[0].size * diff.value);
        layer.height = Math.round(layer.height * diff.value);
      }
      if (diff.op === 'recolor' && layer.type === 'text' && layer.textRuns?.[0]) {
        layer.textRuns[0].color = diff.value;
      }
      if (diff.op === 'recolor' && layer.fill) {
        layer.fill = diff.value;
      }
    }
  }
  out.version = (out.version || 1) + 1;
  return out;
}

export function applyEdit(spec: DesignSpec, cmd: string): { spec: DesignSpec; diffs: SpecDiff[] } {
  const diffs = parseEditCommand(cmd);
  let cur = spec;
  for (const d of diffs) cur = applyDiff(cur, d);
  return { spec: cur, diffs };
}
