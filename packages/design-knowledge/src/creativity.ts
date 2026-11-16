import type { DesignBrief } from '@mubdi/schemas';

/**
 * Creativity engine.
 *
 * Three variants of the same layout with different colours is not creativity.
 * These routes force a different *idea*: a visual metaphor, a scale shift, a
 * sequence, a typographic pun, negative space… Each route states the concept
 * in one sentence, the device it uses, and the risk it takes — which is what
 * a creative director would write on a brief before layout begins.
 */

export type ConceptDevice =
  | 'metaphor'
  | 'scale'
  | 'contrast'
  | 'sequence'
  | 'typographic'
  | 'negative-space'
  | 'pattern'
  | 'human'
  | 'data'
  | 'collage';

export interface ConceptRoute {
  id: string;
  titleAr: string;
  ideaAr: string;
  device: ConceptDevice;
  deviceAr: string;
  visualAr: string;
  copyAngleAr: string;
  riskAr: string;
  keywords: string[];
}

const DEVICE_AR: Record<ConceptDevice, string> = {
  metaphor: 'استعارة بصرية',
  scale: 'تكبير/تصغير متطرف',
  contrast: 'تباين حاد',
  sequence: 'تسلسل/حكاية',
  typographic: 'لعبة طباعية',
  'negative-space': 'الفراغ كعنصر',
  pattern: 'نمط متكرر',
  human: 'عنصر بشري',
  data: 'رقم كبطل',
  collage: 'كولاج/تجميع',
};

