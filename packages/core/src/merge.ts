import type { DesignSpec } from '@mubdi/schemas';

export interface ImportedLayerLite { name: string; x: number; y: number; width: number; height: number; text?: string; visible: boolean; }

export function mergeSpecWithImport(spec: DesignSpec, imported: { layers: ImportedLayerLite[] }): DesignSpec {
  const out = JSON.parse(JSON.stringify(spec)) as DesignSpec;
  const byName = new Map(imported.layers.map((l) => [l.name, l]));
  for (const layer of out.layers) {
    const imp = byName.get(layer.name);
    if (!imp) continue;
    // position/size
    layer.x = imp.x; layer.y = imp.y; layer.width = Math.max(1, imp.width); layer.height = Math.max(1, imp.height);
    layer.visible = imp.visible;
    // text
    if (layer.type === 'text' && layer.textRuns && imp.text) {
      const run = layer.textRuns[0];
      if (run) run.text = imp.text;
    }
  }
  out.version = (out.version || 1) + 1;
  return out;
}