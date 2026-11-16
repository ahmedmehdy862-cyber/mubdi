/**
 * Golden Set — 20 prompts covering the Section-1 occasions, with the baseline
 * runner for the quality-recovery sprint (Q0).
 *
 *   esbuild scripts/golden-set.ts --bundle --platform=node --format=esm \
 *     --external:@napi-rs/canvas --external:ag-psd \
 *     --outfile=packages/psd-engine/dist/golden-baseline.mjs
 *   node packages/psd-engine/dist/golden-baseline.mjs
 *
 * Writes out/golden-baseline/: PNG per variant, scorecard.json + scorecard.md
 * with OLD critic score vs NEW calibrated quality score, and a contact sheet.
 */
import * as core from '../packages/core/src/index';
import {
  evaluateVariantSetQuality,
  variantSimilarity,
} from '../packages/design-knowledge/src/index';
import { renderSpecToPng } from '../packages/renderer/src/index';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GoldenPrompt {
  id: string;
  prompt: string;
  expected: string;
  presetId: string;
}

export const GOLDEN_SET: GoldenPrompt[] = [
  {
    id: 'g01',
    prompt: 'ملتقى تطوعي لتنظيم حملة تشجير في الحي',
    expected: 'event',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g02',
    prompt: 'دورة مجانية لتعليم البرمجة للأطفال يوم السبت الساعة 10 الصبح',
    expected: 'course',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g03',
    prompt: 'حملة تبرع بالدم — بنك الدم محتاجاك النهاردة',
    expected: 'awareness-urgent',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g04',
    prompt: 'رمضان كريم — مواعيد الإفطار والسحور عندنا كل يوم',
    expected: 'ramadan',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g05',
    prompt: 'عيدكم مبارك — عروض العيد بتنتهي الجمعة',
    expected: 'eid-offer',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g06',
    prompt: 'باقي 3 أيام على بداية الاختبارات — جاهز؟',
    expected: 'countdown',
    presetId: 'ig_story',
  },
  {
    id: 'g07',
    prompt: 'حملة توعية: احمِ نفسك من الإنفلونزا بـ 5 خطوات بسيطة',
    expected: 'awareness-steps',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g08',
    prompt: 'إعلان: فتح باب التسجيل في مركز الشباب من يوم الأحد',
    expected: 'announcement',
    presetId: 'ig_post_4x5',
  },
  { id: 'g09', prompt: 'اقتباس: النجاح رحلة مش محطة', expected: 'quote', presetId: 'ig_post_1x1' },
  {
    id: 'g10',
    prompt: 'إحصائية: 78% من المتطوعين طوّروا مهاراتهم التواصلية خلال سنة',
    expected: 'stats',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g11',
    prompt: 'شهادة متطوع: أجمل سنة في حياتي كانت مع فريق التشجير',
    expected: 'testimonial',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g12',
    prompt: 'شكراً لـ 500 متطوع ساهموا في نجاح حملة التشجير',
    expected: 'thanks',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g13',
    prompt: 'نحتاج 20 متطوع لتنظيم حفلة الأيتام يوم الخميس — سجل الآن',
    expected: 'recruit',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g14',
    prompt: 'تذكير: اللقاء الأسبوعي بكرة الساعة 6 مساءً في مقر الجمعية',
    expected: 'reminder',
    presetId: 'ig_story',
  },
  {
    id: 'g15',
    prompt: 'غلاف كاروسيل: 5 نصائح لتنظيم وقتك في الاختبارات',
    expected: 'carousel-cover',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g16',
    prompt: 'سلايد داخلي: نصيحة رقم 2 — اعمل جدول يومي والتزم بيه',
    expected: 'carousel-slide',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g17',
    prompt: 'انضم لفريق المتطوعين الآن — السوايب متاحة كل يوم جمعة',
    expected: 'story-recruit',
    presetId: 'ig_story',
  },
  {
    id: 'g18',
    prompt: 'عيد الأم — كل سنة وأنتِ أجمل حاجة في حياتنا',
    expected: 'occasion',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g19',
    prompt: 'حملة خيرية: كسر رمضان لـ 100 أسرة محتاجة — تبرعك يصنع فرق',
    expected: 'charity',
    presetId: 'ig_post_4x5',
  },
  {
    id: 'g20',
    prompt: 'فريقنا كسب المركز الأول في مسابقة الاختراع الطلابية',
    expected: 'win',
    presetId: 'ig_post_4x5',
  },
];

const OUT = 'out/golden-baseline';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

interface Row {
  id: string;
  expected: string;
  presetId: string;
  oldScores: number[];
  newScores: number[];
  grades: string[];
  flags: string[];
  maxSimilarity: number;
  files: string[];
  topWeaknessAr: string;
}

const rows: Row[] = [];
const briefs: { id: string; brief: unknown }[] = [];

