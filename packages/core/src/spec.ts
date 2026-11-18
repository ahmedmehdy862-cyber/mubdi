import type { Color, DesignBrief, DesignSpec, Layer, TextRun } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';
import {
  bestTextOn,
  buildPalette,
  ensureContrast,
  ensureContentSlots,
  extractBigNumber,
  fontPairingFor,
  getDirection,
  hexToRgb,
  makeTypeScale,
  mix,
  pickDirections,
  pickTemplates,
  relativeLuminance,
  renderTemplate,
  rgbToHex,
  safeRect,
  snap,
  useOfBrief,
  type ArtDirection,
  type ComposeCopy,
  type Palette,
  type PlannedShape,
  type PlannedText,
  type TemplatePlan,
  type TextRole,
  type TypeScale,
} from '@mubdi/design-knowledge';

export interface SpecBrand {
  name?: string;
  palette?: { primary?: string; accent?: string; background?: string; text?: string };
  fonts?: { arabic?: string; latin?: string };
}

export interface GeneratedVariant {
  spec: DesignSpec;
  directionId: string;
  directionNameAr: string;
  directionSummaryAr: string;
  directionWhyAr: string;
  archetype: string;
  archetypeNameAr: string;
  rationaleAr: string;
  paletteSummaryAr: string;
  conceptId: string;
  conceptTitleAr: string;
  variant: number;
}

/** Default base colour per direction — a palette needs a starting point. */
const DIRECTION_PRIMARY: Record<string, string> = {
  editorial: '#1e3a8a',
  'bold-type': '#b91c1c',
  minimal: '#0f172a',
  luxury: '#c9a227',
  youthful: '#ea580c',
  tech: '#0e7490',
  organic: '#4d7c0f',
  heritage: '#1f7a3d',
  brutalist: '#111827',
  cinematic: '#1e293b',
};

const FALLBACK_HEADLINE = 'عنوان رئيسي';
const FALLBACK_CTA = 'سجّل الآن';

const isHex = (value: string | undefined): value is string =>
  Boolean(value && /^#?[0-9a-f]{3,8}$/i.test(value));

function normalizeHex(hex: string): string {
  const clean = hex.replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return `#${full.slice(0, 6).padEnd(6, '0')}`;
}

export function hexToColor(hex: string): Color {
  // 8-digit hex (#RRGGBBAA) carries alpha straight from the template DSL.
  const clean = hex.replace(/^#/, '').toLowerCase();
  if (clean.length === 8) {
    const rgb = hexToRgb(`#${clean.slice(0, 6)}`);
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: parseInt(clean.slice(6, 8), 16) / 255 };
  }
  const rgb = hexToRgb(normalizeHex(hex));
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };
}

function colorToHex(color: Color): string {
  return rgbToHex({ r: color.r, g: color.g, b: color.b });
}

function mixHex(a: string, b: string, weight: number): string {
  return rgbToHex(mix(hexToRgb(a), hexToRgb(b), weight));
}

function isLight(hex: string): boolean {
  return relativeLuminance(hexToRgb(hex)) > 0.5;
}

function buildPaletteFor(brief: DesignBrief, direction: ArtDirection, brand?: SpecBrand): Palette {
  const intents = brief.visualDirection.colorIntent.filter(isHex);
  const primary = normalizeHex(
    brand?.palette?.primary ?? intents[0] ?? DIRECTION_PRIMARY[direction.id] ?? '#1f7a3d',
  );
  const accent = brand?.palette?.accent ?? intents[1];
  const brandBg = brand?.palette?.background;
  const mode = brandBg ? (isLight(brandBg) ? 'light' : 'dark') : direction.paletteMode;

  let palette = buildPalette({
    primary,
    scheme: direction.harmony,
    mode,
    ...(accent ? { accent: normalizeHex(accent) } : {}),
  });

  if (brandBg) {
    const bg = normalizeHex(brandBg);
    const text = ensureContrast(bestTextOn(bg), bg, 7);
    palette = {
      ...palette,
      mode: isLight(bg) ? 'light' : 'dark',
      background: bg,
      surface: mixHex(bg, text, 0.08),
      text,
      textMuted: ensureContrast(mixHex(text, bg, 0.35), bg, 4.5),
      border: mixHex(text, bg, 0.72),
      onPrimary: ensureContrast(bestTextOn(palette.primary), palette.primary, 4.5),
    };
  }
  if (brand?.palette?.text) {
    const text = ensureContrast(normalizeHex(brand.palette.text), palette.background, 7);
    palette = {
      ...palette,
      text,
      textMuted: ensureContrast(mixHex(text, palette.background, 0.3), palette.background, 4.5),
    };
  }
  return palette;
}

