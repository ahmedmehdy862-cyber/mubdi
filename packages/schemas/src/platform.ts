import { z } from 'zod';

export const PlatformPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safeZones: z.object({
    top: z.number().int().nonnegative(),
    right: z.number().int().nonnegative(),
    bottom: z.number().int().nonnegative(),
    left: z.number().int().nonnegative(),
  }),
  margins: z.number().int().nonnegative(),
  minFontSize: z.number().int().positive(),
  maxTextDensity: z.number().positive(),
  aspectRatio: z.string(),
});

export type PlatformPreset = z.infer<typeof PlatformPresetSchema>;

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: 'ig_post_4x5', name: 'Instagram Post 4:5', nameAr: 'منشور انستجرام 4:5', width: 1080, height: 1350, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 64, minFontSize: 24, maxTextDensity: 0.35, aspectRatio: '4:5' },
  { id: 'ig_post_1x1', name: 'Instagram Post 1:1', nameAr: 'منشور انستجرام مربع', width: 1080, height: 1080, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 64, minFontSize: 24, maxTextDensity: 0.4, aspectRatio: '1:1' },
  { id: 'ig_story', name: 'Instagram/FB/WhatsApp Story', nameAr: 'ستوري', width: 1080, height: 1920, safeZones: { top: 120, right: 0, bottom: 200, left: 0 }, margins: 64, minFontSize: 28, maxTextDensity: 0.3, aspectRatio: '9:16' },
  { id: 'fb_post', name: 'Facebook Post', nameAr: 'منشور فيسبوك', width: 1200, height: 630, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 48, minFontSize: 22, maxTextDensity: 0.4, aspectRatio: '1.91:1' },
  { id: 'fb_post_sq', name: 'Facebook Post Square', nameAr: 'منشور فيسبوك مربع', width: 1080, height: 1350, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 64, minFontSize: 24, maxTextDensity: 0.35, aspectRatio: '4:5' },
  { id: 'fb_cover', name: 'Facebook Cover', nameAr: 'غلاف فيسبوك', width: 820, height: 312, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 32, minFontSize: 20, maxTextDensity: 0.5, aspectRatio: '2.63:1' },
  { id: 'x_post', name: 'X Post', nameAr: 'منشور X', width: 1600, height: 900, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 64, minFontSize: 24, maxTextDensity: 0.4, aspectRatio: '16:9' },
  { id: 'x_header', name: 'X Header', nameAr: 'رأس X', width: 1500, height: 500, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 48, minFontSize: 22, maxTextDensity: 0.45, aspectRatio: '3:1' },
  { id: 'li_post', name: 'LinkedIn Post', nameAr: 'منشور لينكدإن', width: 1200, height: 627, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 48, minFontSize: 22, maxTextDensity: 0.4, aspectRatio: '1.91:1' },
  { id: 'li_carousel', name: 'LinkedIn Carousel', nameAr: 'كاروسيل لينكدإن', width: 1080, height: 1350, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 64, minFontSize: 24, maxTextDensity: 0.35, aspectRatio: '4:5' },
  { id: 'li_banner', name: 'LinkedIn Banner', nameAr: 'بانر لينكدإن', width: 1584, height: 396, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 40, minFontSize: 20, maxTextDensity: 0.5, aspectRatio: '3.99:1' },
  { id: 'yt_thumb', name: 'YouTube Thumbnail', nameAr: 'صورة مصغرة يوتيوب', width: 1280, height: 720, safeZones: { top: 0, right: 0, bottom: 0, left: 0 }, margins: 48, minFontSize: 32, maxTextDensity: 0.35, aspectRatio: '16:9' },
  { id: 'tt_cover', name: 'TikTok Cover', nameAr: 'غلاف تيك توك', width: 1080, height: 1920, safeZones: { top: 120, right: 0, bottom: 200, left: 0 }, margins: 64, minFontSize: 28, maxTextDensity: 0.3, aspectRatio: '9:16' },
];

export function getPreset(id: string): PlatformPreset | undefined {
  return PLATFORM_PRESETS.find((p) => p.id === id);
}

export function listPresets(): PlatformPreset[] {
  return PLATFORM_PRESETS;
}