for (const g of GOLDEN_SET) {
  const brief = core.parseBrief(g.prompt);
  const variants = core.generateVariantSet(brief, g.presetId, { name: 'مبدع' });
  const specs = variants.map((v) => v.spec);
  const quality = evaluateVariantSetQuality(specs);
  const oldEvals = specs.map((s) => core.critiqueSpec(s, brief));
  const files: string[] = [];
  const flags: string[] = [];

  specs.forEach((spec, i) => {
    const png = renderSpecToPng(spec);
    const file = `${g.id}-v${i + 1}-${variants[i]!.directionId}.png`;
    fs.writeFileSync(path.join(OUT, file), png);
    files.push(file);
    const m = quality[i]!.metrics;
    const flag: string[] = [];
    if (m.elementCount < 8) flag.push(`elements=${m.elementCount}`);
    if (m.depthLevels < 4) flag.push(`depth=${m.depthLevels}`);
    if (m.deadZone > 0.2) flag.push(`deadZone=${(m.deadZone * 100).toFixed(0)}%`);
    if (m.artifacts > 0) flag.push(`artifacts=${m.artifacts}`);
    if (!Object.values(m.contentChecks).every(Boolean)) {
      flag.push(
        `content=${Object.entries(m.contentChecks)
          .filter(([, ok]) => !ok)
          .map(([k]) => k)
          .join('+')}`,
      );
    }
    if (flag.length) flags.push(`v${i + 1}: ${flag.join(', ')}`);
  });

  let maxSim = 0;
  for (let a = 0; a < specs.length; a++) {
    for (let b = a + 1; b < specs.length; b++) {
      maxSim = Math.max(maxSim, variantSimilarity(specs[a]!, specs[b]!));
    }
  }
  if (maxSim > 0.7) flags.push(`similarity=${(maxSim * 100).toFixed(0)}%`);

  rows.push({
    id: g.id,
    expected: g.expected,
    presetId: g.presetId,
    oldScores: oldEvals.map((e) => e.score),
    newScores: quality.map((q) => q.score),
    grades: quality.map((q) => q.gradeAr),
    flags,
    maxSimilarity: Number(maxSim.toFixed(2)),
    files,
    topWeaknessAr: quality[0]!.topWeaknessesAr[0] ?? '',
  });
  briefs.push({ id: g.id, brief });
  console.log(
    `${g.id} old=[${oldEvals.map((e) => e.score)}] new=[${quality.map((q) => q.score)}] sim=${maxSim.toFixed(2)}`,
  );
}

/* ---- aggregate ---- */
const oldAll = rows.flatMap((r) => r.oldScores);
const newAll = rows.flatMap((r) => r.newScores);
const passingNew = newAll.filter((s) => s >= 80).length;
const promptPassing = rows.filter((r) => Math.min(...r.newScores) >= 80).length;
const summary = {
  generatedAt: new Date().toISOString(),
  prompts: rows.length,
  variants: newAll.length,
  oldCritic: {
    min: Math.min(...oldAll),
    max: Math.max(...oldAll),
    mean: Number((oldAll.reduce((a, b) => a + b, 0) / oldAll.length).toFixed(1)),
  },
  newCritic: {
    min: Math.min(...newAll),
    max: Math.max(...newAll),
    mean: Number((newAll.reduce((a, b) => a + b, 0) / newAll.length).toFixed(1)),
    passing: passingNew,
  },
  promptPassing: { count: promptPassing, of: rows.length },
  rows,
};
fs.writeFileSync(path.join(OUT, 'scorecard.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT, 'briefs.json'), JSON.stringify(briefs, null, 2));

/* ---- markdown scorecard ---- */
const lines: string[] = [];
lines.push('# خط الأساس — مجموعة الذهب (Q0)');
lines.push('');
lines.push(`تاريخ التشغيل: ${summary.generatedAt}`);
lines.push('');
lines.push('| التوجيه | النوع | نتيجة المقيّم القديم | نتيجة المقيّم المعاير | أعلى تشابه | أعلام |');
lines.push('|---|---|---|---|---|---|');
for (const r of rows) {
  lines.push(
    `| ${r.id} | ${r.expected} | ${r.oldScores.join(', ')} | **${r.newScores.join(', ')}** | ${r.maxSimilarity} | ${r.flags.length ? r.flags.join(' · ') : '—'} |`,
  );
}
lines.push('');
lines.push(
  `- المقيّم القديم: أدنى ${summary.oldCritic.min}، أعلى ${summary.oldCritic.max}، متوسط ${summary.oldCritic.mean} — **دمية مطاطية**.`,
);
lines.push(
  `- المقيّم المعاير: أدنى ${summary.newCritic.min}، أعلى ${summary.newCritic.max}، متوسط ${summary.newCritic.mean}؛ نجح ${summary.newCritic.passing}/${summary.variants} نسخة.`,
);
lines.push(`- توجيهات كل نسخها >= 80: ${summary.promptPassing.count}/${rows.length}.`);
lines.push('');
lines.push('## الأعطال المتكررة (أسباب قابلة للإصلاح في Q2/Q3)');
const flagCount = new Map<string, number>();
for (const r of rows) {
  for (const f of r.flags) {
    const key = f.split('=')[0]!.split(':')[0]!;
    flagCount.set(key, (flagCount.get(key) ?? 0) + 1);
  }
}
for (const [k, v] of [...flagCount.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`- ${k}: ${v} حالة`);
}
fs.writeFileSync(path.join(OUT, 'scorecard.md'), lines.join('\n'));

/* ---- contact sheet ---- */
const listFile = path.join(OUT, 'list.txt');
fs.writeFileSync(
  listFile,
  rows
    .flatMap((r) => r.files)
    .map((f) => path.join(OUT, f))
    .join('\n'),
);
console.log(`\nscorecard: ${OUT}/scorecard.md`);
console.log(
  `variants >= 80: ${passingNew}/${newAll.length}; prompts all-pass: ${promptPassing}/${rows.length}`,
);
