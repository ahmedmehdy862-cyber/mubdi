import { alignRectX, makeGrid, safeRect, space, type Grid, type Rect } from './grid.js';
import { measureTextWidth, textBlockHeight, wrapText, type TypeScale } from './typography.js';
import type { ArtDirection } from './direction.js';
import type { Palette } from './color.js';

/**
 * Composition engine. Each archetype is a real layout recipe: it decides
 * zones, stack order, alignment, focal point and supporting shapes — then
 * measures the wrapped text so nothing overlaps or overflows.
 */

export type TextRole = 'eyebrow' | 'headline' | 'subhead' | 'body' | 'cta' | 'footer' | 'logo';

export interface PlannedText {
  role: TextRole;
  text: string;
  lines: string[];
  rect: Rect;
  align: 'start' | 'center' | 'end';
  size: number;
  leading: number;
  weight: 'regular' | 'bold';
  color: string;
  track: number;
  /** Actual colour behind the glyphs (panel/pill) — contrast is solved
   * against this instead of the page background when present. */
  backdropHex?: string;
}

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'line'
  | 'frame'
  | 'scrim'
  | 'image'
  // Q4/Q3 rich primitives (see docs/design-language.md §7)
  | 'star4' // four-point sparkle
  | 'tape' // washi-tape strip (slightly rotated rect)
  | 'ring' // donut / outline circle
  | 'blob' // organic rounded shape
  | 'pattern' // geometric pattern veil (islamic / dots / grid)
  | 'diag' // diagonal split block
  | 'ribbon' // wide banner band
  | 'device' // device/app-frame mockup
  | 'badge'; // icon-carrying circle badge

export interface PlannedShape {
  id: string;
  kind: ShapeKind;
  rect: Rect;
  fill: string;
  opacity: number;
  radius?: number;
  gradient?: { from: string; to: string; angle: number };
  noteAr?: string;
  /** Renderer effect tags: 'soft-shadow' | 'glow' | … */
  effects?: string[];
  /** Crisp outline drawn over the fill (panel borders) — the boundary that
   *  the pixel critic can actually see; shadows alone diffuse it away. */
  stroke?: { color: string; width: number };
  /** Extra drawing parameters (star points, pattern style, tape angle…). */
  meta?: Record<string, unknown>;
}

export interface LayoutPlan {
  archetype: string;
  nameAr: string;
  rationaleAr: string;
  blocks: PlannedText[];
  shapes: PlannedShape[];
  imageArea?: Rect;
  readingFlow: 'rtl-z' | 'rtl-stack' | 'center';
  focal: { x: number; y: number };
}

/**
 * Q2 guarantee: no archetype may silently drop content-pack rows. If the
 * chosen layout omitted the body rows (details) or the contact footer, they
 * are inserted into the largest free vertical band of the plan — every
 * template added in Q3 inherits this contract for free.
 */
export function ensureContentSlots(
  plan: LayoutPlan,
  copy: ComposeCopy,
  ctx: {
    content: Rect;
    type: TypeScale;
    rtl: boolean;
    textColor: string;
    mutedColor: string;
    /** Pill fill for a synthesised CTA (defaults to textColour-free onPill contrast). */
    pillColor?: string;
  },
): PlannedText[] {
  const added: PlannedText[] = [];
  const addedShapes: PlannedShape[] = [];
  const has = (role: TextRole) => plan.blocks.some((b) => b.role === role);

  const mkBlock = (
    role: TextRole,
    text: string,
    size: number,
    weight: 'regular' | 'bold',
    color: string,
    top: number,
    height: number,
  ): PlannedText => ({
    role,
    text,
    lines: text.split('\n'),
    rect: {
      x: ctx.content.x,
      y: Math.round(top),
      width: ctx.content.width,
      height: Math.round(height),
    },
    align: 'start',
    size,
    leading: 1.5,
    weight,
    color,
    track: 0,
  });

  /* --- contact / hashtags footer: pin the bottom strip FIRST so the CTA
         and body rows never collide with it --- */
  const footerSize = ctx.type.caption;
  const footerNeeded = footerSize * 2;
  const footerTop = ctx.content.y + ctx.content.height - footerNeeded - 8;
  const footerTops: Array<{ top: number; bottom: number }> = [];
  if (copy.footer && !has('footer')) {
    added.push(
      mkBlock('footer', copy.footer, footerSize, 'regular', ctx.textColor, footerTop, footerNeeded),
    );
    footerTops.push({ top: footerTop, bottom: footerTop + footerNeeded });
  }

  /* --- CTA pill (for archetypes that omit calls to action) --- */
  const ctaBlocked: Array<{ top: number; bottom: number }> = [];
  if (copy.cta && !has('cta')) {
    const pillHeight = Math.max(64, Math.round(ctx.type.body * 2));
    const pillWidth = Math.min(ctx.content.width * 0.62, pillHeight * 4.4);
    const pillX = ctx.rtl ? ctx.content.x + ctx.content.width - pillWidth : ctx.content.x;
    const pillTop = footerTop - pillHeight - 24;
    if (pillTop > ctx.content.y + 80) {
      addedShapes.push({
        id: 'cta-bg',
        kind: 'rect',
        rect: {
          x: pillX,
          y: Math.round(pillTop),
          width: Math.round(pillWidth),
          height: pillHeight,
        },
        fill: ctx.pillColor ?? ctx.textColor,
        opacity: 1,
        radius: Math.round(pillHeight / 2),
      });
      added.push(
        mkBlock(
          'cta',
          copy.cta,
          Math.round(ctx.type.body * 0.9),
          'bold',
          ctx.textColor,
          pillTop + (pillHeight - Math.round(ctx.type.body * 0.9)) / 2,
          Math.round(ctx.type.body * 1.4),
        ),
      );
      ctaBlocked.push({ top: pillTop, bottom: pillTop + pillHeight });
    }
  }

  /* --- supporting line (subhead) for quote-style layouts --- */
  const subBlocked: Array<{ top: number; bottom: number }> = [];
  if (copy.subhead && !has('subhead')) {
    const size = Math.round(ctx.type.body * 0.95);
    const needed = size * 1.9;
    const top =
      footerTop - needed - 24 - (ctaBlocked.length ? ctaBlocked[0]!.bottom - footerTop : 0);
    if (top > ctx.content.y + 120) {
      added.push(mkBlock('subhead', copy.subhead, size, 'regular', ctx.mutedColor, top, needed));
      subBlocked.push({ top, bottom: top + needed });
    }
  }

  const blocked = footerTops
    .concat(ctaBlocked, subBlocked)
    .concat(plan.blocks.map((b) => ({ top: b.rect.y, bottom: b.rect.y + b.rect.height })))
    .sort((a, b) => a.top - b.top);
  const gaps: Array<{ top: number; bottom: number }> = [];
  let cursor = ctx.content.y;
  for (const span of blocked) {
    if (span.top - cursor >= 40) gaps.push({ top: cursor, bottom: span.top });
    cursor = Math.max(cursor, span.bottom);
  }
  if (ctx.content.y + ctx.content.height - cursor - 40 >= 40) {
    gaps.push({ top: cursor, bottom: ctx.content.y + ctx.content.height - 40 });
  }
  const fit = (needed: number) =>
    gaps
      .filter((g) => g.bottom - g.top >= needed)
      .sort((a, b) => b.bottom - b.top - (a.bottom - a.top))[0];

  /* --- body rows (details) --- */
  if (copy.body && !has('body')) {
    const lines = copy.body.split('\n').filter(Boolean);
    const size = ctx.type.body;
    const needed = lines.length * size * 1.5;
    const gap = fit(needed);
    if (gap) {
      const top = gap.bottom - needed;
      added.unshift(
        mkBlock('body', lines.join('\n'), size, 'regular', ctx.mutedColor, top, needed),
      );
    }
  }

  plan.blocks.push(...added);
  plan.shapes.push(...addedShapes);
  return added;
}

