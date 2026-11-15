import { initializeCanvas } from 'ag-psd';
import * as napi from '@napi-rs/canvas';
initializeCanvas(napi.createCanvas as any);
import { writePsdBuffer, readPsd } from 'ag-psd';
import type { DesignSpec, Layer, Color } from '@mubdi/schemas';

export type PsdMode = 'editable' | 'safe';

const GROUPS = ['00_Guides', '10_Text', '20_Brand', '30_Graphics', '40_Imagery', '50_Overlays', '90_Background'];

function colorToAg(c: Color): { r: number; g: number; b: number } {
  return { r: c.r, g: c.g, b: c.b };
}

function makeImageData(w: number, h: number, c: Color) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = Math.round(c.a * 255);
  }
  return { width: w, height: h, data };
}

function groupFor(layer: Layer): string {
  if (layer.type === 'guide') return '00_Guides';
  if (layer.type === 'text') return '10_Text';
  if (layer.id === 'logo' || layer.name === 'LOGO') return '20_Brand';
  if (layer.type === 'image') return '40_Imagery';
  if (layer.type === 'background') return '90_Background';
  if (layer.type === 'overlay') return '50_Overlays';
  return '30_Graphics';
}

function layerToPsd(layer: Layer, mode: PsdMode): any {
  const base: any = {
    name: layer.name,
    top: layer.y,
    left: layer.x,
    bottom: layer.y + layer.height,
    right: layer.x + layer.width,
    opacity: Math.round(layer.opacity * 255),
    blendMode: layer.blendMode || 'normal',
    visible: layer.visible,
  };

  if (layer.type === 'text' && layer.textRuns && layer.textRuns.length) {
    const run = layer.textRuns![0]!;
    const isRtl = run.direction === 'rtl';
    if (mode === 'editable') {
      base.text = {
        text: run.text,
        transform: [1, 0, 0, 1, 0, 0],
        style: {
          fontSize: run.size,
          fillColor: colorToAg(run.color),
          font: { name: run.font },
          fauxBold: run.bold,
          fauxItalic: run.italic,
          tracking: run.tracking,
        },
        left: layer.x,
        top: layer.y,
        right: layer.x + layer.width,
        bottom: layer.y + layer.height,
        orientation: 'horizontal',
        paragraphStyle: { justification: isRtl ? 2 : 0 },
      };
    } else {
      // Safe mode: rasterize text as image; keep hidden live text copy
      const canvas = napi.createCanvas(layer.width, layer.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = `rgb(${run.color.r},${run.color.g},${run.color.b})`;
      ctx.font = `${run.bold ? 'bold ' : ''}${run.size}px ${run.font.replace('-Bold', '')}`;
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(run.text, isRtl ? layer.width - 8 : 8, 8);
      base.canvas = canvas;
      base.visible = true;
      // hidden live text copy layer appended separately by caller? We'll add as child with visible false
    }
  } else if (layer.type === 'background' || layer.type === 'shape' || layer.type === 'image' || layer.type === 'overlay') {
    const fill = layer.fill || { r: 128, g: 128, b: 128, a: 1 };
    base.imageData = makeImageData(Math.max(1, layer.width), Math.max(1, layer.height), fill);
    if (layer.mask) {
      base.mask = {
        top: layer.y, left: layer.x, bottom: layer.y + layer.height, right: layer.x + layer.width,
        defaultColor: 0, density: 255, feather: 0,
      };
    }
  } else {
    // guide group: empty
  }

  if (layer.visible === false) base.visible = false;
  return base;
}

export function specToPsd(spec: DesignSpec, mode: PsdMode = 'editable'): Buffer {
  // Build group map
  const groupMap: Record<string, any[]> = {};
  for (const g of GROUPS) groupMap[g] = [];

  for (const layer of spec.layers) {
    const g = groupFor(layer);
    const psdLayer = layerToPsd(layer, mode);
    const arr = groupMap[g]!;

    if (mode === 'safe' && layer.type === 'text' && layer.textRuns && layer.textRuns.length) {
      const run = layer.textRuns![0]!;
      const isRtl = run.direction === 'rtl';
      // hidden live text copy
      const copyLayer = {
        name: layer.name + ' (live text)',
        top: layer.y, left: layer.x, bottom: layer.y + layer.height, right: layer.x + layer.width,
        opacity: Math.round(layer.opacity * 255),
        blendMode: layer.blendMode || 'normal',
        visible: false,
        text: {
          text: run.text,
          transform: [1, 0, 0, 1, 0, 0],
          style: { fontSize: run.size, fillColor: { r: run.color.r, g: run.color.g, b: run.color.b }, font: { name: run.font }, fauxBold: run.bold, fauxItalic: run.italic, tracking: run.tracking },
          left: layer.x, top: layer.y, right: layer.x + layer.width, bottom: layer.y + layer.height,
          orientation: 'horizontal',
          paragraphStyle: { justification: isRtl ? 2 : 0 },
        },
      };
      arr.push(psdLayer);
      arr.push(copyLayer);
    } else {
      arr.push(psdLayer);
    }
  }

  const children = GROUPS.map((g) => ({
    name: g,
    visible: g !== '00_Guides',
    children: groupMap[g] ?? [],
  }));

  const psd: any = {
    width: spec.canvas.width,
    height: spec.canvas.height,
    channels: 3,
    bitsPerChannel: 8,
    colorMode: 3,
    children,
  };

  return writePsdBuffer(psd);
}

export function validatePsd(buf: Buffer, spec: DesignSpec): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    const r = readPsd(buf, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true });
    if (r.width !== spec.canvas.width || r.height !== spec.canvas.height) {
      errors.push(`canvas mismatch: ${r.width}x${r.height} vs ${spec.canvas.width}x${spec.canvas.height}`);
    }
    const names = new Set<string>();
    function collect(layers: any[]) { for (const l of layers || []) { if (l.name) names.add(l.name); if (l.children) collect(l.children); } }
    collect(r.children || []);
    // Check groups present
    for (const g of GROUPS) if (!names.has(g)) errors.push(`missing group ${g}`);
    // Check text layers present
    for (const l of spec.layers.filter((x) => x.type === 'text')) {
      if (!names.has(l.name)) errors.push(`missing text layer ${l.name}`);
    }
  } catch (e: any) {
    errors.push('read failed: ' + e.message);
  }
  return { ok: errors.length === 0, errors };
}

export function listFonts(spec: DesignSpec): string[] {
  return [...new Set(spec.fonts)];
}

export * from './import';