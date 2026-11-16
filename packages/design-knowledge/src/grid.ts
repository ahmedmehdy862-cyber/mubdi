/**
 * Layout grid toolkit: 8pt spacing, 12-column grids with RTL-aware inline
 * direction, safe areas, and rule-of-thirds guides.
 */

export const SPACING_SCALE = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160] as const;

export type Spacing = (typeof SPACING_SCALE)[number];

export function snap(value: number, unit = 8): number {
  return Math.round(value / unit) * unit;
}

export function snapDown(value: number, unit = 8): number {
  return Math.floor(value / unit) * unit;
}

/** Nearest value on the spacing scale (keeps rhythm consistent). */
export function space(value: number): Spacing {
  let best: Spacing = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const s of SPACING_SCALE) {
    const d = Math.abs(s - value);
    if (d < bestDiff) {
      bestDiff = d;
      best = s;
    }
  }
  return best;
}

export interface GridColumn {
  index: number;
  x: number;
  width: number;
}

export interface Grid {
  width: number;
  height: number;
  margin: number;
  columns: number;
  gutter: number;
  baseline: number;
  rtl: boolean;
  content: { x: number; y: number; width: number; height: number };
  /** Ordered from the reading start (right for RTL, left for LTR). */
  inline: GridColumn[];
  /** Ordered left-to-right regardless of direction. */
  physical: GridColumn[];
}

export interface GridOptions {
  width: number;
  height: number;
  margin: number;
  columns?: number;
  gutter?: number;
  baseline?: number;
  rtl?: boolean;
}

export function makeGrid(opts: GridOptions): Grid {
  const columns = opts.columns ?? 12;
  const gutter = opts.gutter ?? snap(opts.margin / 2, 8);
  const margin = opts.margin;
  const contentWidth = opts.width - margin * 2;
  const columnWidth = (contentWidth - gutter * (columns - 1)) / columns;
  const physical: GridColumn[] = [];
  for (let i = 0; i < columns; i++) {
    physical.push({ index: i, x: Math.round(margin + i * (columnWidth + gutter)), width: Math.round(columnWidth) });
  }
  const inline = opts.rtl ? [...physical].reverse().map((c, i) => ({ ...c, index: i })) : physical;
  return {
    width: opts.width,
    height: opts.height,
    margin,
    columns,
    gutter,
    baseline: opts.baseline ?? 8,
    rtl: Boolean(opts.rtl),
    content: { x: margin, y: margin, width: contentWidth, height: opts.height - margin * 2 },
    inline,
    physical,
  };
}

/** Rectangle covering `span` columns starting at inline column `start`. */
export function columnSpan(grid: Grid, start: number, span: number): { x: number; y: number; width: number; height: number } {
  const safeStart = Math.max(0, Math.min(grid.columns - 1, start));
  const safeSpan = Math.max(1, Math.min(grid.columns - safeStart, span));
  const slice = grid.inline.slice(safeStart, safeStart + safeSpan);
  const first = slice[0]!;
  const last = slice[slice.length - 1]!;
  const x = Math.min(first.x, last.x);
  const width = Math.max(first.x + first.width, last.x + last.width) - x;
  return { x, y: 0, width, height: grid.height };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function insetRect(rect: Rect, by: number): Rect {
  return { x: rect.x + by, y: rect.y + by, width: Math.max(1, rect.width - by * 2), height: Math.max(1, rect.height - by * 2) };
}

export function alignRectX(container: Rect, width: number, align: 'start' | 'center' | 'end', rtl: boolean): number {
  if (align === 'center') return Math.round(container.x + (container.width - width) / 2);
  const start = rtl ? 'right' : 'left';
  if (align === 'start') return start === 'right' ? container.x + container.width - width : container.x;
  return start === 'right' ? container.x : container.x + container.width - width;
}

export function thirds(width: number, height: number): { vertical: number[]; horizontal: number[] } {
  return {
    vertical: [Math.round(width / 3), Math.round((width * 2) / 3)],
    horizontal: [Math.round(height / 3), Math.round((height * 2) / 3)],
  };
}

/** Optical centre sits slightly above geometric centre (people read that as "centred"). */
export function opticalCenterY(height: number): number {
  return Math.round(height * 0.47);
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function safeRect(width: number, height: number, safe: SafeArea, margin: number): Rect {
  const x = Math.max(margin, safe.left);
  const y = Math.max(margin, safe.top);
  return {
    x,
    y,
    width: Math.max(1, width - x - Math.max(margin, safe.right)),
    height: Math.max(1, height - y - Math.max(margin, safe.bottom)),
  };
}

/** True when the value is on the 8pt rhythm (within half a pixel). */
export function isOnGrid(value: number, unit = 8, tolerance = 0.6): boolean {
  return Math.abs(value - Math.round(value / unit) * unit) <= tolerance;
}

export function rectArea(r: Rect): number {
  return r.width * r.height;
}

export function overlapArea(a: Rect, b: Rect): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

export function containsRect(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;
}
