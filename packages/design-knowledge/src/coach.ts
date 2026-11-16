import type { DesignBrief } from '@mubdi/schemas';
import type { Evaluation, Severity } from './rubric.js';
import { principle } from './principles.js';
import type { ArtDirection } from './direction.js';
import type { LayoutPlan } from './composition.js';
import type { Palette } from './color.js';
import { paletteAdvice } from './color.js';
import type { TypeScale } from './typography.js';

/**
 * The coach turns a rubric evaluation into a conversation a human designer
 * would actually have: what works, what to fix first, why it matters, and
 * what to learn from it. Every piece of advice cites a principle from the
 * curriculum instead of saying "make it pop".
 */

const SEVERITY_AR: Record<Severity, string> = {
  critical: 'حرجة',
  major: 'رئيسية',
  minor: 'ثانوية',
  info: 'ملاحظة',
};

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, major: 1, minor: 2, info: 3 };

export interface CoachPriority {
  rank: number;
  severity: Severity;
  severityAr: string;
  titleAr: string;
  detailAr: string;
  fixAr: string;
  principleAr: string;
  principleEn: string;
  whyAr: string;
}

export interface CoachMetric {
  labelAr: string;
  valueAr: string;
  thresholdAr: string;
  good: boolean;
}

export interface CoachReport {
  score: number;
  gradeAr: string;
  summaryAr: string;
  strengthsAr: string[];
  priorities: CoachPriority[];
  learningAr: string[];
  nextStepsAr: string[];
  metricsAr: CoachMetric[];
  text: string;
}

export interface CoachOptions {
  /** Maximum number of prioritized fixes to report. */
  limit?: number;
  /** Include the learning notes for each cited principle. */
  teach?: boolean;
}

const percent = (n: number): string => `${Math.round(n * 100)}%`;

function metricsOf(evaluation: Evaluation): CoachMetric[] {
  const m = evaluation.metrics;
  return [
    {
      labelAr: 'أدنى تباين',
      valueAr: `${m.minContrast}:1`,
      thresholdAr: 'كبير ≥ 3:1 · صغير ≥ 4.5:1',
      good: m.contrastOk,
    },
    {
      labelAr: 'تباين التسلسل الطباعي',
      valueAr: `${m.hierarchyRatio}×`,
      thresholdAr: '≥ 2×',
      good: m.hierarchyRatio >= 2 && m.hierarchyRatio <= 4.5,
    },
    {
      labelAr: 'مستويات الخط',
      valueAr: `${m.hierarchyLevels}`,
      thresholdAr: '2–4',
      good: m.hierarchyLevels >= 2 && m.hierarchyLevels <= 4,
    },
    {
      labelAr: 'المسافات على الشبكة',
      valueAr: percent(m.spacingOnGrid),
      thresholdAr: '≥ 80%',
      good: m.spacingOnGrid >= 0.8,
    },
    {
      labelAr: 'حواف المحاذاة',
      valueAr: `${m.alignmentEdges}`,
      thresholdAr: '≤ 3',
      good: m.alignmentEdges <= 3,
    },
    {
      labelAr: 'انحراف مركز الثقل',
      valueAr: percent(m.balanceOffset),
      thresholdAr: '≤ 18%',
      good: m.balanceOffset <= 0.18,
    },
    {
      labelAr: 'كثافة النص',
      valueAr: percent(m.density),
      thresholdAr: '≤ 40%',
      good: m.density <= 0.4,
    },
    {
      labelAr: 'عدد الألوان',
      valueAr: `${m.colorCount}`,
      thresholdAr: '3–5',
      good: m.colorCount > 0 && m.colorCount <= 5,
    },
    {
      labelAr: 'عدد العائلات الخطية',
      valueAr: `${m.fontCount}`,
      thresholdAr: '≤ 2',
      good: m.fontCount <= 2,
    },
    {
      labelAr: 'اختراقات مساحة الأمان',
      valueAr: `${m.safeZoneViolations}`,
      thresholdAr: '0',
      good: m.safeZoneViolations === 0,
    },
  ];
}

