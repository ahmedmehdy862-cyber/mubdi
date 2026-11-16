import type { DesignBrief } from '@mubdi/schemas';
import type { HarmonyScheme } from './color.js';
import type { ScaleName } from './typography.js';

/**
 * Art direction = the set of decisions made *before* layout: palette mood,
 * typographic voice, imagery treatment, and the emotional temperature.
 * A brief picks three distinct directions so the variants are genuinely
 * different ideas, not three shades of the same idea.
 */

export type ShapeLanguage = 'geometric' | 'organic' | 'editorial' | 'brutalist' | 'none';

export interface ArtDirection {
  id: string;
  nameAr: string;
  nameEn: string;
  summaryAr: string;
  mood: string[];
  harmony: HarmonyScheme;
  paletteMode: 'dark' | 'light';
  typeScale: ScaleName;
  fontPair: 'cairo-cairo' | 'cairo-almarai' | 'almarai-cairo';
  layoutBias: string[];
  shapeLanguage: ShapeLanguage;
  imagery: { type: 'none' | 'abstract' | 'photo-band' | 'full-bleed'; treatmentAr: string };
  copyToneAr: string;
  doList: string[];
  dontList: string[];
  keywords: string[];
  intents: string[];
}

export const ART_DIRECTIONS: ArtDirection[] = [
  {
    id: 'editorial',
    nameAr: 'تحريري',
    nameEn: 'Editorial',
    summaryAr: 'شبكة صارمة، عنوان كبير، خطوط فاصلة رفيعة، ومساحات بيضاء منظمة. يبدو كغلاف مجلة محترم.',
    mood: ['رصين', 'واثق', 'منظّم'],
    harmony: 'analogous',
    paletteMode: 'light',
    typeScale: 'perfect-fourth',
    fontPair: 'cairo-almarai',
    layoutBias: ['editorial-stack', 'magazine-cover', 'poster-stack'],
    shapeLanguage: 'editorial',
    imagery: { type: 'photo-band', treatmentAr: 'شريط صورة أفقي مع تعتيم خفيف وخط فاصل' },
    copyToneAr: 'جمل قصيرة، عنوان بوزن ثقيل، وتفاصيل صغيرة بخط خفيف.',
    doList: ['حاذِ كل العناصر على عمود واحد', 'اجعل العنوان هو أكبر عنصر بفارق واضح', 'استخدم خطاً فاصلاً واحداً فقط'],
    dontList: ['لا توزّع العناصر على أكثر من محاذاتين', 'لا تستخدم أكثر من عائلتين خطيتين'],
    keywords: ['تحريري', 'مجلة', 'editorial', 'magazine', 'مقال', 'تقرير'],
    intents: ['infographic', 'quote', 'cover_banner'],
  },
  {
    id: 'bold-type',
    nameAr: 'طباعي جريء',
    nameEn: 'Bold Typographic',
    summaryAr: 'الكلمة هي الصورة: عنوان ضخم يملأ الإطار، تباعد أسطر مضبوط، ولكنة لون واحدة.',
    mood: ['جرأة', 'طاقة', 'وضوح'],
    harmony: 'complementary',
    paletteMode: 'dark',
    typeScale: 'perfect-fifth',
    fontPair: 'cairo-cairo',
    layoutBias: ['thumbnail-bold', 'poster-stack', 'minimal-frame'],
    shapeLanguage: 'geometric',
    imagery: { type: 'none', treatmentAr: 'لا صور؛ الشكل والطباعة يحملان التصميم' },
    copyToneAr: 'أربع كلمات كحد أقصى في العنوان، وفعل واحد في الزر.',
    doList: ['اجعل العنوان 60% من المساحة البصرية', 'اقطع الكلمات على أسطر مقصودة', 'استخدم لوناً واحداً للتأكيد'],
    dontList: ['لا تُصغّر العنوان لتُدخل كل الكلام', 'لا تُضف أكثر من لهجة لونية واحدة'],
    keywords: ['جريء', 'bold', 'قوي', 'صريح', 'شبابي', 'youth'],
    intents: ['post', 'ad', 'thumbnail'],
  },
  {
    id: 'minimal',
    nameAr: 'بسيط',
    nameEn: 'Minimal',
    summaryAr: 'مساحة بيضاء مسيطرة، عنصر واحد بطل، وتفاصيل صغيرة. الراحة البصرية هي الرسالة.',
    mood: ['هادئ', 'راقٍ', 'نقي'],
    harmony: 'monochromatic',
    paletteMode: 'light',
    typeScale: 'major-third',
    fontPair: 'cairo-cairo',
    layoutBias: ['minimal-frame', 'hero-center', 'quote-card'],
    shapeLanguage: 'none',
    imagery: { type: 'none', treatmentAr: 'لا صور؛ فراغ مقصود حول العنصر' },
    copyToneAr: 'سطر واحد فقط، بلا زخرفة لغوية.',
    doList: ['اترك 50% فراغاً على الأقل', 'عنصر واحد فقط في البؤرة', 'تباين عالٍ بين النص والخلفية'],
    dontList: ['لا تملأ الفراغ بعناصر ثانوية', 'لا تُضف ظلاً أو تدرّجاً بلا سبب'],
    keywords: ['بسيط', 'minimal', 'نظيف', 'clean', 'هادئ', 'راقي'],
    intents: ['quote', 'post'],
  },
  {
    id: 'luxury',
    nameAr: 'فخم',
    nameEn: 'Luxury',
    summaryAr: 'كحلي عميق ولمسات ذهبية، خطوط رفيعة، ومساحات تنفّس واسعة. القيمة تُقرأ قبل الكلام.',
    mood: ['فخم', 'محدود', 'متقن'],
    harmony: 'split-complementary',
    paletteMode: 'dark',
    typeScale: 'major-third',
    fontPair: 'almarai-cairo',
    layoutBias: ['minimal-frame', 'hero-center', 'event-poster'],
    shapeLanguage: 'editorial',
    imagery: { type: 'abstract', treatmentAr: 'تدرّج داكن خفيف مع إطار ذهبي رفيع' },
    copyToneAr: 'لغة مختصرة، أرقام واضحة، وتفاصيل خدمية صغيرة.',
    doList: ['استخدم الذهبي بنسبة لا تتجاوز 10%', 'أطر رفيعة وخطوط شعرية', 'مساحات واسعة حول الشعار'],
    dontList: ['لا تستخدم ألواناً نيون', 'لا تكدّس العناصر قرب الحواف'],
    keywords: ['فخم', 'luxury', 'ذهبي', 'gold', 'راقٍ', 'بريميوم', 'premium'],
    intents: ['event', 'ad', 'post'],
  },
  {
    id: 'youthful',
    nameAr: 'شبابي',
    nameEn: 'Youthful',
    summaryAr: 'ألوان مشبعة، أشكال هندسية متداخلة، وميل بسيط في العناصر. حركة حتى في صورة ثابتة.',
    mood: ['حيوي', 'ودود', 'قريب'],
    harmony: 'triadic',
    paletteMode: 'light',
    typeScale: 'major-third',
    fontPair: 'cairo-cairo',
    layoutBias: ['poster-stack', 'split-diagonal', 'hero-center'],
    shapeLanguage: 'geometric',
    imagery: { type: 'abstract', treatmentAr: 'دوائر/أشرطة هندسية بألوان اللوحة' },
    copyToneAr: 'مخاطبة مباشرة بصيغة الجمع أو الأمر، مع إيموجي واحد كحد أقصى.',
    doList: ['شكل هندسي واحد بطل', 'زاوية ميل ثابتة (مثلاً 8°)', 'لونان مشبعان + محايد'],
    dontList: ['لا تخلط أكثر من نظام أشكال', 'لا تملأ كل الزوايا بأشكال'],
    keywords: ['شبابي', 'youth', 'حيوي', 'energetic', 'طلاب', 'جامعات'],
    intents: ['event', 'announcement', 'post'],
  },
  {
    id: 'tech',
    nameAr: 'تقني',
    nameEn: 'Tech',
    summaryAr: 'خلفية داكنة، تدرّج واحد، أرقام بارزة وشبكة خفيفة. إحساس منتج رقمي حديث.',
    mood: ['دقيق', 'حديث', 'مبني على البيانات'],
    harmony: 'analogous',
    paletteMode: 'dark',
    typeScale: 'perfect-fourth',
    fontPair: 'cairo-cairo',
    layoutBias: ['split-diagonal', 'hero-center', 'magazine-cover'],
    shapeLanguage: 'geometric',
    imagery: { type: 'abstract', treatmentAr: 'تدرّج قطري + خطوط شبكة منخفضة التباين' },
    copyToneAr: 'مصطلحات واضحة، أرقام ومزايا قصيرة.',
    doList: ['سطر شبكة واحد خفيف', 'أرقام بوزن ثقيل', 'مساحة للشعار أعلى اليمين'],
    dontList: ['لا تستخدم أكثر من تدرّج واحد', 'لا تُضف ظلالاً ناعمة زائدة'],
    keywords: ['تقني', 'tech', 'رقمي', 'digital', 'تطبيق', 'app', 'ذكاء'],
    intents: ['ad', 'infographic', 'thumbnail'],
  },
  {
    id: 'organic',
    nameAr: 'طبيعي',
    nameEn: 'Organic',
    summaryAr: 'ألوان ترابية، أشكال دائرية ناعمة، ومساحات تتنفّس. دافئ وموثوق.',
    mood: ['دافئ', 'إنساني', 'صادق'],
    harmony: 'analogous',
    paletteMode: 'light',
    typeScale: 'major-second',
    fontPair: 'almarai-cairo',
    layoutBias: ['hero-center', 'poster-stack', 'quote-card'],
    shapeLanguage: 'organic',
    imagery: { type: 'photo-band', treatmentAr: 'صورة بمعالجة دافئة وحواف دائرية' },
    copyToneAr: 'لغة بسيطة ودودة، بلا مبالغات.',
    doList: ['ألوان من الطبيعة (أخضر/رملي/كريمي)', 'حواف دائرية كبيرة', 'عنوان بسطرين كحد أقصى'],
    dontList: ['لا تستخدم أسود نقي', 'لا تضع نصوصاً فوق تفاصيل صورة مزدحمة'],
    keywords: ['طبيعي', 'organic', 'قهوة', 'coffee', 'صحة', 'بيئة', 'حرفي'],
    intents: ['post', 'announcement'],
  },
  {
    id: 'heritage',
    nameAr: 'تراثي معاصر',
    nameEn: 'Modern Heritage',
    summaryAr: 'أخضر ورملي وذهبي مع إطار وزخرفة مبسّطة. هوية عربية حديثة بلا مبالغة.',
    mood: ['أصيل', 'موثوق', 'دافئ'],
    harmony: 'split-complementary',
    paletteMode: 'dark',
    typeScale: 'major-third',
    fontPair: 'cairo-almarai',
    layoutBias: ['event-poster', 'hero-center', 'minimal-frame'],
    shapeLanguage: 'editorial',
    imagery: { type: 'abstract', treatmentAr: 'زخرفة هندسية إسلامية مبسطة بخطوط ذهبية' },
    copyToneAr: 'فصحى بسيطة، احترام للمناسبة، وتفاصيل تاريخ/مكان واضحة.',
    doList: ['إطار مزدوج رفيع', 'نجمة/معين زخرفي واحد', 'أخضر أساسي + ذهبي للتفاصيل'],
    dontList: ['لا تستخدم زخرفة كثيفة خلف النص', 'لا تخلط 3 درجات ذهبية'],
    keywords: ['تراث', 'heritage', 'عربي', 'رمضان', 'وطني', 'ثقافة'],
    intents: ['event', 'announcement'],
  },
  {
    id: 'brutalist',
    nameAr: 'بروتاليست',
    nameEn: 'Brutalist',
    summaryAr: 'حدود سميكة، ألوان صريحة، ومحاذاة قاسية. صادم بقصد لجذب الانتباه في خلاصة مزدحمة.',
    mood: ['صادم', 'صريح', 'واثق'],
    harmony: 'complementary',
    paletteMode: 'light',
    typeScale: 'perfect-fifth',
    fontPair: 'cairo-cairo',
    layoutBias: ['thumbnail-bold', 'minimal-frame', 'poster-stack'],
    shapeLanguage: 'brutalist',
    imagery: { type: 'none', treatmentAr: 'لا صور؛ كتل لونية وحدود' },
    copyToneAr: 'عبارة واحدة قصيرة، حروف واضحة، بلا تلطيف.',
    doList: ['حدود 8px على الأقل', 'كتلة لون واحدة مسيطرة', 'نص أسود على أبيض أو العكس'],
    dontList: ['لا تُضف تدرّجات أو ظلال', 'لا تستخدم أكثر من لونين'],
    keywords: ['صريح', 'brutal', 'جريء', 'مختلف'],
    intents: ['ad', 'thumbnail', 'post'],
  },
  {
    id: 'cinematic',
    nameAr: 'سينمائي',
    nameEn: 'Cinematic',
    summaryAr: 'صورة كاملة مع تعتيم متدرّج ونص في الأسفل. مشهد قبل أن يكون تصميماً.',
    mood: ['درامي', 'غامر', 'مكثّف'],
    harmony: 'complementary',
    paletteMode: 'dark',
    typeScale: 'perfect-fourth',
    fontPair: 'cairo-almarai',
    layoutBias: ['cinematic-bleed', 'poster-stack', 'story-stack'],
    shapeLanguage: 'none',
    imagery: { type: 'full-bleed', treatmentAr: 'تعتيم من الأسفل للأعلى + عنوان أبيض' },
    copyToneAr: 'عنوان قصير وشعري، وسطر واحد للتفاصيل.',
    doList: ['تعتيم 40–70% أسفل النص', 'عنوان أبيض بوزن ثقيل', 'تفاصيل صغيرة أعلى الإطار'],
    dontList: ['لا تضع النص فوق منطقة مضيئة', 'لا تستخدم نصاً رفيعاً فوق صورة'],
    keywords: ['سينمائي', 'cinematic', 'درامي', 'فيلم', 'مشهد'],
    intents: ['story', 'event', 'reel_cover'],
  },
];

