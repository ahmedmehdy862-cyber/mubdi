import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { Color, DesignSpec, Layer } from '@mubdi/schemas';

// Register Windows fonts we rely on. Missing fonts simply fall back.
for (const [path, alias] of [
  ['C:/Windows/Fonts/Cairo-Regular.ttf', 'Cairo'],
  ['C:/Windows/Fonts/Cairo-Bold.ttf', 'Cairo'],
  ['C:/Windows/Fonts/Almarai-Regular.ttf', 'Almarai'],
  ['C:/Windows/Fonts/Almarai-Font.ttf', 'Almarai'],
  ['C:/Windows/Fonts/Almarai-Bold.ttf', 'Almarai'],
  ['C:/Windows/Fonts/Tajawal-Regular.ttf', 'Tajawal'],
] as const) {
  try {
    GlobalFonts.registerFromPath(path, alias);
  } catch {
    // font not installed — ignore
  }
}

interface GradientMeta {
  from?: Color;
  to?: Color;
  angle?: number;
}

function colorCss(c: Color): string {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a ?? 1})`;
}

function meta(layer: Layer): Record<string, unknown> {
  return (layer.metadata ?? {}) as Record<string, unknown>;
}

function gradientOf(layer: Layer): GradientMeta | undefined {
  const value = meta(layer)['gradient'];
  return value && typeof value === 'object' ? (value as GradientMeta) : undefined;
}

function fontFamily(font: string): string {
  return font.replace(/-Bold$/i, '');
}

function roundedPath(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(Math.min(w, h) / 2, r));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function linearGradient(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  layer: Layer,
  gradient: GradientMeta,
): ReturnType<ReturnType<ReturnType<typeof createCanvas>['getContext']>['createLinearGradient']> {
  const angle = ((gradient.angle ?? 90) * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const half = (Math.abs(dx) * layer.width + Math.abs(dy) * layer.height) / 2;
  const g = ctx.createLinearGradient(
    cx - dx * half,
    cy - dy * half,
    cx + dx * half,
    cy + dy * half,
  );
  const from = gradient.from ?? layer.fill ?? { r: 0, g: 0, b: 0, a: 1 };
  const to = gradient.to ?? layer.fill ?? { r: 255, g: 255, b: 255, a: 1 };
  g.addColorStop(0, colorCss(from));
  g.addColorStop(1, colorCss(to));
  return g;
}

function drawPlaceholderMarks(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  layer: Layer,
): void {
  // Two quiet corner brackets signal an editable image slot without adding text.
  const size = Math.min(28, Math.min(layer.width, layer.height) * 0.12);
  const inset = Math.min(18, Math.min(layer.width, layer.height) * 0.06);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(2, Math.round(layer.width * 0.002));
  ctx.beginPath();
  ctx.moveTo(layer.x + inset, layer.y + inset + size);
  ctx.lineTo(layer.x + inset, layer.y + inset);
  ctx.lineTo(layer.x + inset + size, layer.y + inset);
  ctx.moveTo(layer.x + layer.width - inset - size, layer.y + layer.height - inset);
  ctx.lineTo(layer.x + layer.width - inset, layer.y + layer.height - inset);
  ctx.lineTo(layer.x + layer.width - inset, layer.y + layer.height - inset - size);
  ctx.stroke();
  ctx.restore();
}

function drawShape(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  layer: Layer,
): void {
  const info = meta(layer);
  const kind = typeof info['shape'] === 'string' ? (info['shape'] as string) : 'rect';
  const radius = typeof info['radius'] === 'number' ? (info['radius'] as number) : 0;
  const gradient = gradientOf(layer);
  const fill = layer.fill ?? { r: 128, g: 128, b: 128, a: 1 };
  const { x, y, width: w, height: h } = layer;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));

  if (kind === 'line') {
    ctx.fillStyle = colorCss(fill);
    ctx.fillRect(x, y, w, Math.max(1, h));
  } else if (kind === 'circle') {
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    ctx.beginPath();
    ctx.ellipse(
      x + w / 2,
      y + h / 2,
      Math.max(0.5, w / 2),
      Math.max(0.5, h / 2),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else if (kind === 'frame') {
    ctx.strokeStyle = colorCss(fill);
    ctx.lineWidth = Math.max(1.5, Math.round(Math.min(w, h) * 0.004));
    ctx.strokeRect(
      x + ctx.lineWidth / 2,
      y + ctx.lineWidth / 2,
      Math.max(1, w - ctx.lineWidth),
      Math.max(1, h - ctx.lineWidth),
    );
  } else if (kind === 'image') {
    if (gradient) {
      ctx.fillStyle = linearGradient(ctx, layer, gradient);
    } else {
      ctx.fillStyle = colorCss(fill);
    }
    roundedPath(ctx, x, y, w, h, radius);
    ctx.fill();
    if (info['placeholder']) drawPlaceholderMarks(ctx, layer);
  } else if (kind === 'scrim') {
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    ctx.fillRect(x, y, w, h);
  } else {
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    if (radius > 0) {
      roundedPath(ctx, x, y, w, h, radius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

function drawText(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  layer: Layer,
): void {
  const run = layer.textRuns?.[0];
  if (!run) return;
  const info = meta(layer);
  const align =
    typeof info['align'] === 'string' ? (info['align'] as 'start' | 'center' | 'end') : 'start';
  const rtl = run.direction === 'rtl';
  const leading = run.leading ?? (run.size > 60 ? 1.28 : 1.55);
  const lineHeight = run.size * leading;
  const lines = run.text.split('\n');

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));
  ctx.fillStyle = colorCss(run.color);
  ctx.font = `${run.bold ? 'bold ' : ''}${run.size}px "${fontFamily(run.font)}"`;
  ctx.textBaseline = 'top';

  let x = layer.x;
  let textAlign: 'left' | 'right' | 'center' = 'left';
  if (align === 'center') {
    x = layer.x + layer.width / 2;
    textAlign = 'center';
  } else if (align === 'start') {
    if (rtl) {
      x = layer.x + layer.width;
      textAlign = 'right';
    }
  } else if (rtl) {
    textAlign = 'left';
  } else {
    x = layer.x + layer.width;
    textAlign = 'right';
  }
  ctx.textAlign = textAlign;

  // Small optical offset: Arabic ascenders sit tight against the top edge.
  const top = layer.y + run.size * 0.08;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, top + index * lineHeight);
  });
  ctx.restore();
}

export * from './analyze.js';

export function renderSpecToPng(spec: DesignSpec): Buffer {
  const canvas = createCanvas(spec.canvas.width, spec.canvas.height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colorCss(spec.canvas.background);
  ctx.fillRect(0, 0, spec.canvas.width, spec.canvas.height);

  const sorted = [...spec.layers]
    .filter((l) => l.visible !== false && l.type !== 'guide')
    .sort((a, b) => a.z - b.z);
  for (const layer of sorted) {
    if (layer.type === 'text') drawText(ctx, layer);
    else if (
      layer.type === 'shape' ||
      layer.type === 'image' ||
      layer.type === 'overlay' ||
      layer.type === 'background'
    )
      drawShape(ctx, layer);
  }

  return canvas.toBuffer('image/png');
}