export interface ComposeCopy {
  eyebrow?: string;
  headline: string;
  subhead?: string;
  body?: string;
  cta?: string;
  footer?: string;
  logo?: string;
  /** Content-pack hashtags (Q2) — rendered by the template footer bars. */
  hashtags?: string[];
}

export interface ComposeInput {
  preset: {
    width: number;
    height: number;
    margins: number;
    safeZones: { top: number; right: number; bottom: number; left: number };
    minFontSize: number;
  };
  direction: ArtDirection;
  type: TypeScale;
  copy: ComposeCopy;
  palette: Palette;
  rtl: boolean;
  variant: number;
}

interface Ctx extends ComposeInput {
  page: Rect;
  content: Rect;
  grid: Grid;
}

const gapFor = (n: number): number => space(n);

function makeCtx(input: ComposeInput): Ctx {
  const page: Rect = { x: 0, y: 0, width: input.preset.width, height: input.preset.height };
  const content = safeRect(
    input.preset.width,
    input.preset.height,
    input.preset.safeZones,
    input.preset.margins,
  );
  const grid = makeGrid({
    width: input.preset.width,
    height: input.preset.height,
    margin: Math.round(content.x),
    rtl: input.rtl,
  });
  return { ...input, page, content, grid };
}

function buildText(
  ctx: Ctx,
  role: TextRole,
  text: string,
  opts: {
    size: number;
    align: 'start' | 'center' | 'end';
    width: number;
    color: string;
    weight?: 'regular' | 'bold';
    leading?: number;
    maxLines?: number;
    y?: number;
  },
): PlannedText {
  const lines = wrapText(text, {
    maxWidth: opts.width,
    fontSize: opts.size,
    maxLines: opts.maxLines ?? 4,
  });
  const leading =
    opts.leading ?? (role === 'headline' ? ctx.type.leading.heading : ctx.type.leading.body);
  const height = textBlockHeight(lines, opts.size, leading);
  const x = alignRectX(
    { x: ctx.content.x, y: 0, width: opts.width, height },
    opts.width,
    opts.align,
    ctx.rtl,
  );
  return {
    role,
    text,
    lines,
    rect: { x, y: opts.y ?? 0, width: opts.width, height },
    align: opts.align,
    size: opts.size,
    leading,
    weight: opts.weight ?? (role === 'headline' || role === 'cta' ? 'bold' : 'regular'),
    color: opts.color,
    track: 0,
  };
}

/** Vertical stack: sets y positions, returns the bottom edge. */
function stack(
  blocks: PlannedText[],
  anchorY: number,
  direction: 'down' | 'up',
  gap: number,
): number {
  let cursor = anchorY;
  const ordered = direction === 'down' ? blocks : [...blocks].reverse();
  for (const block of ordered) {
    if (direction === 'down') {
      block.rect.y = Math.round(cursor);
      cursor += block.rect.height + gap;
    } else {
      cursor -= block.rect.height;
      block.rect.y = Math.round(cursor);
      cursor -= gap;
    }
  }
  return direction === 'down' ? cursor - gap : cursor + gap;
}

