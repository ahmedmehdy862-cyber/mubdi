import type { DesignBrief, PlatformPreset } from '@mubdi/schemas';

export interface Composition {
  id: string;
  name: string;
  nameAr: string;
  score: (brief: DesignBrief, preset: PlatformPreset) => number;
}

const COMPOSITIONS: Composition[] = [
  {
    id: 'hero-center',
    name: 'Hero Center',
    nameAr: 'بطلك في المنتصف',
    score: (b) => (b.intent === 'event' || b.intent === 'announcement' ? 90 : 60),
  },
  {
    id: 'hero-left',
    name: 'Hero Left',
    nameAr: 'بطلك يسار',
    score: (b) => (b.direction === 'ltr' ? 85 : 50),
  },
  {
    id: 'quote-card',
    name: 'Quote Card',
    nameAr: 'بطاقة اقتباس',
    score: (b) => (b.intent === 'quote' ? 95 : 30),
  },
  {
    id: 'split-image',
    name: 'Split Image',
    nameAr: 'صورة مقسومة',
    score: (b) => (b.visualDirection.imageryType === 'photo' ? 80 : 55),
  },
  {
    id: 'minimal-poster',
    name: 'Minimal Poster',
    nameAr: 'ملصق بسيط',
    score: (b) => (b.visualDirection.style?.includes('minimal') ? 90 : 50),
  },
  {
    id: 'stats-card',
    name: 'Stats Card',
    nameAr: 'بطاقة إحصائيات',
    score: (b) => (b.intent === 'infographic' ? 90 : 40),
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    nameAr: 'شهادة',
    score: (b) => (b.intent === 'quote' ? 80 : 35),
  },
  {
    id: 'event-announcement',
    name: 'Event Announcement',
    nameAr: 'إعلان فعالية',
    score: (b) => (b.intent === 'event' ? 95 : 40),
  },
  { id: 'before-after', name: 'Before/After', nameAr: 'قبل/بعد', score: () => 45 },
  {
    id: 'checklist',
    name: 'Checklist',
    nameAr: 'قائمة',
    score: (b) => (b.intent === 'infographic' ? 75 : 40),
  },
  {
    id: 'thumbnail-bold',
    name: 'Thumbnail Bold',
    nameAr: 'مصغرة بارزة',
    score: (b, p) => (p.id === 'yt_thumb' ? 95 : 40),
  },
  {
    id: 'story-vertical',
    name: 'Story Vertical',
    nameAr: 'ستوري عمودي',
    score: (b, p) => (p.id.includes('story') ? 95 : 30),
  },
];

export function pickTopCompositions(
  brief: DesignBrief,
  preset: PlatformPreset,
  n = 3,
): Composition[] {
  return [...COMPOSITIONS]
    .map((c) => ({ c, s: c.score(brief, preset) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.c);
}

export function listCompositions(): Composition[] {
  return COMPOSITIONS;
}
