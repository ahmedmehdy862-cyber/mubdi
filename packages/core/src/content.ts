import type { DesignBrief } from '@mubdi/schemas';
import { headlineAngles } from '@mubdi/design-knowledge';

/**
 * Q2 — Content Expansion Engine.
 *
 * Never design from a one-line prompt: every brief is expanded into a full
 * Content Pack before any pixel is committed. Facts present in the prompt are
 * extracted; missing facts become *explicit editable placeholders*
 * («التاريخ: [اكتب هنا]») rendered as real layers — the system never invents
 * dates, places or contact details.
 */

export type ToneId = 'excited' | 'formal' | 'emotional' | 'youthful';

export interface ToneSpec {
  id: ToneId;
  nameAr: string;
  /** CTA phrasing per tone (Arabic-native, no calques). */
  ctaAr: string;
  /** Energising prefix folded into the headline when the tone fits it. */
  headlineBoostAr: string | null;
}

export const TONES: Record<ToneId, ToneSpec> = {
  excited: {
    id: 'excited',
    nameAr: 'حماسي',
    ctaAr: 'سجّل الآن — مقاعد محدودة',
    headlineBoostAr: 'الفرصة اللي كلكم مستنيها',
  },
  formal: { id: 'formal', nameAr: 'رسمي', ctaAr: 'للتسجيل والاستعلام', headlineBoostAr: null },
  emotional: {
    id: 'emotional',
    nameAr: 'عاطفي',
    ctaAr: 'شاركنا — فارقك يبدأ من هنا',
    headlineBoostAr: 'من قلب الحي',
  },
  youthful: {
    id: 'youthful',
    nameAr: 'شبابي',
    ctaAr: 'احجز مكانك دلوقتي',
    headlineBoostAr: 'يلا بينا',
  },
};

export type DetailKind = 'date' | 'time' | 'place' | 'benefit' | 'contact' | 'requirement';

export interface ContentField {
  kind: DetailKind;
  /** Field label shown in the inline editor. */
  labelAr: string;
  /** Value rendered on the canvas; placeholders keep the [اكتب هنا] marker. */
  value: string;
  isPlaceholder: boolean;
  source: 'extracted' | 'generated' | 'placeholder';
}

export interface ContentPack {
  /** Exactly 3 options, punchy and Arabic-native; [0] is the default pick. */
  headlines: string[];
  subheadline: string;
  details: ContentField[];
  benefits: string[];
  cta: string;
  hashtags: string[];
  /** Paragraph for the post caption — never printed on the canvas. */
  caption: string;
  tone: ToneSpec;
  /** Every generated string is user-editable; UI shows these inline. */
  editableFields: Array<{ id: string; labelAr: string; value: string; isPlaceholder: boolean }>;
}

/* ------------------------------------------------------------------ */
/* occasion banks — Arabic-native copy, keyed by detected occasion      */
/* ------------------------------------------------------------------ */

interface OccasionCopy {
  key: string;
  subAr: string;
  benefitsAr: string[];
  hashtags: string[];
  placeholderPlace: string;
}

const OCCASIONS: OccasionCopy[] = [
  {
    key: 'volunteer',
    subAr: 'يوم واحد من وقتك يخضر حيّك سنين',
    benefitsAr: ['تدريب مجاني قبل الملتقى', 'شهادة تطوع معتمدة', 'عدد أدوات الزراعة على حسابنا'],
    hashtags: ['#تطوع', '#تشجير', '#مبادرة_الحي'],
    placeholderPlace: 'نقطة اللقاء',
  },
  {
    key: 'awareness',
    subAr: '٥ خطوات بسيطة تحميك وأسرتك',
    benefitsAr: ['معلومات مختصرة وقابلة للتطبيق', 'أسئلتك يجاوب عنها مختصون', 'المحتوى مجاني للكل'],
    hashtags: ['#توعية', '#صحة', '#مجتمع'],
    placeholderPlace: 'المكان',
  },
  {
    key: 'ramadan',
    subAr: 'شهر الخير معنا كل ليلة',
    benefitsAr: ['إفطار جماعي يومياً', 'سحور للأسر المحتاجة', 'فرص تطوع لكل الأعمار'],
    hashtags: ['#رمضان', '#خير', '#إفطار'],
    placeholderPlace: 'المسجد أو المقر',
  },
  {
    key: 'eid',
    subAr: 'أجمل العروض في أجمل أيام',
    benefitsAr: ['خصومات تصل لـ 50%', 'هدية مع كل عملية', 'توصيل مجاني داخل الحي'],
    hashtags: ['#عيد', '#عروض', '#خصومات'],
    placeholderPlace: 'الفرع',
  },
  {
    key: 'education',
    subAr: 'خطوة ثابتة نحو هدفك',
    benefitsAr: ['شرح مبسط خطوة بخطوة', 'تدريب تطبيقي في كل جلسة', 'متابعة مستوى أسبوعية'],
    hashtags: ['#تعليم', '#تطوير', '#مهارات'],
    placeholderPlace: 'القاعة',
  },
  {
    key: 'charity',
    subAr: 'تبرعك الصغير يصنع فرقاً كبيراً',
    benefitsAr: [
      'تبرعك يوصل مباشرة للمستفيدين',
      'تقارير شفافة بعد كل حملة',
      'توقيع تجميع يومي في المقر',
    ],
    hashtags: ['#خير', '#تبرع', '#مساعدة'],
    placeholderPlace: 'المقر',
  },
  {
    key: 'celebrate',
    subAr: 'نتيجة تعب أعمال تراكمت',
    benefitsAr: ['شكراً لكل من ساهم', 'نحتفل معاً بالإنجاز', 'القادم أكبر بإذن الله'],
    hashtags: ['#إنجاز', '#شكر', '#فريق'],
    placeholderPlace: 'المكان',
  },
  {
    key: 'generic',
    subAr: 'تفاصيل أكثر مما تتخيل',
    benefitsAr: ['مشاركة مجانية للجميع', 'فرصة تعرّف على ناس جدد', 'شهادة مشاركة'],
    hashtags: ['#مجتمع', '#فعالية'],
    placeholderPlace: 'المكان',
  },
];