function nextSteps(evaluation: Evaluation, brief: DesignBrief): string[] {
  const steps: string[] = [];
  const bySeverity = [...evaluation.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const first = bySeverity[0];
  if (first) steps.push(first.fixAr);
  const second = bySeverity[1];
  if (second) steps.push(second.fixAr);
  if (evaluation.metrics.density > 0.4) {
    steps.push('اختصر النص: عنوان ≤ 7 كلمات، ونص مساند ≤ سطرين.');
  }
  if (evaluation.metrics.hierarchyLevels <= 2) {
    steps.push('إذا توفرت تفاصيل (موعد/مكان/فائدة) أضف سطراً مسانداً — التصميم الحالي بعنوان واحد.');
  }
  if (evaluation.score >= 90) {
    steps.push('التصميم جاهز للنشر — صدّر PSD وراجع الطبقات قبل التسليم.');
  } else if (evaluation.score >= 75) {
    steps.push('طبّق أعلى ثلاث ملاحظات ثم أعد التقييم قبل التصدير.');
  } else {
    steps.push('ابدأ بتصحيح التباين والتسلسل الطباعي؛ هما أكبر عاملين في النتيجة.');
  }
  if (brief.language !== 'en') {
    steps.push('راجع العربية: محاذاة يمين، بلا تباعد أحرف، وتشكيل واضح.');
  }
  return [...new Set(steps)].slice(0, 4);
}

export function coach(evaluation: Evaluation, brief: DesignBrief, options: CoachOptions = {}): CoachReport {
  const limit = options.limit ?? 5;
  const teach = options.teach ?? true;

  const priorities: CoachPriority[] = [...evaluation.findings]
    .sort((a, b) => {
      const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (severity !== 0) return severity;
      return (b.measured ?? 0) - (a.measured ?? 0);
    })
    .slice(0, limit)
    .map((finding, index) => {
      const p = principle(finding.principleId);
      return {
        rank: index + 1,
        severity: finding.severity,
        severityAr: SEVERITY_AR[finding.severity],
        titleAr: p.nameAr,
        detailAr: finding.messageAr,
        fixAr: finding.fixAr,
        principleAr: p.nameAr,
        principleEn: p.nameEn,
        whyAr: p.summaryAr,
      };
    });

  const learningAr = teach
    ? [...new Set(priorities.map((p) => p.principleAr))].map((name) => {
        const p = principle(evaluation.findings.find((f) => principle(f.principleId).nameAr === name)?.principleId ?? '');
        return `${p.nameAr}: ${p.summaryAr} القاعدة: ${p.rules[0] ?? ''}`;
      })
    : [];

  const text = formatCoachReport({
    score: evaluation.score,
    gradeAr: evaluation.gradeAr,
    summaryAr: evaluation.summaryAr,
    strengthsAr: evaluation.strengthsAr,
    priorities,
    learningAr,
    nextStepsAr: nextSteps(evaluation, brief),
    metricsAr: metricsOf(evaluation),
    text: '',
  });

  return {
    score: evaluation.score,
    gradeAr: evaluation.gradeAr,
    summaryAr: evaluation.summaryAr,
    strengthsAr: evaluation.strengthsAr,
    priorities,
    learningAr,
    nextStepsAr: nextSteps(evaluation, brief),
    metricsAr: metricsOf(evaluation),
    text,
  };
}

export function formatCoachReport(report: CoachReport): string {
  const lines: string[] = [];
  lines.push(`# تقرير المدير الفني — ${report.score}/100 (${report.gradeAr})`);
  lines.push('');
  lines.push(report.summaryAr);
  if (report.strengthsAr.length) {
    lines.push('');
    lines.push('## ما يعمل جيداً');
    for (const s of report.strengthsAr) lines.push(`- ${s}`);
  }
  if (report.priorities.length) {
    lines.push('');
    lines.push('## أولويات التصحيح');
    for (const p of report.priorities) {
      lines.push(`${p.rank}. [${p.severityAr}] ${p.titleAr}: ${p.detailAr}`);
      lines.push(`   الإصلاح: ${p.fixAr}`);
      lines.push(`   لماذا: ${p.whyAr}`);
    }
  }
  if (report.learningAr.length) {
    lines.push('');
    lines.push('## مبادئ مستفادة');
    for (const l of report.learningAr) lines.push(`- ${l}`);
  }
  lines.push('');
  lines.push('## القياسات');
  for (const m of report.metricsAr) {
    lines.push(`- ${m.labelAr}: ${m.valueAr} (المطلوب ${m.thresholdAr}) ${m.good ? '✓' : '✗'}`);
  }
  if (report.nextStepsAr.length) {
    lines.push('');
    lines.push('## الخطوة التالية');
    for (const s of report.nextStepsAr) lines.push(`- ${s}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// "Why this design" — the rationale shown next to every generated variant.
// ---------------------------------------------------------------------------

export interface DesignExplanation {
  directionAr: string;
  conceptAr: string;
  paletteAr: string;
  typographyAr: string;
  layoutAr: string;
  focalAr: string;
  text: string;
}

export interface ExplainInput {
  direction: ArtDirection;
  plan: LayoutPlan;
  palette: Palette;
  type: TypeScale;
  variant: number;
}

export function explainDesign(input: ExplainInput): DesignExplanation {
  const { direction, plan, palette, type } = input;
  const directionAr = `الاتجاه الفني: ${direction.nameAr} — ${direction.summaryAr}`;
  const conceptAr = `الفكرة: ${plan.rationaleAr} (${plan.nameAr})`;
  const paletteAr = paletteAdvice(palette.primary, palette.scheme);
  const typographyAr = `الطباعة: ${type.name} بنسبة ${type.ratio}×، عنوان ${type.h1}px ونص ${type.body}px مع ارتفاع سطر ${type.leading.body}.`;
  const layoutAr = `التكوين: ${plan.nameAr}، مسار القراءة ${plan.readingFlow === 'center' ? 'مركزي' : plan.readingFlow === 'rtl-z' ? 'Z معكوس (يمين→يسار)' : 'عمودي من اليمين'}، ${plan.blocks.length} كتلة نصية و${plan.shapes.length} عنصراً مسانداً.`;
  const focalAr = `البؤرة عند (${Math.round(plan.focal.x)}، ${Math.round(plan.focal.y)}) — عنصر واحد يقود العين والباقي يدعمه.`;
  return {
    directionAr,
    conceptAr,
    paletteAr,
    typographyAr,
    layoutAr,
    focalAr,
    text: [directionAr, conceptAr, paletteAr, typographyAr, layoutAr, focalAr].join('\n'),
  };
}
