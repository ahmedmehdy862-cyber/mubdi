import type { PrincipleCategory } from './principles.js';
import { PRINCIPLES, knowledgeContext, KNOWLEDGE_VERSION } from './principles.js';
import { ARABIC_TYPE_RULES, TYPE_SCALES, FONT_PAIRINGS } from './typography.js';
import { SPACING_SCALE } from './grid.js';
import { ART_DIRECTIONS } from './direction.js';
import { listArchetypes } from './composition.js';
import { COLOR_PSYCHOLOGY } from './color.js';
import { SCAMPER_PROMPTS } from './creativity.js';

/**
 * One import surface for anything that needs to *teach* or *audit* the design
 * engine: the API can expose it, the desktop app can show it, and an LLM
 * prompt can embed it. Keeping the thresholds here means the rubric, the
 * generator and the documentation can never drift apart.
 */

export interface SkillArea {
  id: PrincipleCategory | 'direction' | 'platform';
  nameAr: string;
  nameEn: string;
  whyAr: string;
  principles: string[];
}

export const SKILL_AREAS: SkillArea[] = [
  {
    id: 'hierarchy',
    nameAr: 'التسلسل والتباين',
    nameEn: 'Hierarchy & Contrast',
    whyAr: 'بدون تسلسل لا يعرف القارئ أين يبدأ، وبدون تباين لا يرى.',
    principles: ['hierarchy', 'contrast', 'focal-point'],
  },
  {
    id: 'layout',
    nameAr: 'التخطيط والشبكة',
    nameEn: 'Layout & Grid',
    whyAr: 'الشبكة هي ما يجعل التصميم يبدو محترفاً حتى قبل أن تُقرأ الكلمات.',
    principles: ['alignment', 'proximity', 'white-space', 'grid-8pt', 'rule-of-thirds', 'z-pattern'],
  },
  {
    id: 'color',
    nameAr: 'نظرية اللون',
    nameEn: 'Colour Theory',
    whyAr: 'اللوحة الصحيحة تحمل نصف الرسالة، واللوحة الخاطئة تهدم أفضل نص.',
    principles: ['color-harmony', 'color-psychology', 'accent-scarcity'],
  },
  {
    id: 'typography',
    nameAr: 'الطباعة',
    nameEn: 'Typography',
    whyAr: 'الخط هو صوت التصميم؛ المقياس والمسافة يصنعان الإيقاع.',
    principles: ['type-scale', 'measure', 'repetition'],
  },
  {
    id: 'arabic',
    nameAr: 'العربية و RTL',
    nameEn: 'Arabic & RTL',
    whyAr: 'العربية ليست ترجمة للاتينية؛ لها قواعد اتصال وتشكيل واتجاه مختلفة.',
    principles: ['arabic-flow'],
  },
  {
    id: 'composition',
    nameAr: 'التكوين والتوازن',
    nameEn: 'Composition & Balance',
    whyAr: 'العين تشعر بالثقل قبل أن تفهمه؛ التوازن هو ما يجعل التصميم «يستقر».',
    principles: ['balance', 'rule-of-thirds', 'imagery', 'depth'],
  },
  {
    id: 'gestalt',
    nameAr: 'مبادئ الجشطالت',
    nameEn: 'Gestalt',
    whyAr: 'العقل يجمع العناصر تلقائياً؛ استخدم ذلك بدل محاربته.',
    principles: ['gestalt-proximity', 'proximity'],
  },
  {
    id: 'creativity',
    nameAr: 'الإبداع والفكرة',
    nameEn: 'Creativity & Concept',
    whyAr: 'الزخرفة ليست فكرة؛ التصميم القوي يحمل جملة واحدة تُروى بصرياً.',
    principles: ['creative-concept', 'scamper', 'minimalism', 'storytelling'],
  },
  {
    id: 'brand',
    nameAr: 'العلامة والاتساق',
    nameEn: 'Brand & Consistency',
    whyAr: 'العلامة تُبنى بالتكرار: نفس الشعار واللوحة والمساحات في كل منشور.',
    principles: ['repetition', 'brand-consistency'],
  },
  {
    id: 'production',
    nameAr: 'الإنتاج والمنصات',
    nameEn: 'Production & Platforms',
    whyAr: 'التصميم لا يُقاس على الشاشة الكبيرة فقط؛ المنصة تقتطع وتضغط.',
    principles: ['thumb-stopping', 'safe-zones', 'production-hygiene'],
  },
];

export interface Thresholds {
  bodyContrast: number;
  largeContrast: number;
  hierarchyMinRatio: number;
  hierarchyMaxLevels: number;
  minSpacingUnit: number;
  maxColors: number;
  maxFontFamilies: number;
  maxTextDensity: number;
  maxBalanceOffset: number;
  minTouchTarget: number;
  marginsRatio: number;
}

/** The numeric contract shared by generation, critique and auto-fix. */
export const THRESHOLDS: Thresholds = {
  bodyContrast: 4.5,
  largeContrast: 3,
  hierarchyMinRatio: 2,
  hierarchyMaxLevels: 4,
  minSpacingUnit: 8,
  maxColors: 5,
  maxFontFamilies: 2,
  maxTextDensity: 0.4,
  maxBalanceOffset: 0.18,
  minTouchTarget: 48,
  marginsRatio: 0.06,
};

export interface LearningStage {
  id: string;
  nameAr: string;
  nameEn: string;
  goalsAr: string[];
  checksAr: string[];
}

