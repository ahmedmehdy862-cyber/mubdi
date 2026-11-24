# حالة المشروع — PROJECT_STATE.md

آخر تحديث: 2026-11-24

## مكتمل

### جودة التصميم (Q0–Q8) — سبرنت التعافي
- البوابة: **60/60 نسخة (100%)** و**20/20 برومبت بدرجة ≥ 80**
  (`q3-fail`)، اختبارات vitest **69/69**، tsc/eslint صفر.
- إصلاحات الجذور مرفوعة في `47e1dad` (9 ملفات): حواف صلبة، فصل
  أسطح ≥0.14، جلوس النصوص، ألواح فراغ مصمتة مُدخلة، بطاقة صفوف بحجم
  المحتوى، صندوق شعار في الشريط العلوي.
- الأدلة قبل/بعد: `out/evidence/{before,after}/` لسبعة برومبتات،
  شوهدت وراجعت بصرياً.
- أداة التحقق الهندسي: `out/collision-probe.ts` (يُعاد بناؤها مع كل تغيير).
  سجل صادق: بوابة "صفر تعارض" كانت قديمة — سبب 6 تعارضات (2 شعار +
  4 تقاطع) اكتُشف في دفعة P0 وأُصلحت جذورها (عائلات نصية، ميلاد CTA
  داخل المنطقة الآمنة). البوابة الآن: **0 تعارض** + **0 تراكب نص-نص
  عرضي** (`out/text-overlap.ts`)، و`dup-check` يُبقي التراكبات العائلية
  المقصودة (35 لون مميز + 7 سطر مقسوم) كما هي.

## قيد التنفيذ — P0 من خارطة المدير الفني (الحالي)

- **P0-1 ✔** قواعد المقابلة الـ16 أُضيفت إلى `knowledge/handbook.json`
  (38 قاعدة: 22 handbook + 16 interview)؛ `interview-log.md` محدَّث.
- **P0-2 ✔** ربط المفهوم: `GeneratedVariant.conceptIdeaAr` + اختيار
  مفهوم `generateConcepts(brief,3)` حسب رقم النسخة.
- **P0-4 ✔** الطبقات المقفلة no-op في `editor.ts`/`merge.ts`/`improve.ts`
  (اختبارات `tests/editor.test.ts` 5/5).
- **P0-5 ✔** `ruleGates(spec, brief, rules)` في
  `packages/design-knowledge/src/rules.ts` — كل قاعدة `measure` غير
  `pending:` تُفحص فعلياً قبل القبول (`tests/rule-gates.test.ts` 7/7).
- **إصلاح جذر التصادمات ✔** عائلات نصية بنفس `id` لا تُفك (اللون
  المميز ملتصق بسطره)، الجلوس على مستوى العائلة، تسوية السقف تُزيح
  الكتلة المُصمَّمة للأعلى بدل ترك تراكب، و`bottomInset` يجعل زر CTA
  يولد داخل المنطقة الآمنة فلا يُسحب عن اللوح المرسوم لحدوده.
- **P0-3 (متبقٍ):** ربط صندوق الدردشة في محرر سطح المكتب.
- بوابات الحالية: tsc (knowledge + 9 حزم + 3 تطبيقات) صفر، eslint
  صفر أخطاء/19 تحذير، vitest **93/93** (13 ملفاً)، q3-fail
  **60/60 + 20/20**، collision-probe **0**، text-overlap **0**.

## مرحلة المدير الفني (K)

- **K0 مكتمل:** أساس المعرفة — `knowledge/schema.ts` + `loader.ts` +
  `handbook.json` (38 قاعدة: 22 handbook + 16 interview) +
  `designer-notes.md` + `DECISIONS.md`. المقابلة اكتملت (15/15) والقواعد
  الـ16 معتمدة ومقيدة بتاريخ 2026-11-23.
- **K1–K5 (بعد P0):** التوليد الموجّه بالقواعد، اختبارات النقل
  (transfer)، إسقاط المرجع (reference-dropout)، حارس الأصالة
  (originality guard)، ثم التغذية الراجعة من المقابلات.

## ملاحظات تشغيلية

- قواعد `pending:*` في `handbook.json` = قياس لم يُوصَل بعد بفحص في
  المحرك. المسجَّلة حالياً (كلها مُدرجة هنا قبل القبول في الدليل —
  اختبار `tests/knowledge.test.ts` يفرض وجودها):
  `pending:gestalt.proximity` (K2)، `pending:concept.visualCarry`،
  `pending:impact.threeSecond`، `pending:brief.fidelity`،
  `pending:brand.logoPlacement`، `pending:creative.paletteFromMessage`،
  `pending:layout.whiteSpaceFunction`، `pending:process.principleNotPixel`،
  `pending:rtl.flow`، `pending:creative.imageTypeRoles`،
  `pending:color.backgroundMood`، `pending:creative.audienceDirection`،
  `pending:layout.relations`، `pending:process.clientGoal` (K1/K2/K4).
- بوابة القواعد وقت التشغيل: `ruleGates` في
  `packages/design-knowledge/src/rules.ts` — كل قاعدة بـ`measure` غير
  `pending:` تُفحص فعلياً؛ ما يقيسه خارج الـspec (بكسل/تجميع) يُصرَّح
  به في سجل القياس الخارجي ولا يُمنح تمريراً صامتاً.
- تغيير المعرفة يمر ببوابات الكود نفسها:
  `tsc -p knowledge/tsconfig.json` + `eslint .` + `vitest run`.
- آخر رفع: `git log -1` = `e00cd81` (P0 batch + إصلاح التصادمات).