function keywordHits(brief: DesignBrief, keywords: string[]): number {
  const haystack = [brief.visualDirection.style, brief.tone ?? '', brief.occasion ?? '', brief.copy.headline, brief.copy.subheadline ?? '', brief.audience ?? '']
    .join(' ')
    .toLowerCase();
  return keywords.reduce((acc, k) => (haystack.includes(k.toLowerCase()) ? acc + 1 : acc), 0);
}

export interface DirectionChoice {
  direction: ArtDirection;
  score: number;
  whyAr: string;
}

/**
 * Visual families. Three variants must not be three shades of the same idea,
 * so no two picks may come from the same family.
 */
const DIRECTION_FAMILY: Record<string, string> = {
  editorial: 'clean',
  tech: 'clean',
  cinematic: 'clean',
  'bold-type': 'bold',
  youthful: 'bold',
  brutalist: 'bold',
  minimal: 'elegant',
  luxury: 'elegant',
  heritage: 'elegant',
  organic: 'organic',
};

/** Rank directions for a brief and return `n` distinct ideas. */
export function pickDirections(brief: DesignBrief, n = 3): DirectionChoice[] {
  const scored = ART_DIRECTIONS.map((direction) => {
    let score = 50;
    const reasons: string[] = [];
    if (direction.intents.includes(brief.intent)) {
      score += 18;
      reasons.push(`مناسب لنوع المحتوى (${brief.intent})`);
    }
    const hits = keywordHits(brief, direction.keywords);
    if (hits > 0) {
      score += hits * 12;
      reasons.push(`يطابق كلمات الطلب (${hits})`);
    }
    const colors = brief.visualDirection.colorIntent;
    if (colors.length > 0) {
      const wantsGold = colors.some((c) => /c9a227|d4af37|gold/i.test(c)) || /ذهبي/.test(brief.copy.headline);
      if (wantsGold && (direction.id === 'luxury' || direction.id === 'heritage')) {
        score += 15;
        reasons.push('الذهبي يوجّه نحو طابع فخم/تراثي');
      }
      if (direction.id === 'heritage' && colors.some((c) => /1f7a3d/i.test(c))) {
        score += 12;
        reasons.push('الأخضر يدعم الطابع التراثي');
      }
    }
    if (brief.tone === 'youthful' && (direction.id === 'youthful' || direction.id === 'bold-type')) {
      score += 14;
      reasons.push('النبرة شبابية');
    }
    if (brief.language === 'en' && direction.id === 'editorial') {
      score += 6;
      reasons.push('التحريري يعمل جيداً مع الإنجليزية');
    }
    return { direction, score, whyAr: reasons.length ? reasons.join('، ') : 'خيار متوازن وآمن' };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked: DirectionChoice[] = [];
  const families = new Set<string>();
  for (const candidate of scored) {
    if (picked.some((p) => p.direction.id === candidate.direction.id)) continue;
    const family = DIRECTION_FAMILY[candidate.direction.id] ?? candidate.direction.id;
    if (families.has(family)) continue;
    picked.push(candidate);
    families.add(family);
    if (picked.length >= n) break;
  }
  // If the brief is so narrow that families run out, fill with the best rest.
  if (picked.length < n) {
    for (const candidate of scored) {
      if (picked.some((p) => p.direction.id === candidate.direction.id)) continue;
      picked.push(candidate);
      if (picked.length >= n) break;
    }
  }
  return picked;
}

export function getDirection(id: string): ArtDirection {
  return ART_DIRECTIONS.find((d) => d.id === id) ?? ART_DIRECTIONS[0]!;
}