function totalHeight(blocks: PlannedText[], gap: number): number {
  return blocks.reduce((sum, b) => sum + b.rect.height, 0) + gap * Math.max(0, blocks.length - 1);
}

function centerX(container: Rect, width: number): number {
  return Math.round(container.x + (container.width - width) / 2);
}

function logoBlock(ctx: Ctx): PlannedText {
  const size = Math.max(ctx.preset.minFontSize, Math.round(ctx.type.caption * 0.95));
  const label = ctx.copy.logo ?? '';
  return {
    role: 'logo',
    text: label,
    lines: [label],
    rect: { x: 0, y: 0, width: measureTextWidth(label, size) + 8, height: Math.round(size * 1.4) },
    align: 'start',
    size,
    leading: 1.3,
    weight: 'bold',
    color: ctx.palette.text,
    track: 0,
  };
}

// ---------------------------------------------------------------------------
// Archetypes
// ---------------------------------------------------------------------------

function posterStack(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const width = Math.round(content.width * 0.92);
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.display,
    align: 'start',
    width,
    color: palette.text,
    maxLines: 3,
  });
  const eyebrow = copy.eyebrow
    ? buildText(ctx, 'eyebrow', copy.eyebrow, {
        size: type.eyebrow,
        align: 'start',
        width,
        color: palette.accent,
        maxLines: 1,
      })
    : undefined;
  const subhead = copy.subhead
    ? buildText(ctx, 'subhead', copy.subhead, {
        size: type.h3,
        align: 'start',
        width,
        color: palette.textMuted,
        maxLines: 2,
      })
    : undefined;

  const ctaText = copy.cta ?? '';
  const cta = ctaText
    ? buildText(ctx, 'cta', ctaText, {
        size: type.cta,
        align: 'center',
        width: Math.max(220, measureTextWidth(ctaText, type.cta) + type.cta * 2.6),
        color: palette.onPrimary,
        maxLines: 1,
      })
    : undefined;

  const gap = gapFor(Math.round(type.body * 0.75));
  const stackBlocks = [eyebrow, headline, subhead].filter((b): b is PlannedText => Boolean(b));
  const stackH = totalHeight(stackBlocks, gap);
  const ctaH = cta ? cta.rect.height + gapFor(32) : 0;
  const bottomY = content.y + content.height - ctaH;
  const topY = Math.round(bottomY - stackH);
  stack(stackBlocks, Math.max(content.y, topY), 'down', gap);

  if (cta) {
    const shapeY = content.y + content.height - cta.rect.height;
    cta.rect.x = alignRectX(
      { x: content.x, y: 0, width: content.width, height: 1 },
      cta.rect.width,
      'start',
      ctx.rtl,
    );
    cta.rect.y = Math.round(shapeY + (cta.rect.height - cta.rect.height) / 2);
    const ctaShape: PlannedShape = {
      id: 'cta-bg',
      kind: 'rect',
      rect: {
        x: cta.rect.x,
        y: Math.round(shapeY),
        width: cta.rect.width,
        height: cta.rect.height,
      },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(16),
    };
    return {
      archetype: 'poster-stack',
      nameAr: 'ملصق عمودي',
      rationaleAr: 'عنوان ضخم في الثلث السفلي مع فراغ علوي يمنح العنوان حضوراً ومساحة تنفّس.',
      blocks: [
        ...stackBlocks,
        cta,
        ...(logoBlock(ctx).text
          ? [
              {
                ...logoBlock(ctx),
                rect: {
                  ...logoBlock(ctx).rect,
                  x: alignRectX(content, logoBlock(ctx).rect.width, 'start', ctx.rtl),
                  y: content.y,
                },
              },
            ]
          : []),
      ],
      shapes: [
        ctaShape,
        {
          id: 'accent-bar',
          kind: 'rect',
          rect: {
            x: alignRectX(content, 8, 'start', ctx.rtl),
            y: content.y,
            width: 8,
            height: gapFor(96),
          },
          fill: palette.accent,
          opacity: 1,
        },
        {
          id: 'halo',
          kind: 'circle',
          rect: {
            x: alignRectX(content, content.width * 0.55, 'end', ctx.rtl),
            y: content.y + content.height * 0.06,
            width: content.width * 0.55,
            height: content.width * 0.55,
          },
          fill: palette.primary,
          opacity: 0.08,
        },
      ],
      readingFlow: 'rtl-z',
      focal: {
        x: content.x + content.width * 0.5,
        y: headline.rect.y + headline.rect.height * 0.4,
      },
    };
  }

  return {
    archetype: 'poster-stack',
    nameAr: 'ملصق عمودي',
    rationaleAr: 'عنوان ضخم مع فراغ علوي محسوب.',
    blocks: [
      ...stackBlocks,
      {
        ...logoBlock(ctx),
        rect: {
          ...logoBlock(ctx).rect,
          x: alignRectX(content, logoBlock(ctx).rect.width, 'start', ctx.rtl),
          y: content.y,
        },
      },
    ],
    shapes: [
      {
        id: 'accent-bar',
        kind: 'rect',
        rect: {
          x: alignRectX(content, 8, 'start', ctx.rtl),
          y: content.y,
          width: 8,
          height: gapFor(96),
        },
        fill: palette.accent,
        opacity: 1,
      },
    ],
    readingFlow: 'rtl-z',
    focal: { x: content.x + content.width * 0.5, y: headline.rect.y + headline.rect.height * 0.4 },
  };
}

