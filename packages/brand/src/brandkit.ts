import type { BrandKit } from '@mubdi/schemas';

export function defaultBrandKit(name = 'Default'): BrandKit {
  return {
    id: crypto.randomUUID(),
    name,
    logo: { variants: [] },
    palette: {
      primary: '#1f7a3d',
      secondary: '#c9a227',
      accent: '#c9a227',
      background: '#0f172a',
      text: '#f8fafc',
      roles: { primary: '#1f7a3d', accent: '#c9a227', background: '#0f172a', text: '#f8fafc' },
    },
    fonts: { arabic: 'Cairo', latin: 'Inter', arabicBold: 'Cairo', latinBold: 'Inter' },
    tone: 'professional',
    dos: [],
    donts: [],
  };
}

export function deriveBrandKitFromColors(colors: string[], name = 'Derived'): BrandKit {
  const bk = defaultBrandKit(name);
  if (colors[0]) bk.palette.primary = colors[0];
  if (colors[1]) bk.palette.accent = colors[1];
  bk.palette.roles.primary = bk.palette.primary;
  bk.palette.roles.accent = bk.palette.accent;
  return bk;
}