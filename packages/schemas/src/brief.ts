import { z } from 'zod';

export const IntentSchema = z.enum([
  'post', 'story', 'reel_cover', 'carousel', 'cover_banner', 'thumbnail', 'ad', 'quote',
  'announcement', 'infographic', 'event',
]);

export const CopySchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  body: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  footer: z.string().optional(),
  generated: z.boolean().default(false),
});

export const VisualDirectionSchema = z.object({
  style: z.string(),
  colorIntent: z.array(z.string()).default([]),
  imageryType: z.string().optional(),
  composition: z.string().optional(),
});

export const DesignBriefSchema = z.object({
  intent: IntentSchema,
  platforms: z.array(z.string()).min(1),
  language: z.enum(['ar', 'en', 'mixed']).default('ar'),
  direction: z.enum(['rtl', 'ltr', 'auto']).default('auto'),
  copy: CopySchema,
  tone: z.string().optional(),
  audience: z.string().optional(),
  occasion: z.string().optional(),
  visualDirection: VisualDirectionSchema,
  brandRef: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  clarifyingQuestions: z.array(z.string()).max(2).default([]),
});

export type DesignBrief = z.infer<typeof DesignBriefSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Copy = z.infer<typeof CopySchema>;

export const SeriesPlanSchema = z.object({
  title: z.string(),
  count: z.number().int().positive(),
  sharedVisualSystem: z.string(),
  briefs: z.array(DesignBriefSchema),
});

export type SeriesPlan = z.infer<typeof SeriesPlanSchema>;