function editorialStack(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const columnWidth = Math.round(content.width * 0.72);
  const blocks: PlannedText[] = [];
  const shapes: PlannedShape[] = [];

  const eyebrow = copy.eyebrow
    ? buildText(ctx, 'eyebrow', copy.eyebrow, {
        size: type.eyebrow,
        align: 'start',
        width: columnWidth,
        color: palette.accent,
        maxLines: 1,
      })
    : undefined;
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.h1,
    align: 'start',
    width: columnWidth,
    color: palette.text,
    maxLines: 3,
  });
  const body = copy.body
    ? buildText(ctx, 'body', copy.body, {
        size: type.body,
        align: 'start',
        width: columnWidth,
        color: palette.textMuted,
        maxLines: 3,
      })
    : undefined;

  const top = content.y + gapFor(24);
  if (eyebrow) blocks.push(eyebrow);
  blocks.push(headline);
  if (body) blocks.push(body);
  stack(blocks, top, 'down', gapFor(Math.round(type.body * 0.9)));

  // Hairline rule under the header block.
  const last = blocks[blocks.length - 1]!;
  const ruleY = last.rect.y + last.rect.height + gapFor(24);
  shapes.push({
    id: 'rule',
    kind: 'line',
    rect: { x: content.x, y: ruleY, width: content.width, height: 2 },
    fill: palette.border,
    opacity: 1,
  });

  // Bottom image band with a scrim.
  const bandH = Math.round(content.height * 0.3);
  const band: Rect = {
    x: content.x,
    y: content.y + content.height - bandH,
    width: content.width,
    height: bandH,
  };
  shapes.push({
    id: 'image-band',
    kind: 'image',
    rect: band,
    fill: palette.surface,
    opacity: 1,
    gradient: { from: palette.primary, to: palette.surface, angle: 20 },
    noteAr: 'شريط صورة: أسقط صورة حقيقية هنا مع تعتيم 25–40%.',
  });

  const footerY = band.y - gapFor(32);
  const footer = copy.footer
    ? buildText(ctx, 'footer', copy.footer, {
        size: type.caption,
        align: 'start',
        width: columnWidth,
        color: palette.textMuted,
        maxLines: 1,
        y: footerY - type.caption * 1.6,
      })
    : undefined;
  if (footer) blocks.push(footer);

  const ctaText = copy.cta;
  if (ctaText) {
    const cta = buildText(ctx, 'cta', ctaText, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(ctaText, type.cta) + type.cta * 2.4,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cta.rect.y = footerY - cta.rect.height - gapFor(24);
    cta.rect.x = alignRectX(content, cta.rect.width, 'start', ctx.rtl);
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
  }

  const logo = logoBlock(ctx);
  logo.rect.x = alignRectX(content, logo.rect.width, 'end', ctx.rtl);
  logo.rect.y = content.y;
  blocks.push(logo);

  return {
    archetype: 'editorial-stack',
    nameAr: 'تحريري',
    rationaleAr: 'شبكة تحريرية: عنوان في الأعلى، شريط صورة في الأسفل، وخط فاصل واحد ينظّم الانتقال.',
    blocks,
    shapes,
    imageArea: band,
    readingFlow: 'rtl-stack',
    focal: {
      x: headline.rect.x + headline.rect.width * 0.5,
      y: headline.rect.y + headline.rect.height * 0.35,
    },
  };
}

function heroCenter(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const width = Math.round(content.width * 0.84);
  const blocks: PlannedText[] = [];

  const eyebrow = copy.eyebrow
    ? buildText(ctx, 'eyebrow', copy.eyebrow, {
        size: type.eyebrow,
        align: 'center',
        width,
        color: palette.accent,
        maxLines: 1,
      })
    : undefined;
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: Math.round(type.h1 * 1.06),
    align: 'center',
    width,
    color: palette.text,
    maxLines: 3,
  });
  const subhead = copy.subhead
    ? buildText(ctx, 'subhead', copy.subhead, {
        size: type.h3,
        align: 'center',
        width,
        color: palette.textMuted,
        maxLines: 2,
      })
    : undefined;

  if (eyebrow) blocks.push(eyebrow);
  blocks.push(headline);
  if (subhead) blocks.push(subhead);

  const gap = gapFor(Math.round(type.body * 0.85));
  const groupH = totalHeight(blocks, gap);
  const centerY = Math.round(content.y + content.height * 0.47 - groupH / 2);
  stack(blocks, centerY, 'down', gap);

  for (const block of blocks) block.rect.x = centerX(content, block.rect.width);

  const shapes: PlannedShape[] = [
    {
      id: 'top-rule',
      kind: 'line',
      rect: {
        x: centerX(content, content.width * 0.18),
        y: content.y,
        width: content.width * 0.18,
        height: 3,
      },
      fill: palette.accent,
      opacity: 1,
    },
    {
      id: 'bottom-rule',
      kind: 'line',
      rect: {
        x: centerX(content, content.width * 0.18),
        y: content.y + content.height - 3,
        width: content.width * 0.18,
        height: 3,
      },
      fill: palette.accent,
      opacity: 1,
    },
  ];

  const logo = logoBlock(ctx);
  logo.rect.x = centerX(content, logo.rect.width + 120);
  logo.rect.y = content.y + gapFor(32);
  blocks.push(logo);

  const ctaText = copy.cta;
  if (ctaText) {
    const cta = buildText(ctx, 'cta', ctaText, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(ctaText, type.cta) + type.cta * 2.6,
      color: palette.onPrimary,
      maxLines: 1,
    });
    const anchor = blocks[blocks.length - 1]!;
    cta.rect.x = centerX(content, cta.rect.width);
    cta.rect.y = Math.min(
      content.y + content.height - cta.rect.height,
      anchor.rect.y + anchor.rect.height + gapFor(48),
    );
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: cta.rect.height / 2,
    });
    blocks.push(cta);
  }

  return {
    archetype: 'hero-center',
    nameAr: 'مركزي',
    rationaleAr: 'تماثل عمودي حول المركز البصري مع خطي تأكيد رفيعين؛ أهدأ وأكثر رسمية.',
    blocks,
    shapes,
    readingFlow: 'center',
    focal: { x: content.x + content.width / 2, y: content.y + content.height * 0.47 },
  };
}

