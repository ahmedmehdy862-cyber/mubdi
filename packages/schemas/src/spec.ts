import { z } from 'zod';

export const ColorSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
  a: z.number().min(0).max(1).default(1),
});

export type Color = z.infer<typeof ColorSchema>;

export const TextRunSchema = z.object({
  text: z.string(),
  font: z.string(),
  size: z.number().positive(),
  tracking: z.number().default(0),
  leading: z.number().positive().optional(),
  direction: z.enum(['rtl', 'ltr']).default('rtl'),
  language: z.enum(['ar', 'en', 'mixed']).default('ar'),
  color: ColorSchema,
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
});

export type TextRun = z.infer<typeof TextRunSchema>;

export interface Layer {
  id: string;
  name: string;
  type: 'text' | 'shape' | 'image' | 'group' | 'background' | 'overlay' | 'guide';
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  opacity: number;
  blendMode: string;
  visible: boolean;
  locked: boolean;
  mask: boolean;
  textRuns?: TextRun[] | undefined;
  fill?: Color | undefined;
  stroke?: { color: Color; width: number } | undefined;
  imageSrc?: string | undefined;
  children?: Layer[] | undefined;
  effects: string[];
  metadata: Record<string, unknown>;
}

export const LayerSchema: z.ZodType<Layer> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'shape', 'image', 'group', 'background', 'overlay', 'guide']),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  z: z.number().int(),
  opacity: z.number().min(0).max(1).default(1),
  blendMode: z.string().default('normal'),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  mask: z.boolean().default(false),
  textRuns: z.array(TextRunSchema).optional(),
  fill: ColorSchema.optional(),
  stroke: z.object({ color: ColorSchema, width: z.number().positive() }).optional(),
  imageSrc: z.string().optional(),
  children: z.array(z.lazy(() => LayerSchema)).optional(),
  effects: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const DesignSpecSchema = z.object({
  id: z.string(),
  briefId: z.string(),
  canvas: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    background: ColorSchema,
    platform: z.string(),
  }),
  layers: z.array(LayerSchema),
  groups: z.array(z.string()).default([]),
  fonts: z.array(z.string()).default([]),
  colors: z.array(ColorSchema).default([]),
  version: z.number().int().positive().default(1),
  createdAt: z.string(),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;