function typeFor(
  preset: { width: number; height: number; minFontSize: number },
  direction: ArtDirection,
): TypeScale {
  return makeTypeScale({
    canvasMin: Math.min(preset.width, preset.height),
    scale: direction.typeScale,
    minSize: preset.minFontSize,
  });
}

const ROLE_NAME: Record<TextRole, string> = {
  eyebrow: 'EYEBROW',
  headline: 'HEADLINE',
  subhead: 'SUBHEAD',
  body: 'BODY',
  cta: 'CTA',
  footer: 'FOOTER',
  logo: 'LOGO',
};

function shapeToLayer(shape: PlannedShape, palette: Palette, index: number): Layer {
  const type: Layer['type'] =
    shape.kind === 'image' ? 'image' : shape.kind === 'scrim' ? 'overlay' : 'shape';
  // Q3: template primitives carry drawing params (angle/stroke/dot/pattern…)
  // plus renderer effect tags — both must reach the layer verbatim.
  const metadata: Record<string, unknown> = { ...(shape.meta ?? {}), shape: shape.kind };
  if (shape.radius !== undefined) metadata['radius'] = shape.radius;
  if (shape.gradient) {
    const from = hexToColor(shape.gradient.from);
    const to = hexToColor(shape.gradient.to);
    metadata['gradient'] = {
      // Scrims fade from transparent to the background veil.
      from: shape.kind === 'scrim' ? { ...from, a: 0 } : from,
      to,
      angle: shape.gradient.angle,
    };
  }
  if (shape.kind === 'image') {
    metadata['placeholder'] = true;
    metadata['noteAr'] = shape.noteAr ?? 'اسحب صورة حقيقية هنا.';
  }
  if (shape.id === 'cta-bg') metadata['role'] = 'cta-bg';
  return {
    id: shape.id,
    name: shape.id === 'cta-bg' ? 'CTA-bg' : shape.id,
    type,
    x: Math.round(shape.rect.x),
    y: Math.round(shape.rect.y),
    width: Math.max(1, Math.round(shape.rect.width)),
    height: Math.max(1, Math.round(shape.rect.height)),
    z: 10 + index,
    opacity: shape.opacity,
    blendMode: type === 'overlay' ? 'normal' : 'normal',
    visible: true,
    locked: false,
    mask: false,
    fill: hexToColor(shape.fill),
    effects: [...(shape.effects ?? [])],
    metadata,
  };
}