function minimalFrame(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const frameInset = gapFor(24);
  const frame: Rect = {
    x: content.x - frameInset,
    y: content.y - frameInset,
    width: content.width + frameInset * 2,
    height: content.height + frameInset * 2,
  };
  const shapes: PlannedShape[] = [
    { id: 'frame', kind: 'frame', rect: frame, fill: palette.border, opacity: 1 },
  ];

  const width = Math.round(content.width * 0.8);
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.h1,
    align: 'center',
    width,
    color: palette.text,
    maxLines: 3,
  });
  headline.rect.x = centerX(content, width);
  headline.rect.y = Math.round(content.y + content.height * 0.47 - headline.rect.height / 2);

  const blocks: PlannedText[] = [headline];

  if (copy.subhead) {
    const subhead = buildText(ctx, 'subhead', copy.subhead, {
      size: type.body,
      align: 'center',
      width,
      color: palette.textMuted,
      maxLines: 2,
    });
    subhead.rect.x = centerX(content, width);
    subhead.rect.y = headline.rect.y + headline.rect.height + gapFor(48);
    blocks.push(subhead);
  }
  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.caption,
      align: 'center',
      width,
      color: palette.textMuted,
      maxLines: 1,
    });
    footer.rect.x = centerX(content, width);
    footer.rect.y = content.y + content.height - footer.rect.height;
    blocks.push(footer);
  }

  const logo = logoBlock(ctx);
  logo.rect.x = centerX(content, logo.rect.width + 80);
  logo.rect.y = content.y;
  blocks.push(logo);

  return {
    archetype: 'minimal-frame',
    nameAr: 'إطار بسيط',
    rationaleAr: 'إطار رفيع يحتضن فراغاً واسعاً حول سطر واحد؛ الفخامة هنا في الفراغ لا في العناصر.',
    blocks,
    shapes,
    readingFlow: 'center',
    focal: { x: content.x + content.width / 2, y: headline.rect.y + headline.rect.height / 2 },
  };
}

function splitDiagonal(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const textWidth = Math.round(content.width * 0.56);
  const blocks: PlannedText[] = [];

  const eyebrow = copy.eyebrow
    ? buildText(ctx, 'eyebrow', copy.eyebrow, {
        size: type.eyebrow,
        align: 'start',
        width: textWidth,
        color: palette.accent,
        maxLines: 1,
      })
    : undefined;
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.h1,
    align: 'start',
    width: textWidth,
    color: palette.text,
    maxLines: 3,
  });
  const body = copy.body
    ? buildText(ctx, 'body', copy.body, {
        size: type.body,
        align: 'start',
        width: textWidth,
        color: palette.textMuted,
        maxLines: 3,
      })
    : undefined;

  if (eyebrow) blocks.push(eyebrow);
  blocks.push(headline);
  if (body) blocks.push(body);

  const groupH = totalHeight(blocks, gapFor(24));
  stack(blocks, Math.round(content.y + content.height * 0.5 - groupH / 2), 'down', gapFor(24));

  // Diagonal band built from three offset bars (no rotation needed downstream).
  const bandX = ctx.rtl ? content.x : content.x + content.width * 0.62;
  const shapes: PlannedShape[] = [
    {
      id: 'diag-1',
      kind: 'rect',
      rect: {
        x: Math.round(bandX),
        y: content.y,
        width: Math.round(content.width * 0.05),
        height: content.height,
      },
      fill: palette.primary,
      opacity: 0.18,
    },
    {
      id: 'diag-2',
      kind: 'rect',
      rect: {
        x: Math.round(bandX + content.width * 0.07),
        y: content.y,
        width: Math.round(content.width * 0.03),
        height: content.height,
      },
      fill: palette.accent,
      opacity: 0.5,
    },
    {
      id: 'image-side',
      kind: 'image',
      rect: {
        x: Math.round(ctx.rtl ? content.x : content.x + content.width * 0.64),
        y: content.y,
        width: Math.round(content.width * 0.36),
        height: content.height,
      },
      fill: palette.surface,
      opacity: 1,
      gradient: { from: palette.primary, to: palette.surface, angle: 65 },
    },
  ];

  const ctaText = copy.cta;
  if (ctaText) {
    const cta = buildText(ctx, 'cta', ctaText, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(ctaText, type.cta) + type.cta * 2.4,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cta.rect.x = alignRectX(
      { x: content.x, y: 0, width: textWidth, height: 1 },
      cta.rect.width,
      'start',
      ctx.rtl,
    );
    cta.rect.y = content.y + content.height - cta.rect.height;
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
  }

  const logo = logoBlock(ctx);
  logo.rect.y = content.y;
  logo.rect.x = alignRectX(content, logo.rect.width, 'end', ctx.rtl);
  blocks.push(logo);

  return {
    archetype: 'split-diagonal',
    nameAr: 'انقسام قطري',
    rationaleAr: 'ثلثا المساحة للنص وثلث لصورة/تدرّج، مع فاصل قطري يخلق حركة أفقية.',
    blocks,
    shapes,
    readingFlow: 'rtl-z',
    focal: {
      x: headline.rect.x + headline.rect.width * 0.6,
      y: headline.rect.y + headline.rect.height * 0.4,
    },
  };
}