const CONCEPTS: ConceptRoute[] = [
  {
    id: 'one-word-hero',
    titleAr: 'كلمة واحدة بطلة',
    ideaAr: 'اختر أقوى كلمة في الرسالة واجعلها تملأ 70% من الإطار؛ الباقي هامش ونقطة.',
    device: 'typographic',
    deviceAr: DEVICE_AR.typographic,
    visualAr: 'الحرف الأول يعمل كشكل خلفي شفاف، والكلمة كاملة فوقه بوزن أسود.',
    copyAngleAr: 'عنوان من كلمة إلى ثلاث كلمات، وفعل واحد أسفل الإطار.',
    riskAr: 'يحتاج كلمة عربية قوية قصيرة؛ الكلمات الطويلة تفقد أثرها.',
    keywords: ['قوي', 'bold', 'إعلان', 'ad', 'thumbnail'],
  },
  {
    id: 'number-hero',
    titleAr: 'الرقم هو البطل',
    ideaAr: 'أبرز رقم واحد (سنة، نسبة، عدد) بحجم ضخم واجعله يحمل الرسالة بدل الشرح.',
    device: 'data',
    deviceAr: DEVICE_AR.data,
    visualAr: 'رقم بعرض 4 أعمدة بلون اللوحة الأساسي، وتفاصيل صغيرة في عمود مجاور.',
    copyAngleAr: 'الرقم + سطر واحد يشرحه + مصدر صغير.',
    riskAr: 'لا يصلح إذا لم يكن في الرسالة رقم حقيقي.',
    keywords: ['انفوجرافيك', 'infographic', 'تقرير', 'إحصاء', 'نسبة'],
  },
  {
    id: 'negative-space-frame',
    titleAr: 'الفراغ يحكي',
    ideaAr: 'اترك مساحة فارغة كبيرة (60%) وضع العنصر في زاوية واحدة؛ الفراغ يقول «ثقة» و«فخامة».',
    device: 'negative-space',
    deviceAr: DEVICE_AR['negative-space'],
    visualAr: 'إطار شعري رفيع حول الكانفس، وعنوان صغير في الثلث السفلي.',
    copyAngleAr: 'سطر واحد فقط، بلا تفاصيل.',
    riskAr: 'يبدو فارغاً إذا كان العنصر ضعيفاً أو الخط غير مناسب.',
    keywords: ['بسيط', 'minimal', 'فخم', 'luxury', 'هادئ'],
  },
  {
    id: 'split-tension',
    titleAr: 'توتر الانقسام',
    ideaAr: 'اقسم الإطار قطرياً أو أفقياً بين لونين متكاملين، وضع النص على الخط الفاصل.',
    device: 'contrast',
    deviceAr: DEVICE_AR.contrast,
    visualAr: 'نصف داكن ونصف فاتح مع عنوان يعبر الحد؛ العنصر الواحد يعيش في العالمين.',
    copyAngleAr: 'عنوان من شطرين متضادين: «قبل / بعد»، «أنت / نحن».',
    riskAr: 'سهل أن يصبح صاخباً؛ التزم بلونين فقط.',
    keywords: ['مقارنة', 'قبل', 'بعد', 'تغيير', 'تباين'],
  },
  {
    id: 'metaphor-object',
    titleAr: 'شيء يمثل الفكرة',
    ideaAr: 'اختر شيئاً مادياً يمثل المعنى (بذرة، جسر، باب، خيط) واجعله العنصر البصري الوحيد.',
    device: 'metaphor',
    deviceAr: DEVICE_AR.metaphor,
    visualAr: 'شكل مبسّط من الصورة/الأيقونة + ظل واحد خفيف + عنوان قصير.',
    copyAngleAr: 'المعنى في الشيء؛ النص يفسّره في سطر.',
    riskAr: 'الاستعارة الواضحة فقط؛ الغامضة تُقرأ كزخرفة.',
    keywords: ['تطوع', 'تعليم', 'نمو', 'أمل', 'مبادرة', 'مجتمع'],
  },
  {
    id: 'pattern-field',
    titleAr: 'حقل نمط',
    ideaAr: 'كرّر وحدة هندسية واحدة (نجمة، نقطة، خط) بكثافة متغيّرة، ثم ضع النص في منطقة هادئة.',
    device: 'pattern',
    deviceAr: DEVICE_AR.pattern,
    visualAr: 'نمط إسلامي مبسّط أو شبكة نقطية يتلاشى تدريجياً نحو منطقة النص.',
    copyAngleAr: 'عنوان تحريري هادئ + تفاصيل صغيرة.',
    riskAr: 'النمط قد يزاحم النص؛ خفّض تباينه إلى 10–15%.',
    keywords: ['تراث', 'heritage', 'رمضان', 'ثقافة', 'وطني'],
  },
  {
    id: 'human-gaze',
    titleAr: 'نظرة إنسان',
    ideaAr: 'صورة شخص ينظر إلى داخل الإطار حيث يوجد العنوان؛ العين تتبع اتجاه النظر.',
    device: 'human',
    deviceAr: DEVICE_AR.human,
    visualAr: 'صورة بورتريه بمعالجة لونية موحدة + تعتيم خفيف + عنوان في مسار النظر.',
    copyAngleAr: 'مخاطبة مباشرة بضمير المخاطب.',
    riskAr: 'يحتاج صورة مناسبة؛ الصور المكدسة تقتل الفكرة.',
    keywords: ['جامعات', 'طلاب', 'شبابي', 'مجتمع', 'فريق'],
  },
  {
    id: 'sequence-strip',
    titleAr: 'شريط حكاية',
    ideaAr: 'قسّم الرسالة إلى 3 لحظات أفقية (قبل/أثناء/بعد) داخل تصميم واحد.',
    device: 'sequence',
    deviceAr: DEVICE_AR.sequence,
    visualAr: 'ثلاثة أعمدة أو ثلاثة أشرطة مع أرقام صغيرة وخط فاصل.',
    copyAngleAr: 'كل لحظة في 2–3 كلمات.',
    riskAr: 'يحتاج نصاً قابلاً للتقسيم؛ لا يصلح لرسالة واحدة.',
    keywords: ['كاروسيل', 'carousel', 'خطوات', 'مراحل', 'كيف'],
  },
  {
    id: 'oversized-crop',
    titleAr: 'قصّ متطرف',
    ideaAr: 'اقصّ العنصر (حرف/صورة/شكل) بحيث يخرج عن الإطار — القصّ يخلق حركة وإحساساً بالحجم.',
    device: 'scale',
    deviceAr: DEVICE_AR.scale,
    visualAr: 'حرف أو شكل مكبّر بنسبة 300% يخرج من الحافة، والنص الصغير يوازنه.',
    copyAngleAr: 'عنوان قصير جداً، والباقي تفاصيل.',
    riskAr: 'القصّ يجب أن يكون مقصوداً لا خطأ في التصدير.',
    keywords: ['جريء', 'شبابي', 'youth', 'رياضة', 'حدث'],
  },
  {
    id: 'collage-cut',
    titleAr: 'كولاج مقصوص',
    ideaAr: 'اجمع قصاصات (صورة، ورق، خط يدوي) بحواف غير منتظمة لتوليد طاقة بشرية.',
    device: 'collage',
    deviceAr: DEVICE_AR.collage,
    visualAr: 'طبقات ورقية بظل واحد ثابت وزوايا غير مصطفة عمداً.',
    copyAngleAr: 'نبرة حكائية شخصية.',
    riskAr: 'سهل أن يصبح فوضوياً؛ حافظ على لوحة لونية صارمة.',
    keywords: ['فني', 'إبداعي', 'مهرجان', 'ثقافي'],
  },
];

