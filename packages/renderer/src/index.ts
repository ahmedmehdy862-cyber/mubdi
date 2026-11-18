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
  const effects = layer.effects ?? [];

  // soft-shadow applies to the next fill/stroke only — scoped per branch.
  const withShadow = (draw: () => void): void => {
    effectStyles(ctx, layer, effects);
    draw();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));

  if (kind === 'star4') {
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    withShadow(() => drawStar4(ctx, x, y, w, h));
  } else if (kind === 'tape') {
    const angle =
      typeof info['angle'] === 'number' ? ((info['angle'] as number) * Math.PI) / 180 : 0;
    ctx.save();
    ctx.globalAlpha *= 0.9;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.fillStyle = colorCss(fill);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  } else if (kind === 'ring') {
    const stroke = Math.max(2, typeof info['stroke'] === 'number' ? (info['stroke'] as number) : 4);
    ctx.strokeStyle = colorCss(fill);
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.ellipse(
      x + w / 2,
      y + h / 2,
      Math.max(0.5, w / 2 - stroke / 2),
      Math.max(0.5, h / 2 - stroke / 2),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else if (kind === 'blob') {
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    withShadow(() => drawBlob(ctx, layer));
  } else if (kind === 'pattern') {
    drawPatternVeil(
      ctx,
      layer,
      typeof info['pattern'] === 'string' ? (info['pattern'] as string) : 'islamic',
    );
  } else if (kind === 'diag') {
    const rise = typeof info['rise'] === 'number' ? (info['rise'] as number) : h * 0.2;
    const rtl = info['rtl'] === true;
    ctx.fillStyle = gradient ? linearGradient(ctx, layer, gradient) : colorCss(fill);
    ctx.beginPath();
    if (rtl) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + rise);
    } else {
      ctx.moveTo(x, y + rise);
      ctx.lineTo(x + w, y);
    }
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'device') {
    // bezel
    ctx.fillStyle = colorCss(fill);
    withShadow(() => {
      roundedPath(ctx, x, y, w, h, radius || w * 0.09);
      ctx.fill();
    });
    // screen
    const inset = Math.max(8, w * 0.055);
    ctx.fillStyle = typeof info['screen'] === 'string' ? (info['screen'] as string) : '#101418';
    roundedPath(
      ctx,
      x + inset,
      y + inset,
      w - inset * 2,
      h - inset * 2,
      Math.max(4, (radius || w * 0.09) * 0.7),
    );
    ctx.fill();
    // accent bar inside screen
    ctx.fillStyle =
      typeof info['accent'] === 'string' ? (info['accent'] as string) : colorCss(fill);
    roundedPath(ctx, x + inset * 2.4, y + inset * 2, w - inset * 4.8, Math.max(10, h * 0.045), 6);
    ctx.fill();
  } else if (kind === 'badge') {
    ctx.fillStyle = colorCss(fill);
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    const dotColor = typeof info['dot'] === 'string' ? (info['dot'] as string) : null;
    if (dotColor) {
      ctx.fillStyle = dotColor;
      const d = Math.min(w, h) * 0.32;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, d / 2, d / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // checkmark-like core: accent dot kept neutral
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.08);
      ctx.beginPath();
      ctx.moveTo(x + w * 0.34, y + h * 0.52);
      ctx.lineTo(x + w * 0.46, y + h * 0.64);
      ctx.lineTo(x + w * 0.68, y + h * 0.38);
      ctx.stroke();
    }
  } else if (kind === 'line') {
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
    withShadow(() => ctx.fill());
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
      withShadow(() => {
        roundedPath(ctx, x, y, w, h, radius);
        ctx.fill();
      });
    } else {
      withShadow(() => ctx.fillRect(x, y, w, h));
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

type Ctx2D = ReturnType<ReturnType<typeof createCanvas>['getContext']>;

function effectStyles(ctx: Ctx2D, layer: Layer, effects: string[] | undefined): void {
  if (effects?.includes('soft-shadow')) {
    ctx.shadowColor = 'rgba(12,16,22,0.28)';
    ctx.shadowBlur = Math.max(10, layer.width * 0.06);
    ctx.shadowOffsetY = Math.max(4, layer.height * 0.025);
  }
}

function drawStar4(ctx: Ctx2D, x: number, y: number, w: number, h: number): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const outer = Math.min(w, h) / 2;
  const inner = outer * 0.3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBlob(ctx: Ctx2D, layer: Layer): void {
  const { x, y, width: w, height: h } = layer;
  // 4-point organic blob: quadratic loop with irregular control points.
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.06);
  // piecewise quadratic loops through the anchor points for an organic silhouette
  const pts = [
    [0.5, 0.06],
    [0.88, 0.35],
    [0.8, 0.86],
    [0.42, 0.96],
    [0.1, 0.62],
    [0.24, 0.14],
  ] as const;
  pts.forEach(([px, py], i) => {
    const next = pts[(i + 1) % pts.length]!;
    const midX = x + ((px + next[0]) / 2) * w;
    const midY = y + ((py + next[1]) / 2) * h;
    ctx.quadraticCurveTo(x + px * w, y + py * h, midX, midY);
  });
  ctx.closePath();
  ctx.fill();
}

function drawPatternVeil(ctx: Ctx2D, layer: Layer, style: string): void {
  const { x, y, width: w, height: h } = layer;
  const cell = Math.max(24, Math.round((layer.metadata['cell'] as number) ?? 64));
  const alpha = layer.opacity ?? 0.06;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colorCss(layer.fill ?? { r: 20, g: 20, b: 20, a: 1 });
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = Math.max(1.5, cell * 0.045);
  if (style === 'dots') {
    for (let py = y + cell / 2; py < y + h; py += cell) {
      for (let px = x + cell / 2; px < x + w; px += cell) {
        ctx.beginPath();
        ctx.ellipse(px, py, cell * 0.06, cell * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'grid') {
    for (let px = x; px < x + w; px += cell) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }
    for (let py = y; py < y + h; py += cell) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  } else {
    // islamic: octagon-star lattice (two rotated squares per cell)
    for (let py = y; py < y + h; py += cell) {
      for (let px = x; px < x + w; px += cell) {
        const cx = px + cell / 2;
        const cy = py + cell / 2;
        const r = cell * 0.3;
        for (const rot of [Math.PI / 8, -Math.PI / 8]) {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = rot + (Math.PI / 2) * i;
            const px1 = cx + Math.cos(a) * r;
            const py1 = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px1, py1);
            else ctx.lineTo(px1, py1);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

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