function textToLayer(
  block: PlannedText,
  brief: DesignBrief,
  preset: { width: number; height: number },
  fonts: { display: string; body: string },
  palette: Palette,
  index: number,
  rtl: boolean,
  backdropHex?: string,
): Layer {
  const weightBold = block.weight === 'bold' || block.role === 'headline' || block.role === 'cta';
  const family =
    block.role === 'headline' || block.role === 'cta' || block.role === 'logo'
      ? fonts.display
      : fonts.body;
  const text = block.lines.filter(Boolean).join('\n') || block.text;
  // Contrast must be measured against what is actually behind the glyphs:
  // CTA sits on its pill; template panel text sits on its panel.
  const backdrop = block.backdropHex ?? backdropHex ?? palette.background;
  const colorHex = ensureContrast(block.color, backdrop, 4.5);
  const run: TextRun = {
    text,
    font: weightBold && !family.endsWith('-Bold') ? `${family}-Bold` : family,
    size: block.size,
    tracking: 0,
    leading: block.leading,
    direction: rtl ? 'rtl' : 'ltr',
    language: brief.language,
    color: hexToColor(colorHex),
    bold: weightBold,
    italic: false,
  };
  return {
    id: block.role === 'logo' ? 'logo-text' : block.role,
    name: ROLE_NAME[block.role],
    type: 'text',
    x: Math.round(block.rect.x),
    y: Math.round(block.rect.y),
    width: Math.max(16, Math.round(block.rect.width)),
    height: Math.max(16, Math.round(block.rect.height)),
    z: 100 + index,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
    mask: false,
    textRuns: [run],
    effects: [],
    metadata: {
      role: block.role,
      align: block.align,
      planText: block.text,
      wrapWidth: Math.round(block.rect.width),
    },
  };
}

function clampTextLayers(
  layers: Layer[],
  preset: {
    width: number;
    height: number;
    margins: number;
    safeZones: { top: number; right: number; bottom: number; left: number };
  },
): void {
  const safe = safeRect(preset.width, preset.height, preset.safeZones, preset.margins);
  for (const layer of layers) {
    if (layer.type !== 'text') continue;
    if (layer.width > safe.width) layer.width = safe.width;
    layer.x = Math.round(Math.min(Math.max(safe.x, layer.x), safe.x + safe.width - layer.width));
    layer.y = Math.round(Math.min(Math.max(safe.y, layer.y), safe.y + safe.height - layer.height));
    const ctaBg = layers.find((l) => l.id === 'cta-bg');
    if (ctaBg && layer.name === 'CTA') {
      ctaBg.x = layer.x;
      ctaBg.y = layer.y;
      ctaBg.width = layer.width;
      ctaBg.height = layer.height;
    }
  }
}

function logoPlaceholder(
  preset: {
    width: number;
    height: number;
    margins: number;
    safeZones: { top: number; right: number; bottom: number; left: number };
  },
  palette: Palette,
  rtl: boolean,
): Layer {
  const safe = safeRect(preset.width, preset.height, preset.safeZones, preset.margins);
  const width = Math.max(96, Math.round(Math.min(220, preset.width * 0.2)));
  const height = Math.round(width * 0.3);
  return {
    id: 'logo',
    name: 'LOGO',
    type: 'image',
    x: rtl ? safe.x + safe.width - width : safe.x,
    y: safe.y,
    width,
    height,
    z: 150,
    opacity: 0.4,
    blendMode: 'normal',
    visible: true,
    locked: false,
    mask: false,
    fill: hexToColor(palette.text),
    effects: [],
    metadata: { placeholder: true, noteAr: 'ضع شعار العلامة هنا (مساحة أمان = ارتفاع الحرف).' },
  };
}

function buildCopy(brief: DesignBrief, brand?: SpecBrand): ComposeCopy {
  const copy: ComposeCopy = {
    headline: brief.copy.headline.trim() || FALLBACK_HEADLINE,
  };
  if (brief.copy.subheadline) copy.subhead = brief.copy.subheadline;
  if (brief.copy.body) copy.body = brief.copy.body;
  copy.cta = brief.copy.cta?.trim() || FALLBACK_CTA;
  if (brief.copy.footer) copy.footer = brief.copy.footer;
  else if (brief.copy.hashtags.length) copy.footer = brief.copy.hashtags.slice(0, 2).join('  ');
  if (brief.occasion && /[\u0600-\u06FF]/.test(brief.occasion)) copy.eyebrow = brief.occasion;
  if (brand?.name) copy.logo = brand.name;
  return copy;
}

