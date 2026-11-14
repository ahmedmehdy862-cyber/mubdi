import { DesignBriefSchema, SeriesPlanSchema, type DesignBrief, type SeriesPlan } from '@mubdi/schemas';

const PLATFORM_KEYWORDS: [string[], string][] = [
  [['انستجرام', 'instagram', 'insta'], 'ig_post_4x5'],
  [['ستوري', 'story', 'reels', 'ريل'], 'ig_story'],
  [['فيسبوك', 'facebook'], 'fb_post'],
  [['تويتر', 'twitter'], 'x_post'],
  [['لينكد', 'linkedin'], 'li_post'],
  [['تيك', 'tiktok'], 'tt_cover'],
  [['يوتيوب', 'youtube'], 'yt_thumb'],
];

const INTENT_KEYWORDS: [string[], DesignBrief['intent']][] = [
  [['كاروسيل', 'carousel'], 'carousel'],
  [['ستوري', 'story'], 'story'],
  [['غلاف', 'cover', 'banner', 'بانر'], 'cover_banner'],
  [['مصغرة', 'thumbnail'], 'thumbnail'],
  [['ملتقى', 'فعالية', 'حدث', 'event'], 'event'],
  [['اقتباس', 'quote'], 'quote'],
  [['انفوجرافيك', 'infographic'], 'infographic'],
  [['إعلان', 'ad'], 'ad'],
];

const COLOR_MAP: Record<string, string> = {
  'أخضر': '#1f7a3d', 'green': '#1f7a3d',
  'ذهبي': '#c9a227', 'gold': '#c9a227', 'golden': '#c9a227',
  'أزرق': '#1e3a8a', 'blue': '#1e3a8a',
  'أحمر': '#b91c1c', 'red': '#b91c1c',
  'أسود': '#0f172a', 'black': '#0f172a',
  'أبيض': '#f8fafc', 'white': '#f8fafc',
  'وردي': '#db2777', 'pink': '#db2777',
  'برتقالي': '#ea580c', 'orange': '#ea580c',
  'بنفسجي': '#7c3aed', 'purple': '#7c3aed',
};

function detectLanguage(prompt: string): DesignBrief['language'] {
  const hasAr = /[\u0600-\u06FF]/.test(prompt);
  const hasEn = /[a-zA-Z]/.test(prompt);
  if (hasAr && hasEn) return 'mixed';
  if (hasAr) return 'ar';
  return 'en';
}

function kwMatch(prompt: string, kws: string[]): boolean {
  const low = prompt.toLowerCase();
  return kws.some((k) => low.includes(k.toLowerCase()));
}

function detectPlatform(prompt: string): string {
  for (const [kws, id] of PLATFORM_KEYWORDS) if (kwMatch(prompt, kws)) return id;
  return 'ig_post_4x5';
}

function detectIntent(prompt: string): DesignBrief['intent'] {
  for (const [kws, intent] of INTENT_KEYWORDS) if (kwMatch(prompt, kws)) return intent;
  return 'post';
}

function extractColors(prompt: string): string[] {
  const found: string[] = [];
  for (const [word, hex] of Object.entries(COLOR_MAP)) {
    if (prompt.toLowerCase().includes(word.toLowerCase())) found.push(hex);
  }
  return [...new Set(found)];
}

function extractHeadline(prompt: string): string {
  // quoted
  const quoted = prompt.match(/["«](.+?)["»]/);
  if (quoted && quoted[1]) return quoted[1];
  // event phrase
  const ev = prompt.match(/(ملتقى[^\n،,\.]+)/);
  if (ev && ev[1]) return ev[1].trim();
  // announcement target
  const ann = prompt.match(/إعلان\s+(.+)/);
  if (ann && ann[1]) {
    const cleaned = ann[1].split(/[،,]/)[0];
    if (cleaned) return cleaned.trim();
  }
  return '';
}

function extractDay(prompt: string): string | undefined {
  const days = ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'Friday'];
  for (const d of days) if (prompt.includes(d)) return d;
  return undefined;
}

function extractTime(prompt: string): string | undefined {
  const m = prompt.match(/الساعة\s*([0-9٠-٩]+)\s*(مساءً|صباحاً)?/);
  if (m) return m[0].trim();
  const m2 = prompt.match(/([0-9٠-٩]+)\s*(مساءً|صباحاً)/);
  if (m2) return m2[0].trim();
  return undefined;
}

export function parseBrief(prompt: string, brandRef?: string): DesignBrief {
  const lang = detectLanguage(prompt);
  const intent = detectIntent(prompt);
  const platform = detectPlatform(prompt);
  const colors = extractColors(prompt);
  const headline = extractHeadline(prompt);
  const day = extractDay(prompt);
  const time = extractTime(prompt);
  const subheadline = [day, time].filter(Boolean).join(' ') || undefined;

  const generated = !headline;
  const finalHeadline = headline || 'عنوان رئيسي';

  const brief: DesignBrief = {
    intent,
    platforms: [platform],
    language: lang,
    direction: lang === 'en' ? 'ltr' : 'rtl',
    copy: {
      headline: finalHeadline,
      subheadline,
      body: undefined,
      cta: lang === 'en' ? 'Learn more' : 'سجّل الآن',
      hashtags: [],
      footer: undefined,
      generated,
    },
    tone: kwMatch(prompt, ['شبابي', 'youth']) ? 'youthful' : undefined,
    audience: kwMatch(prompt, ['جامعات', 'university', 'students']) ? 'university students' : undefined,
    occasion: kwMatch(prompt, ['تطوع', 'volunteer']) ? 'volunteering event' : undefined,
    visualDirection: {
      style: kwMatch(prompt, ['شبابي', 'youth']) ? 'youthful, energetic' : 'professional',
      colorIntent: colors,
      imageryType: 'geometric',
      composition: 'hero text',
    },
    brandRef,
    constraints: [],
    assumptions: [
      ...(generated ? ['Headline generated (not extracted from prompt)'] : []),
      ...(colors.length === 0 ? ['Default palette applied (no colors specified)'] : []),
      `Platform inferred: ${platform}`,
    ],
    clarifyingQuestions: [],
  };

  return DesignBriefSchema.parse(brief);
}

export function parseSeriesPlan(prompt: string): SeriesPlan | null {
  if (!kwMatch(prompt, ['كاروسيل', 'carousel'])) return null;
  const countMatch = prompt.match(/(\d+)\s*(شرائح|slides|صفحات)/);
  const count = countMatch && countMatch[1] ? parseInt(countMatch[1], 10) : 5;
  const topic = prompt.replace(/كاروسيل\s*\d*\s*شرائح?\s*عن\s*/i, '').trim() || 'فوائد التطوع';
  const briefs: DesignBrief[] = [];
  for (let i = 0; i < count; i++) {
    const b = parseBrief(topic, undefined);
    b.copy.headline = topic + ' — ' + (i + 1);
    b.intent = 'carousel';
    briefs.push(b);
  }
  const plan: SeriesPlan = {
    title: topic,
    count,
    sharedVisualSystem: 'single palette + typography across slides',
    briefs,
  };
  return SeriesPlanSchema.parse(plan);
}

export function isEditRequest(prompt: string): boolean {
  return /كبّر|غيّر|change|make it|more like|أكبر|أصغر|غيّر/i.test(prompt);
}

export { DesignBriefSchema, SeriesPlanSchema };
export type { DesignBrief, SeriesPlan };