function eventPoster(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const blocks: PlannedText[] = [];
  const shapes: PlannedShape[] = [
    { id: 'frame-outer', kind: 'frame', rect: content, fill: palette.border, opacity: 1 },
  ];

  const eyebrow = copy.eyebrow
    ? buildText(ctx, 'eyebrow', copy.eyebrow, {
        size: type.eyebrow,
        align: 'center',
        width: content.width,
        color: palette.accent,
        maxLines: 1,
      })
    : undefined;
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: Math.round(type.h1 * 1.02),
    align: 'center',
    width: Math.round(content.width * 0.88),
    color: palette.text,
    maxLines: 3,
  });
  headline.rect.x = centerX(content, headline.rect.width);

  if (eyebrow) {
    eyebrow.rect.x = centerX(content, eyebrow.rect.width);
    blocks.push(eyebrow);
  }
  blocks.push(headline);

  const gap = gapFor(24);
  const startY = Math.round(content.y + content.height * 0.36 - totalHeight(blocks, gap) / 2);
  stack(blocks, startY, 'down', gap);

  if (copy.subhead) {
    const subhead = buildText(ctx, 'subhead', copy.subhead, {
      size: type.h2,
      align: 'center',
      width: Math.round(content.width * 0.8),
      color: palette.accent,
      maxLines: 2,
    });
    subhead.rect.x = centerX(content, subhead.rect.width);
    subhead.rect.y = headline.rect.y + headline.rect.height + gapFor(32);
    blocks.push(subhead);
  }
  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.body,
      align: 'center',
      width: Math.round(content.width * 0.8),
      color: palette.textMuted,
      maxLines: 2,
    });
    footer.rect.x = centerX(content, footer.rect.width);
    footer.rect.y = content.y + content.height - footer.rect.height - gapFor(16);
    blocks.push(footer);
  }

  const ctaText = copy.cta;
  if (ctaText) {
    const cta = buildText(ctx, 'cta', ctaText, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(ctaText, type.cta) + type.cta * 2.4,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cta.rect.x = centerX(content, cta.rect.width);
    cta.rect.y = content.y + content.height - cta.rect.height - gapFor(96);
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
  }

  // NOTE: no corner ornaments — four small squares in the corners read as
  // selection/debug handles (flagged by the calibrated critic and absent from
  // all 61 approved references). Frames/decoration belong to the template DSL.

  const logo = logoBlock(ctx);
  logo.rect.x = centerX(content, logo.rect.width + 60);
  logo.rect.y = content.y + gapFor(32);
  blocks.push(logo);

  return {
    archetype: 'event-poster',
    nameAr: 'ملصق فعالية',
    rationaleAr: 'تماثل رسمي مع إطار وزوايا ذهبية؛ يليق بالمناسبات والدعوات الرسمية.',
    blocks,
    shapes,
    readingFlow: 'center',
    focal: { x: content.x + content.width / 2, y: headline.rect.y + headline.rect.height * 0.45 },
  };
}

function thumbnailBold(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const width = Math.round(content.width * 0.94);
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: Math.round(type.display * 1.15),
    align: 'start',
    width,
    color: palette.text,
    maxLines: 2,
    leading: 1.12,
  });
  headline.rect.y = Math.round(content.y + content.height * 0.5 - headline.rect.height / 2);

  const blocks: PlannedText[] = [headline];
  const shapes: PlannedShape[] = [
    {
      id: 'underline',
      kind: 'rect',
      rect: {
        x: headline.rect.x,
        y: headline.rect.y + headline.rect.height + gapFor(16),
        width: Math.round(headline.rect.width * 0.42),
        height: gapFor(16),
      },
      fill: palette.accent,
      opacity: 1,
    },
  ];

  if (copy.subhead) {
    const subhead = buildText(ctx, 'subhead', copy.subhead, {
      size: type.h3,
      align: 'start',
      width,
      color: palette.textMuted,
      maxLines: 1,
    });
    subhead.rect.y = headline.rect.y + headline.rect.height + gapFor(56);
    blocks.push(subhead);
  }

  const ctaText = copy.cta;
  if (ctaText) {
    const cta = buildText(ctx, 'cta', ctaText, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(ctaText, type.cta) + type.cta * 2.2,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cta.rect.x = alignRectX(content, cta.rect.width, 'end', ctx.rtl);
    cta.rect.y = content.y + content.height - cta.rect.height;
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
  }

  const logo = logoBlock(ctx);
  logo.rect.y = content.y;
  logo.rect.x = alignRectX(content, logo.rect.width, 'start', ctx.rtl);
  blocks.push(logo);

  return {
    archetype: 'thumbnail-bold',
    nameAr: 'مصغرة بارزة',
    rationaleAr: 'عنوان بحجم شبه كامل مع خط تأكيد سميك؛ مصمّم ليُقرأ في 0.3 ثانية داخل خلاصة مزدحمة.',
    blocks,
    shapes,
    readingFlow: 'rtl-stack',
    focal: { x: content.x + content.width * 0.5, y: headline.rect.y + headline.rect.height * 0.45 },
  };
}