/**
 * Build one variant with a full rationale. Variant 0/1/2 select three
 * *different* art directions, so the output differs in palette, typography,
 * composition and copy treatment — not only in colour.
 */
export function generateVariantDetails(
  brief: DesignBrief,
  presetId: string,
  variant: number,
  brand?: SpecBrand,
): GeneratedVariant {
  const preset = getPreset(presetId) ?? getPreset('ig_post_4x5')!;
  const rtl = brief.direction !== 'ltr';
  const choices = pickDirections(brief, 3);
  const choice =
    choices[((variant % choices.length) + choices.length) % choices.length] ?? choices[0]!;
  const direction = choice.direction;
  const palette = buildPaletteFor(brief, direction, brand);
  const type = typeFor(preset, direction);

  /* ---------------------------------------------------------------- */
  /* Q3 — TEMPLATE-FIRST PATH                                          */
  /* Three variants come from three different templates (pattern AND   */
  /* style differ). pickTemplates guarantees that, so every variant    */
  /* already has its own composition.                                  */
  /* ---------------------------------------------------------------- */
  const copyTemplate: ComposeCopy = {
    ...buildCopy(brief, brand),
    hashtags: [...brief.copy.hashtags],
  };
  const briefText = [
    brief.copy.headline,
    brief.copy.subheadline ?? '',
    brief.copy.body ?? '',
    brief.copy.cta ?? '',
    brief.occasion ?? '',
  ].join(' ');
  const templateUse = useOfBrief(brief.intent, briefText);
  const picked = pickTemplates(templateUse, 3);
  const tpl = picked[((variant % picked.length) + picked.length) % picked.length]!;
  const tplPair = fontPairingFor(tpl.fontPair);
  // Brand identity outranks the template's own pairing (never guess fonts:
  // a supplied brand font always wins over the style default).
  const fontsTpl = brand?.fonts?.arabic
    ? { display: brand.fonts.arabic, body: brand.fonts.arabic }
    : { display: tplPair.display, body: tplPair.body };
  const bigNumber = extractBigNumber(
    brief.copy.headline,
    brief.copy.body ?? '',
    brief.copy.cta ?? '',
  );
  const templatePlan: TemplatePlan = renderTemplate(tpl, {
    width: preset.width,
    height: preset.height,
    margin: preset.margins,
    rtl,
    palette,
    hex: {
      background: palette.background,
      surface: palette.surface,
      primary: palette.primary,
      accent: palette.accent,
      text: palette.text,
      textMuted: palette.textMuted,
      onPrimary: palette.onPrimary,
    },
    fonts: fontsTpl,
    type,
    copy: copyTemplate,
    minFoot: preset.minFontSize,
    ...(bigNumber ? { bigNumber } : {}),
    direction,
    sp: (v: number) => snap(v, 8),
  });

  const plan = {
    archetype: `tpl:${tpl.id}`,
    nameAr: templatePlan.nameAr,
    rationaleAr: templatePlan.rationaleAr,
    blocks: templatePlan.blocks,
    shapes: templatePlan.shapes,
    readingFlow: 'rtl-z' as const,
    focal: templatePlan.focal,
  };
  const fontsFinal = fontsTpl;

  // Q2 contract as a backstop for templates too: no renderer may silently
  // drop the content rows, CTA or footer — ensureContentSlots fills any gap.
  ensureContentSlots(plan, copyTemplate, {
    content: {
      x: preset.margins,
      y: Math.max(preset.margins, preset.safeZones.top),
      width: preset.width - preset.margins * 2,
      height:
        preset.height -
        Math.max(preset.margins, preset.safeZones.top) -
        Math.max(preset.margins, preset.safeZones.bottom),
    },
    type,
    rtl,
    textColor: palette.text,
    mutedColor: palette.textMuted,
    pillColor: palette.primary,
  });

  const layers: Layer[] = [];
  layers.push({
    id: 'bg',
    name: '90_Background',
    type: 'background',
    x: 0,
    y: 0,
    width: preset.width,
    height: preset.height,
    z: 0,
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: true,
    mask: false,
    fill: hexToColor(palette.background),
    effects: [],
    metadata: { direction: direction.id, paletteMode: palette.mode },
  });

  plan.shapes.forEach((shape, index) => layers.push(shapeToLayer(shape, palette, index)));

  const textBlocks = plan.blocks.filter((block) => block.text.trim().length > 0);
  const ctaShape = plan.shapes.find((shape) => shape.id === 'cta-bg');
  textBlocks.forEach((block, index) =>
    layers.push(
      textToLayer(
        block,
        brief,
        preset,
        fontsFinal,
        palette,
        index,
        rtl,
        block.role === 'cta' && ctaShape ? ctaShape.fill : undefined,
      ),
    ),
  );

  if (
    !textBlocks.some((block) => block.role === 'logo') &&
    !plan.shapes.some((s) => s.id === 'logo-slot')
  ) {
    layers.push(logoPlaceholder(preset, palette, rtl));
  }

  layers.push({
    id: 'guides',
    name: '00_Guides',
    type: 'guide',
    x: 0,
    y: 0,
    width: preset.width,
    height: preset.height,
    z: 0,
    opacity: 0.35,
    blendMode: 'normal',
    visible: false,
    locked: true,
    mask: false,
    effects: [],
    metadata: { thirds: true, grid: 12, baseline: 8 },
  });

  clampTextLayers(layers, preset);

  const colors = [
    ...new Map(
      [
        palette.background,
        palette.surface,
        palette.primary,
        palette.accent,
        palette.text,
        palette.textMuted,
      ]
        .filter(isHex)
        .map((hex) => [normalizeHex(hex), hexToColor(hex)] as const),
    ).values(),
  ];

  const spec: DesignSpec = {
    id: crypto.randomUUID(),
    briefId: crypto.randomUUID(),
    canvas: {
      width: preset.width,
      height: preset.height,
      background: hexToColor(palette.background),
      platform: preset.id,
    },
    layers,
    groups: [
      '90_Background',
      '10_Text',
      '20_Brand',
      '30_Graphics',
      '40_Imagery',
      '50_Overlays',
      '00_Guides',
    ],
    fonts: [
      ...new Set([
        fontsFinal.display,
        fontsFinal.body,
        `${fontsFinal.display}-Bold`,
        `${fontsFinal.body}-Bold`,
      ]),
    ],
    colors,
    version: 1,
    createdAt: new Date().toISOString(),
  };

  return {
    spec,
    directionId: direction.id,
    directionNameAr: direction.nameAr,
    directionSummaryAr: direction.summaryAr,
    directionWhyAr: choice.whyAr,
    archetype: plan.archetype,
    archetypeNameAr: plan.nameAr,
    rationaleAr: plan.rationaleAr,
    paletteSummaryAr: `لوحة ${palette.mode === 'dark' ? 'داكنة' : 'فاتحة'} — ${palette.scheme} على ${colorToHex(hexToColor(palette.primary))}`,
    conceptId: direction.id,
    conceptTitleAr: direction.nameAr,
    variant,
  };
}

export function generateSpec(
  brief: DesignBrief,
  presetId: string,
  variant: number,
  brand?: SpecBrand,
): DesignSpec {
  return generateVariantDetails(brief, presetId, variant, brand).spec;
}

/** All three variants plus rationale, used by the desktop UI. */
export function generateVariantSet(
  brief: DesignBrief,
  presetId: string,
  brand?: SpecBrand,
): GeneratedVariant[] {
  // pickTemplates already guarantees the three variants differ in pattern
  // AND style, so no rotation is needed any more (the old archetype loop
  // existed because a prompt could force every direction onto one layout).
  return [0, 1, 2].map((variant) => generateVariantDetails(brief, presetId, variant, brand));
}

export { getDirection, DIRECTION_PRIMARY };