function occasionKey(prompt: string): OccasionCopy {
  if (/(تطوع|متطوع|تشجير)/.test(prompt)) return OCCASIONS[0]!;
  if (/(توعية|حملة توعية|إنفلونزا|وْعي|وعي)/.test(prompt)) return OCCASIONS[1]!;
  if (/(رمضان|إفطار|سحور)/.test(prompt)) return OCCASIONS[2]!;
  if (/(عيد|خصم|عرض|تخفيضات)/.test(prompt)) return OCCASIONS[3]!;
  if (/(دورة|تعليم|برمجة|درس|اختبارات|مذاكرة|كورس)/.test(prompt)) return OCCASIONS[4]!;
  if (/(تبرع|خيرية|أسر محتاجة|كسر)/.test(prompt)) return OCCASIONS[5]!;
  if (/(شكر|فريقنا|فوز|إنجاز|تخرج)/.test(prompt)) return OCCASIONS[6]!;
  return OCCASIONS[7]!;
}

export function occasionKeyOf(prompt: string): string {
  return occasionKey(prompt).key;
}

/* ------------------------------------------------------------------ */
/* fact extraction — never invent                                      */
/* ------------------------------------------------------------------ */

const PLACE_PATTERNS = [/في\s*مقر\s*([^،,\n]+)/, /مقر\s*([^،,\n]+)/, /بمقع[رده]?\s*([^،,\n]+)/];