function cinematicBleed(ctx: Ctx): LayoutPlan {
  const { page, content, palette, type, copy } = ctx;
  const shapes: PlannedShape[] = [
    {
      id: 'image-full',
      kind: 'image',
      rect: page,
      fill: palette.surface,
      opacity: 1,
      gradient: { from: palette.primary, to: palette.surface, angle: 90 },
      noteAr: 'صورة كاملة مع تعتيم سفلي.',
    },
    {
      id: 'scrim',
      kind: 'scrim',
      rect: { x: 0, y: page.height * 0.42, width: page.width, height: page.height * 0.58 },
      fill: palette.background,
      opacity: 0.88,
      gradient: { from: palette.background, to: palette.background, angle: 90 },
    },
  ];

  const width = Math.round(content.width * 0.9);
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.display,
    align: 'start',
    width,
    color: palette.text,
    maxLines: 3,
  });
  const subhead = copy.subhead
    ? buildText(ctx, 'subhead', copy.subhead, {
        size: type.h3,
        align: 'start',
        width,
        color: palette.textMuted,
        maxLines: 2,
      })
    : undefined;

  const blocks: PlannedText[] = [headline];
  if (subhead) blocks.push(subhead);

  const footerY = content.y + content.height;
  let cursor = footerY;
  if (copy.cta) {
    const cta = buildText(ctx, 'cta', copy.cta, {
      size: type.cta,
      align: 'center',
      width: measureTextWidth(copy.cta, type.cta) + type.cta * 2.4,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cursor -= cta.rect.height;
    cta.rect.y = Math.round(cursor);
    cta.rect.x = alignRectX(content, cta.rect.width, 'start', ctx.rtl);
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
    cursor -= gapFor(32);
  }
  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.caption,
      align: 'start',
      width,
      color: palette.textMuted,
      maxLines: 1,
    });
    cursor -= footer.rect.height;
    footer.rect.y = Math.round(cursor);
    blocks.push(footer);
    cursor -= gapFor(24);
  }

  stack([headline, ...(subhead ? [subhead] : [])], cursor, 'up', gapFor(24));

  const logo = logoBlock(ctx);
  logo.rect.y = content.y;
  logo.rect.x = alignRectX(content, logo.rect.width, 'start', ctx.rtl);
  blocks.push(logo);

  return {
    archetype: 'cinematic-bleed',
    nameAr: 'سينمائي',
    rationaleAr: 'الصورة تملأ الإطار والنص يجلس على تعتيم متدرّج؛ عمق ودراما قبل القراءة.',
    blocks,
    shapes,
    readingFlow: 'rtl-stack',
    focal: { x: content.x + content.width * 0.5, y: page.height * 0.38 },
  };
}

function storyStack(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const blocks: PlannedText[] = [];
  const shapes: PlannedShape[] = [
    {
      id: 'progress-track',
      kind: 'rect',
      rect: { x: content.x, y: content.y, width: content.width, height: 4 },
      fill: palette.border,
      opacity: 0.6,
    },
    {
      id: 'progress',
      kind: 'rect',
      rect: {
        x: ctx.rtl ? content.x + content.width * 0.66 : content.x,
        y: content.y,
        width: content.width * 0.34,
        height: 4,
      },
      fill: palette.accent,
      opacity: 1,
    },
  ];

  const logo = logoBlock(ctx);
  logo.rect.y = content.y + gapFor(24);
  logo.rect.x = alignRectX(content, logo.rect.width, 'start', ctx.rtl);
  blocks.push(logo);

  const width = content.width;
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: Math.round(type.h1 * 1.05),
    align: 'start',
    width,
    color: palette.text,
    maxLines: 4,
  });
  const subhead = copy.subhead
    ? buildText(ctx, 'subhead', copy.subhead, {
        size: type.h3,
        align: 'start',
        width,
        color: palette.textMuted,
        maxLines: 2,
      })
    : undefined;

  const group = [headline, ...(subhead ? [subhead] : [])];
  const groupH = totalHeight(group, gapFor(24));
  stack(group, Math.round(content.y + content.height * 0.52 - groupH / 2), 'down', gapFor(24));
  blocks.push(...group);

  if (copy.cta) {
    const cta = buildText(ctx, 'cta', copy.cta, {
      size: type.cta,
      align: 'center',
      width: content.width * 0.7,
      color: palette.onPrimary,
      maxLines: 1,
    });
    cta.rect.x = centerX(content, cta.rect.width);
    cta.rect.y =
      content.y + content.height - cta.rect.height - (copy.footer ? type.caption * 2.4 : 0);
    shapes.push({
      id: 'cta-bg',
      kind: 'rect',
      rect: { ...cta.rect },
      fill: palette.primary,
      opacity: 1,
      radius: gapFor(8),
    });
    blocks.push(cta);
  }
  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.caption,
      align: 'center',
      width: content.width,
      color: palette.textMuted,
      maxLines: 1,
    });
    footer.rect.x = centerX(content, footer.rect.width);
    footer.rect.y = content.y + content.height - footer.rect.height;
    blocks.push(footer);
  }

  return {
    archetype: 'story-stack',
    nameAr: 'ستوري عمودي',
    rationaleAr: 'مناطق رأسية واضحة مع شريط تقدّم؛ يحترم مساحات واجهة الستوري.',
    blocks,
    shapes,
    readingFlow: 'rtl-stack',
    focal: { x: content.x + content.width / 2, y: headline.rect.y + headline.rect.height * 0.4 },
  };
}

