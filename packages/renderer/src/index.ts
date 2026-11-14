import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { DesignSpec } from '@mubdi/schemas';

try { GlobalFonts.registerFromPath('C:/Windows/Fonts/Cairo-Regular.ttf', 'Cairo'); } catch {}
try { GlobalFonts.registerFromPath('C:/Windows/Fonts/Cairo-Bold.ttf', 'Cairo'); } catch {}
try { GlobalFonts.registerFromPath('C:/Windows/Fonts/Almarai-Font.ttf', 'Almarai'); } catch {}

function colorCss(c: { r: number; g: number; b: number; a?: number }): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a ?? 1})`;
}

export function renderSpecToPng(spec: DesignSpec): Buffer {
  const canvas = createCanvas(spec.canvas.width, spec.canvas.height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colorCss(spec.canvas.background);
  ctx.fillRect(0, 0, spec.canvas.width, spec.canvas.height);

  const sorted = [...spec.layers].sort((a, b) => a.z - b.z);
  for (const layer of sorted) {
    if (layer.visible === false) continue;
    if (layer.type === 'text' && layer.textRuns && layer.textRuns.length) {
      const run = layer.textRuns![0]!;
      const isRtl = run.direction === 'rtl';
      ctx.fillStyle = colorCss(run.color);
      const weight = run.bold ? 'bold ' : '';
      ctx.font = `${weight}${run.size}px ${run.font.replace('-Bold', '')}`;
      ctx.textAlign = isRtl ? 'right' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(run.text, isRtl ? layer.x + layer.width - 8 : layer.x + 8, layer.y + 8);
    } else if (layer.fill) {
      ctx.fillStyle = colorCss(layer.fill);
      ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
    }
  }

  return canvas.toBuffer('image/png');
}