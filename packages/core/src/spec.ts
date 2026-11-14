import type { DesignBrief, PlatformPreset } from '@mubdi/schemas';
import { getPreset } from '@mubdi/schemas';

const DEFAULT_BG = { r: 18, g: 24, b: 40, a: 1 };

export function generateSpec(brief: DesignBrief, presetId: string, variant: number, brand?: { palette?: { primary?: string; accent?: string; background?: string; text?: string }; fonts?: { arabic?: string } }): import('@mubdi/schemas').DesignSpec {
  const preset = getPreset(presetId)!;
  const accent = brief.visualDirection.colorIntent[0] || '#1f7a3d';
  const accent2 = brief.visualDirection.colorIntent[1] || '#c9a227';
  const bg = brand?.palette?.background
    ? hexToColor(brand.palette.background)
    : (variant === 0 ? DEFAULT_BG : variant === 1 ? { r: 24, g: 30, b: 52, a: 1 } : { r: 14, g: 20, b: 34, a: 1 });
  const textColor = { r: 248, g: 250, b: 252, a: 1 };
  const fontAr = brand?.fonts?.arabic || 'Cairo';
  const isRtl = brief.direction !== 'ltr';

  const layers: import('@mubdi/schemas').Layer[] = [];
  let z = 0;

  // Background
  layers.push({
    id: 'bg', name: '90_Background', type: 'background',
    x: 0, y: 0, width: preset.width, height: preset.height, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    fill: bg, effects: [], metadata: {},
  });

  // Accent shape
  layers.push({
    id: 'accent', name: 'accent-shape', type: 'shape',
    x: 60, y: preset.height - 200, width: 180, height: 80, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    fill: hexToColor(accent2), effects: [], metadata: {},
  });

  // Logo placeholder
  layers.push({
    id: 'logo', name: 'LOGO', type: 'image',
    x: 60, y: 60, width: 180, height: 60, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    fill: { r: 255, g: 255, b: 255, a: 1 }, effects: [], metadata: {},
  });

  // Headline
  const headlineSize = variant === 0 ? 72 : variant === 1 ? 64 : 80;
  layers.push({
    id: 'headline', name: 'HEADLINE', type: 'text',
    x: 60, y: Math.round(preset.height * 0.55), width: preset.width - 120, height: 120, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    textRuns: [{
      text: brief.copy.headline,
      font: fontAr + '-Bold',
      size: headlineSize,
      tracking: 0,
      direction: isRtl ? 'rtl' : 'ltr',
      language: brief.language === 'en' ? 'en' : 'ar',
      color: textColor,
      bold: true,
      italic: false,
    }],
    effects: [], metadata: {},
  });

  // Subheadline
  if (brief.copy.subheadline) {
    layers.push({
      id: 'subhead', name: 'SUBHEAD', type: 'text',
      x: 60, y: Math.round(preset.height * 0.55) + 130, width: preset.width - 120, height: 60, z: z++,
      opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
      textRuns: [{
        text: brief.copy.subheadline,
        font: fontAr,
        size: 36,
        tracking: 0,
        direction: isRtl ? 'rtl' : 'ltr',
        language: brief.language === 'en' ? 'en' : 'ar',
        color: { r: 200, g: 210, b: 230, a: 1 },
        bold: false,
        italic: false,
      }],
      effects: [], metadata: {},
    });
  }

  // CTA
  layers.push({
    id: 'cta-bg', name: 'CTA-bg', type: 'shape',
    x: 60, y: preset.height - 160, width: 220, height: 60, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    fill: hexToColor(accent), effects: [], metadata: {},
  });
  layers.push({
    id: 'cta', name: 'CTA', type: 'text',
    x: 60, y: preset.height - 160, width: 220, height: 60, z: z++,
    opacity: 1, blendMode: 'normal', visible: true, locked: false, mask: false,
    textRuns: [{
      text: brief.copy.cta || 'سجّل الآن',
      font: fontAr + '-Bold',
      size: 28,
      tracking: 0,
      direction: isRtl ? 'rtl' : 'ltr',
      language: brief.language === 'en' ? 'en' : 'ar',
      color: { r: 255, g: 255, b: 255, a: 1 },
      bold: true,
      italic: false,
    }],
    effects: [], metadata: {},
  });

  // Guides (hidden)
  layers.push({
    id: 'guides', name: '00_Guides', type: 'guide',
    x: 0, y: 0, width: preset.width, height: preset.height, z: 0,
    opacity: 0.3, blendMode: 'normal', visible: false, locked: true, mask: false,
    effects: [], metadata: {},
  });

  // Reorder names to convention: we keep layer order top->bottom as appended; canvas draws reverse.
  // Ensure names include group prefix handled by renderer for PSD. For PNG render, flat is fine.

  const spec: import('@mubdi/schemas').DesignSpec = {
    id: crypto.randomUUID(),
    briefId: crypto.randomUUID(),
    canvas: {
      width: preset.width,
      height: preset.height,
      background: bg,
      platform: preset.id,
    },
    layers,
    groups: ['90_Background', '10_Text', '20_Brand', '30_Graphics', '40_Imagery', '50_Overlays', '00_Guides'],
    fonts: [fontAr, fontAr + '-Bold'],
    colors: [bg, hexToColor(accent), hexToColor(accent2), textColor],
    version: 1,
    createdAt: new Date().toISOString(),
  };
  return spec;
}

function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: 1,
  };
}

export { hexToColor };