function magazineCover(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const blocks: PlannedText[] = [];

  const masthead = buildText(ctx, 'logo', copy.logo ?? 'مبدع', {
    size: Math.round(type.h2 * 1.15),
    align: 'start',
    width: content.width,
    color: palette.text,
    weight: 'bold',
    maxLines: 1,
  });
  masthead.rect.y = content.y;
  blocks.push(masthead);

  const ruleY = masthead.rect.y + masthead.rect.height + gapFor(16);
  const shapes: PlannedShape[] = [
    {
      id: 'masthead-rule',
      kind: 'line',
      rect: { x: content.x, y: ruleY, width: content.width, height: 3 },
      fill: palette.accent,
      opacity: 1,
    },
  ];

  const width = Math.round(content.width * 0.66);
  const headline = buildText(ctx, 'headline', copy.headline, {
    size: type.h1,
    align: 'start',
    width,
    color: palette.text,
    maxLines: 3,
  });
  headline.rect.y = ruleY + gapFor(48);
  blocks.push(headline);

  if (copy.body) {
    const body = buildText(ctx, 'body', copy.body, {
      size: type.body,
      align: 'start',
      width,
      color: palette.textMuted,
      maxLines: 3,
    });
    body.rect.y = headline.rect.y + headline.rect.height + gapFor(24);
    blocks.push(body);
  }

  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.caption,
      align: 'start',
      width: content.width,
      color: palette.textMuted,
      maxLines: 1,
    });
    footer.rect.y = content.y + content.height - footer.rect.height;
    blocks.push(footer);
  }

  // Cover lines on the opposite side, small and stacked.
  if (copy.subhead) {
    const cover = buildText(ctx, 'subhead', copy.subhead, {
      size: type.caption,
      align: 'start',
      width: Math.round(content.width * 0.26),
      color: palette.accent,
      maxLines: 3,
    });
    cover.rect.x = alignRectX(content, cover.rect.width, 'end', ctx.rtl);
    cover.rect.y = headline.rect.y + gapFor(24);
    blocks.push(cover);
  }

  return {
    archetype: 'magazine-cover',
    nameAr: 'غلاف مجلة',
    rationaleAr: 'ترويسة كبيرة، خط ذهبي فاصل، وعنوان في عمودين — إيقاع تحريري واضح.',
    blocks,
    shapes,
    readingFlow: 'rtl-z',
    focal: {
      x: headline.rect.x + headline.rect.width * 0.5,
      y: headline.rect.y + headline.rect.height * 0.4,
    },
  };
}

function quoteCard(ctx: Ctx): LayoutPlan {
  const { content, palette, type, copy } = ctx;
  const width = Math.round(content.width * 0.84);
  const quote = buildText(ctx, 'headline', copy.headline, {
    size: type.h2,
    align: 'center',
    width,
    color: palette.text,
    maxLines: 5,
    leading: 1.45,
  });
  quote.rect.x = centerX(content, width);
  quote.rect.y = Math.round(content.y + content.height * 0.47 - quote.rect.height / 2);

  const blocks: PlannedText[] = [quote];
  const shapes: PlannedShape[] = [
    {
      id: 'quote-mark',
      kind: 'rect',
      rect: { x: centerX(content, 64), y: quote.rect.y - gapFor(64), width: 64, height: 64 },
      fill: palette.accent,
      opacity: 1,
      radius: 32,
    },
  ];

  if (copy.footer) {
    const footer = buildText(ctx, 'footer', copy.footer, {
      size: type.body,
      align: 'center',
      width,
      color: palette.textMuted,
      maxLines: 2,
    });
    footer.rect.x = centerX(content, width);
    footer.rect.y = quote.rect.y + quote.rect.height + gapFor(48);
    blocks.push(footer);
  }

  const logo = logoBlock(ctx);
  logo.rect.x = alignRectX(content, logo.rect.width, 'start', ctx.rtl);
  logo.rect.y = content.y;
  blocks.push(logo);

  return {
    archetype: 'quote-card',
    nameAr: 'بطاقة اقتباس',
    rationaleAr: 'اقتباس مركزي بتباعد أسطر مريح وعلامة اقتباس بسيطة؛ الهدوء يخدم المعنى.',
    blocks,
    shapes,
    readingFlow: 'center',
    focal: { x: content.x + content.width / 2, y: quote.rect.y + quote.rect.height / 2 },
  };
}

const ARCHETYPES: Record<string, (ctx: Ctx) => LayoutPlan> = {
  'poster-stack': posterStack,
  'editorial-stack': editorialStack,
  'hero-center': heroCenter,
  'minimal-frame': minimalFrame,
  'split-diagonal': splitDiagonal,
  'event-poster': eventPoster,
  'thumbnail-bold': thumbnailBold,
  'cinematic-bleed': cinematicBleed,
  'story-stack': storyStack,
  'magazine-cover': magazineCover,
  'quote-card': quoteCard,
};

export function listArchetypes(): Array<{ id: string; nameAr: string }> {
  return Object.keys(ARCHETYPES).map((id) => ({ id, nameAr: id }));
}

/** Pick the archetype for this direction + variant (variants rotate ideas). */
export function chooseArchetype(direction: ArtDirection, variant: number, intent: string): string {
  const bias = [...direction.layoutBias];
  if (intent === 'story' || intent === 'reel_cover') bias.unshift('story-stack');
  if (intent === 'thumbnail') bias.unshift('thumbnail-bold');
  if (intent === 'quote') bias.unshift('quote-card');
  if (intent === 'event') bias.unshift('event-poster');
  const unique = [...new Set(bias)];
  return unique[variant % unique.length] ?? 'poster-stack';
}

export function compose(input: ComposeInput & { archetype?: string }): LayoutPlan {
  const ctx = makeCtx(input);
  const archetype = input.archetype ?? chooseArchetype(input.direction, input.variant, 'post');
  const fn = ARCHETYPES[archetype] ?? posterStack;
  return fn(ctx);
}

export { ARCHETYPES };