function extractPlace(prompt: string): string | undefined {
  for (const re of PLACE_PATTERNS) {
    const m = prompt.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

function extractContact(prompt: string): string | undefined {
  const phone = prompt.match(/0\d{8,10}/);
  if (phone) return phone[0];
  return undefined;
}

/* day / time / tone helpers ---------------------------------------- */

const AR_DAYS = ['الجمعة', 'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

function extractDay(prompt: string): string | undefined {
  for (const d of AR_DAYS) if (prompt.includes(d)) return d;
  return undefined;
}

function extractTime(prompt: string): string | undefined {
  const m = prompt.match(/الساعة\s*([0-9٠-٩]+)\s*(مساءً|صباحاً|الصبح|الليل)?/);
  if (m) return m[0].trim();
  const m2 = prompt.match(/([0-9٠-٩]+)\s*(مساءً|صباحاً|الصبح|الليل)/);
  if (m2) return m2[0].trim();
  return undefined;
}

function placeholder(kind: DetailKind, label: string, extra = ''): ContentField {
  return {
    kind,
    labelAr: label,
    // The row builder prefixes «${label}: «; the value is only the marker so
    // the canvas shows «الوقت: [اكتب هنا]» without doubled labels.
    value: `[اكتب هنا${extra ? `: ${extra}` : ''}]`,
    isPlaceholder: true,
    source: 'placeholder',
  };
}

/* ------------------------------------------------------------------ */
/* headline crafting — 3 options, Arabic-native                        */
/* ------------------------------------------------------------------ */

function craftHeadlines(hl: string, brief: DesignBrief, occ: OccasionCopy): string[] {
  const base = hl.replace(/\s+/g, ' ').trim();
  const options = new Set<string>();
  // 1. the brief's own words — shown first, never rewritten into a slogan
  options.add(base);
  // 2. the strongest angle from the creativity module
  const angle = headlineAngles(base)[0]?.text;
  if (angle) options.add(angle);
  // 3. occasion-flavoured punchline
  options.add(`${base} — ${occ.benefitsAr[0]}`);
  return [...options].slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* the expansion                                                       */
/* ------------------------------------------------------------------ */

export interface ExpandOptions {
  tone?: ToneId;
  brandName?: string;
  /** Raw prompt (kept alongside the parsed brief for extraction). */
  prompt: string;
}

export function expandContent(brief: DesignBrief, options: ExpandOptions): ContentPack {
  const occ = occasionKey(options.prompt);
  const tone = TONES[options.tone ?? (brief.tone === 'youthful' ? 'youthful' : 'excited')]!;
  const prompt = options.prompt;

  /* facts: extracted, or honest placeholders */
  const day = extractDay(prompt);
  const time = extractTime(prompt);
  const place = extractPlace(prompt);
  const contact = extractContact(prompt);
  const details: ContentField[] = [];
  if (day && time)
    details.push({
      kind: 'date',
      labelAr: 'التاريخ',
      value: `${day} — ${time}`,
      isPlaceholder: false,
      source: 'extracted',
    });
  else if (day)
    details.push({
      kind: 'date',
      labelAr: 'التاريخ',
      value: `يوم ${day} — [الوقت]`,
      isPlaceholder: true,
      source: 'generated',
    });
  else if (time)
    details.push({
      kind: 'time',
      labelAr: 'الوقت',
      value: time,
      isPlaceholder: false,
      source: 'extracted',
    });
  else details.push(placeholder('date', 'التاريخ'));

  details.push(
    place
      ? {
          kind: 'place',
          labelAr: 'المكان',
          value: place,
          isPlaceholder: false,
          source: 'extracted',
        }
      : placeholder('place', 'المكان', occ.placeholderPlace),
  );

  details.push(
    contact
      ? {
          kind: 'contact',
          labelAr: 'للتواصل',
          value: contact,
          isPlaceholder: false,
          source: 'extracted',
        }
      : placeholder('contact', 'للتواصل', 'رقم/واتساب'),
  );

  /* benefits: first goes in the canvas as the supporting line */
  const benefits = [...occ.benefitsAr];
  details.push({
    kind: 'benefit',
    labelAr: 'الميزة',
    value: benefits[0]!,
    isPlaceholder: false,
    source: 'generated',
  });

  /* headlines */
  const headlines = craftHeadlines(brief.copy.headline, brief, occ);
  const headline = headlines[0]!;

  /* hashtags: occasion + one benefit-led */
  const hashtags = [...occ.hashtags, '#سجل_الآن'].slice(0, 3);

  const cta = tone.ctaAr;

  const caption = [
    headline,
    '',
    `${occ.subAr}.`,
    ...benefits.map((b) => `• ${b}`),
    '',
    details.map((d) => `${d.labelAr}: ${d.value}`).join(' • '),
    '',
    `${cta} 🌱`,
    hashtags.join(' '),
  ].join('\n');

  const pack: ContentPack = {
    headlines,
    subheadline: occ.subAr,
    details,
    benefits,
    cta,
    hashtags,
    caption,
    tone,
    editableFields: [
      { id: 'headline', labelAr: 'العنوان', value: headline, isPlaceholder: false },
      { id: 'subheadline', labelAr: 'السطر الداعم', value: occ.subAr, isPlaceholder: false },
      ...details.map((d) => ({
        id: `detail-${d.kind}`,
        labelAr: d.labelAr,
        value: d.value,
        isPlaceholder: d.isPlaceholder,
      })),
      { id: 'cta', labelAr: 'الدعوة', value: cta, isPlaceholder: false },
    ],
  };
  return pack;
}

/* ------------------------------------------------------------------ */
/* pack -> brief (the canvas renderer consumes the brief)              */
/* ------------------------------------------------------------------ */

/** Compose a copy payload from the pack: 2+ supporting details guaranteed. */
export function applyPackToBrief(brief: DesignBrief, pack: ContentPack): DesignBrief {
  const dateField = pack.details.find((d) => d.kind === 'date' || d.kind === 'time');
  const placeField = pack.details.find((d) => d.kind === 'place');
  const lines = [
    dateField ? `${dateField.labelAr}: ${dateField.value}` : undefined,
    placeField ? `${placeField.labelAr}: ${placeField.value}` : undefined,
    pack.benefits[0],
  ].filter((v): v is string => Boolean(v));

  const contact = pack.details.find((d) => d.kind === 'contact');
  const footerBits = pack.hashtags.slice(0, 2);

  return {
    ...brief,
    copy: {
      ...brief.copy,
      headline: pack.headlines[0]!,
      subheadline: pack.subheadline,
      body: lines.join('\n'),
      cta: pack.cta,
      hashtags: pack.hashtags,
      footer: contact ? `${contact.value}  ${footerBits.join(' ')}` : footerBits.join('  '),
      // Generated only when the pack actually replaced the brief's own words
      // with a crafted variant — extraction-extracted copy stays honest.
      generated: brief.copy.generated || pack.headlines[0] !== brief.copy.headline,
    },
  };
}

/** Full pipeline entry: parse -> expand -> enriched brief. */
export function expandBrief(
  parsed: DesignBrief,
  options: ExpandOptions,
): { brief: DesignBrief; pack: ContentPack } {
  const pack = expandContent(parsed, options);
  return { brief: applyPackToBrief(parsed, pack), pack };
}