function scoreConcept(concept: ConceptRoute, brief: DesignBrief): number {
  const haystack = [
    brief.copy.headline,
    brief.copy.subheadline ?? '',
    brief.visualDirection.style,
    brief.tone ?? '',
    brief.occasion ?? '',
  ]
    .join(' ')
    .toLowerCase();
  let score = 50;
  for (const keyword of concept.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 14;
  }
  if (brief.intent === 'thumbnail' && concept.id === 'one-word-hero') score += 12;
  if (brief.intent === 'quote' && concept.id === 'negative-space-frame') score += 12;
  if (brief.intent === 'event' && concept.id === 'pattern-field') score += 8;
  if (brief.intent === 'infographic' && concept.id === 'number-hero') score += 12;
  if (brief.intent === 'carousel' && concept.id === 'sequence-strip') score += 12;
  if (brief.audience === 'university students' && concept.id === 'human-gaze') score += 8;
  return score;
}

/** Ranked creative routes for a brief — three genuinely different ideas. */
export function generateConcepts(brief: DesignBrief, n = 3): ConceptRoute[] {
  return [...CONCEPTS]
    .map((concept) => ({ concept, score: scoreConcept(concept, brief) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, n))
    .map((entry) => entry.concept);
}

export interface ScamperPrompt {
  letter: string;
  nameAr: string;
  promptAr: string;
}

/** SCAMPER prompts used when the user asks for "another idea". */
export const SCAMPER_PROMPTS: ScamperPrompt[] = [
  { letter: 'S', nameAr: 'استبدل', promptAr: 'استبدل العنصر البطل: صورة بدل نص، أو رقم بدل صورة.' },
  { letter: 'C', nameAr: 'ادمج', promptAr: 'ادمج وظيفتين: العنوان نفسه يصبح زر الدعوة للفعل.' },
  { letter: 'A', nameAr: 'كيّف', promptAr: 'كيّف التكوين لمنصة أخرى ثم أعد تشكيله لهذه.' },
  { letter: 'M', nameAr: 'عدّل', promptAr: 'كبّر عنصراً واحداً إلى حدّه الأقصى قبل أن ينكسر.' },
  { letter: 'P', nameAr: 'استخدم بشكل آخر', promptAr: 'استخدم الشبكة كعنصر مرئي بدل أن تكون مخفية.' },
  { letter: 'E', nameAr: 'احذف', promptAr: 'احذف نصف العناصر واختبر هل الرسالة باقية.' },
  { letter: 'R', nameAr: 'اعكس', promptAr: 'اعكس الاتجاه: ابدأ من نهاية الرسالة إلى بدايتها.' },
];

export function scamperPrompts(): ScamperPrompt[] {
  return [...SCAMPER_PROMPTS];
}

/** Alternative headline angles that make copy do half the design work. */
export function headlineAngles(headline: string): Array<{ angleAr: string; text: string }> {
  const clean = headline.trim();
  return [
    { angleAr: 'وعد مباشر', text: `${clean} — في مكان واحد` },
    { angleAr: 'سؤال يفتح فضولاً', text: `هل جربت ${clean}؟` },
    { angleAr: 'رقم يحدد الحجم', text: `${clean} في 3 خطوات` },
    { angleAr: 'تباين قبل/بعد', text: `قبل ${clean}… وبعده` },
    { angleAr: 'دعوة صريحة', text: `${clean} الآن` },
    { angleAr: 'اختصار جريء', text: clean.split(' ').slice(0, 3).join(' ') },
  ];
}