/** The order in which the engine applies skill — mirrors how a junior grows. */
export const LEARNING_PATH: LearningStage[] = [
  {
    id: 'foundations',
    nameAr: 'الأساسيات',
    nameEn: 'Foundations',
    goalsAr: ['تباين مقروء', 'محاذاة واحدة', 'هامش آمن', 'شبكة 8'],
    checksAr: ['contrast >= 4.5', 'alignmentEdges <= 3', 'safeZoneViolations == 0'],
  },
  {
    id: 'structure',
    nameAr: 'البنية',
    nameEn: 'Structure',
    goalsAr: ['تسلسل طباعي 3–4 مستويات', 'بؤرة واحدة', 'تقارب منطقي', 'فراغ 25–40%'],
    checksAr: ['hierarchyRatio >= 2', 'hierarchyLevels <= 4', 'density <= 0.4'],
  },
  {
    id: 'expression',
    nameAr: 'التعبير',
    nameEn: 'Expression',
    goalsAr: ['لوحة لونية متناغمة', 'اتجاه فني واضح', 'صورة تخدم النص', 'لكنة نادرة'],
    checksAr: ['colorCount <= 5', 'classifyPalette.confidence >= 0.6', 'accentShare <= 0.2'],
  },
  {
    id: 'craft',
    nameAr: 'الإتقان',
    nameEn: 'Craft',
    goalsAr: ['عربية سليمة', 'مقياس طباعي متسق', 'نظافة طبقات PSD', 'توازن'],
    checksAr: ['tracking == 0', 'fonts <= 2', 'balanceOffset <= 0.18'],
  },
  {
    id: 'originality',
    nameAr: 'الإبداع',
    nameEn: 'Originality',
    goalsAr: ['فكرة في جملة', 'استعارة واحدة', 'ثلاثة مسارات مختلفة', 'قرار واحد جسور'],
    checksAr: ['conceptRoute != null', 'variants distinct', 'one focal point'],
  },
];

export interface KnowledgeSnapshot {
  version: string;
  principleCount: number;
  categories: Array<{ id: PrincipleCategory; count: number; namesAr: string[] }>;
  skills: SkillArea[];
  thresholds: Thresholds;
  typeScales: typeof TYPE_SCALES;
  spacing: readonly number[];
  arabicRules: typeof ARABIC_TYPE_RULES;
  fontPairings: typeof FONT_PAIRINGS;
  directions: Array<{ id: string; nameAr: string; harmony: string; mood: string[] }>;
  archetypes: Array<{ id: string; nameAr: string }>;
  colorPsychology: typeof COLOR_PSYCHOLOGY;
  scamper: typeof SCAMPER_PROMPTS;
  learningPath: LearningStage[];
  systemPrompt: string;
}

export function knowledgeSnapshot(): KnowledgeSnapshot {
  const categories = [...new Set(PRINCIPLES.map((p) => p.category))].map((category) => ({
    id: category,
    count: PRINCIPLES.filter((p) => p.category === category).length,
    namesAr: PRINCIPLES.filter((p) => p.category === category).map((p) => p.nameAr),
  }));
  return {
    version: KNOWLEDGE_VERSION,
    principleCount: PRINCIPLES.length,
    categories,
    skills: SKILL_AREAS,
    thresholds: THRESHOLDS,
    typeScales: TYPE_SCALES,
    spacing: SPACING_SCALE,
    arabicRules: ARABIC_TYPE_RULES,
    fontPairings: FONT_PAIRINGS,
    directions: ART_DIRECTIONS.map((d) => ({ id: d.id, nameAr: d.nameAr, harmony: d.harmony, mood: d.mood })),
    archetypes: listArchetypes(),
    colorPsychology: COLOR_PSYCHOLOGY,
    scamper: SCAMPER_PROMPTS,
    learningPath: LEARNING_PATH,
    systemPrompt: SYSTEM_PROMPT,
  };
}

/**
 * System prompt for any LLM that writes copy or critiques a design. It is the
 * same curriculum the deterministic engine enforces, so model output and
 * engine output cannot contradict each other.
 */
export const SYSTEM_PROMPT = [
  'أنت مدير فني عربي محترف متخصص في تصاميم السوشيال ميديا.',
  'مهمتك: تحويل الطلب إلى تصميم واحد واضح الفكرة، قابل للتنفيذ، ومحترم للعربية.',
  '',
  'التزم حرفياً بالقواعد القابلة للقياس:',
  '- تباين النص الأساسي مع خلفيته 4.5:1 على الأقل، والنص الكبير 3:1.',
  '- 3–4 مستويات طباعية فقط، والفرق بين العنوان وأصغر نص 2.5–4×.',
  '- مقياس مسافات 8/16/24/32/48/64 فقط.',
  '- 3–5 ألوان كحد أقصى، واللون المميز ≤ 10% من المساحة.',
  '- نص عربي: بلا تباعد أحرف، محاذاة يمين، ارتفاع سطر 1.5–1.8، ولا أحرف كبيرة.',
  '- بؤرة واحدة؛ إذا كان كل شيء بارزاً فلا شيء بارز.',
  '- فراغ 25–40%، والنص لا يلامس الحواف ولا مساحات المنصة.',
  '- عنوان من 3–7 كلمات، ودعوة فعل واحدة صريحة.',
  '',
  'قبل الإجابة، اكتب في سطر واحد: الفكرة (جملة واحدة) + الاتجاه الفني + سبب اختيار اللوحة.',
  'بعد الإجابة، اذكر أكبر خطر في التصميم وكيف عالجته.',
  '',
  knowledgeContext(),
].join('\n');

/** Compact Arabic summary for UI help panels. */
export function curriculumAr(): string {
  const areas = SKILL_AREAS.map((s) => `• ${s.nameAr}: ${s.whyAr}`).join('\n');
  return ['المنهج الذي يطبّقه مبدع على كل تصميم:', areas, '', `عدد المبادئ: ${PRINCIPLES.length} — الإصدار ${KNOWLEDGE_VERSION}`].join('\n');
}
