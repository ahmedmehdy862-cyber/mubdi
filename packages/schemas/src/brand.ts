import { z } from 'zod';

export const BrandKitSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.object({
    primary: z.string().optional(),
    monochrome: z.string().optional(),
    variants: z.array(z.string()).default([]),
  }).default({ variants: [] }),
  palette: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
    roles: z.record(z.string(), z.string()).default({}),
  }),
  fonts: z.object({
    arabic: z.string(),
    latin: z.string(),
    arabicBold: z.string().optional(),
    latinBold: z.string().optional(),
  }),
  tone: z.string().optional(),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;