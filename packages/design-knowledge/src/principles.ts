/**
 * The design curriculum. Every rule the engine applies is written down here,
 * in Arabic and English, with the mistake it prevents. The same catalog is
 * used to (a) drive layout/critique and (b) teach the model through
 * `knowledgeContext()`.
 */

export type PrincipleCategory =
  | 'hierarchy'
  | 'layout'
  | 'color'
  | 'typography'
  | 'gestalt'
  | 'composition'
  | 'creativity'
  | 'brand'
  | 'arabic'
  | 'production';

export interface DesignPrinciple {
  id: string;
  nameAr: string;
  nameEn: string;
  category: PrincipleCategory;
  summaryAr: string;
  rules: string[];
  mistakes: string[];
  metrics?: string[];
}

export const PRINCIPLES: DesignPrinciple[] = [
  {
    id: 'hierarchy',
    nameAr: 'التسلسل البصري',
    nameEn: 'Visual Hierarchy',
    category: 'hierarchy',
    summaryAr: 'العين يجب أن تعرف من أين تبدأ وإلى أين تنتقل. عنصر واحد يقود، والبقية تدعمه.',
    rules: [
      'عنصر واحد فقط يكون الأكبر/الأثقل في التصميم.',
      'الفرق بين العنوان والنص لا يقل عن 2× (المثالي 2.5–4×).',
      'استخدم 3–4 مستويات طباعية كحد أقصى.',
      'التباين في الحجم والوزن واللون — لا تعتمد على الحجم وحده.',
    ],
    mistakes: ['كل العناصر بنفس الحجم', 'عنوانان يتنافسان على الانتباه', 'استخدام 6 أحجام مختلفة'],
    metrics: ['hierarchy.stepRatio >= 2', 'hierarchy.levels between 2 and 4'],
  },
  {
    id: 'contrast',
    nameAr: 'التباين',
    nameEn: 'Contrast',
    category: 'hierarchy',
    summaryAr: 'بدون تباين لا يوجد تمييز ولا قراءة. التباين هو الفرق الذي يصنع المعنى.',
    rules: ['نص أساسي على خلفية: 4.5:1 على الأقل (WCAG AA).', 'نص كبير/عريض: 3:1.', 'لا تعتمد على اللون وحده لحمل المعنى.'],
    mistakes: ['رمادي فاتح على أبيض', 'نص فوق صورة مزدحمة بلا تعتيم', 'أخضر على أحمر'],
    metrics: ['contrast.body >= 4.5', 'contrast.large >= 3'],
  },
  {
    id: 'alignment',
    nameAr: 'المحاذاة',
    nameEn: 'Alignment',
    category: 'layout',
    summaryAr: 'كل عنصر يجب أن يكون له علاقة محاذاة بعنصر آخر. المحاذاة تصنع النظام.',
    rules: ['حاذِ على عمود شبكة أو حافة واضحة.', 'محاذاتان كحد أقصى في التصميم الواحد (بداية/وسط).', 'لا تضع عنصراً «قريباً» من المحاذاة؛ إما عليها أو بعيدة بوضوح.'],
    mistakes: ['كل عنصر في x مختلف', 'محاذاة وسط مع محاذاة بداية في نفس الكتلة'],
    metrics: ['alignment.distinctEdges <= 3', 'alignment.onGrid >= 80%'],
  },
  {
    id: 'proximity',
    nameAr: 'التقارب',
    nameEn: 'Proximity',
    category: 'gestalt',
    summaryAr: 'العناصر المتقاربة تُقرأ كمجموعة. المسافة هي التي تحدد العلاقة قبل الخطوط.',
    rules: ['المسافة داخل المجموعة أصغر من المسافة بين المجموعات (على الأقل 1.5×).', 'استخدم مقياس مسافات ثابت (8/16/24/32/48).', 'لا تفصل عنواناً عن نصه بمسافة أكبر من مسافة النص عن العنصر التالي.'],
    mistakes: ['مسافات عشوائية', 'عنوان بعيد عن محتواه', 'تكديس كل شيء بنفس المسافة'],
    metrics: ['spacing.onScale >= 80%', 'spacing.groupGap / innerGap >= 1.5'],
  },
  {
    id: 'white-space',
    nameAr: 'الفراغ (المساحة السلبية)',
    nameEn: 'White Space',
    category: 'layout',
    summaryAr: 'الفراغ ليس مساحة ضائعة؛ هو الذي يمنح العناصر قيمة ويوجّه العين.',
    rules: ['اترك هامشاً خارجياً لا يقل عن 5% من العرض.', 'حول العنصر البطل، اترك فراغاً أكبر من أي مسافة أخرى.', 'كثافة النص لا تتجاوز 40% من المساحة.'],
    mistakes: ['ملء كل الزوايا', 'نص يلامس الحواف', 'خوف من الفراغ يؤدي إلى حشو'],
    metrics: ['density.textArea <= 0.4', 'margins >= preset.margins'],
  },
  {
    id: 'repetition',
    nameAr: 'التكرار والاتساق',
    nameEn: 'Repetition & Consistency',
    category: 'brand',
    summaryAr: 'تكرار العناصر نفسها (لون، خط، مسافة، شكل) يصنع هوية ويوفّر على العين إعادة التعلّم.',
    rules: ['عائلتان خطيتان كحد أقصى.', '3–5 ألوان كحد أقصى (بما فيها الخلفية).', 'نفس نصف القطر ونفس الظل في كل العناصر.'],
    mistakes: ['كل زر بشكل مختلف', 'خط جديد لكل عنوان', 'تدرّجات مختلفة في نفس التصميم'],
    metrics: ['palette.colorCount <= 5', 'fonts.count <= 2'],
  },
  {
    id: 'balance',
    nameAr: 'التوازن',
    nameEn: 'Balance',
    category: 'composition',
    summaryAr: 'الوزن البصري يجب أن يتوزع حول المحور. التوازن غير المتماثل أكثر حياة من المتماثل.',
    rules: ['وازن كتلة كبيرة بمساحة أو لون دافئ صغير.', 'المركز البصري أعلى قليلاً من المركز الهندسي.', 'لا تترك ثقلاً كاملاً في زاوية واحدة بلا مقابل.'],
    mistakes: ['كل العناصر في الأسفل', 'ثقل بصري في اليمين بلا مقابل', 'تماثل ممل في كل تصاميم العلامة'],
    metrics: ['balance.centroid within 0.18 of centre'],
  },
  {
    id: 'focal-point',
    nameAr: 'البؤرة',
    nameEn: 'Focal Point',
    category: 'composition',
    summaryAr: 'عين واحدة، بطل واحد. إذا كان كل شيء بارزاً فلا شيء بارز.',
    rules: ['بؤرة واحدة واضحة (العنوان عادة).', 'ضعها على تقاطع الثلث أو المركز البصري.', 'ادعمها بتباين لوني أو حجمي، لا بإضافة عناصر.'],
    mistakes: ['عدة عناصر بنفس الوزن', 'بؤرة في الزاوية الميتة', 'بؤرة مغطاة بعنصر زخرفي'],
    metrics: ['focal.dominance >= 1.8'],
  },
  {
    id: 'rule-of-thirds',
    nameAr: 'قاعدة الأثلاث',
    nameEn: 'Rule of Thirds',
    category: 'composition',
    summaryAr: 'تقسيم الإطار إلى 3×3 ووضع العناصر المهمة على الخطوط أو التقاطعات يخلق توتراً محسوباً.',
    rules: ['ضع البؤرة على أحد التقاطعات الأربعة.', 'خط الأفق/الفاصل على ثلث أو ثلثين، لا في المنتصف.', 'اترك الثلث المقابل ليتنفس.'],
    mistakes: ['كل شيء في المنتصف تماماً', 'تجاهل التقاطعات في الصور'],
  },
  {
    id: 'gestalt-proximity',
    nameAr: 'مبادئ الجشطالت',
    nameEn: 'Gestalt Principles',
    category: 'gestalt',
    summaryAr: 'العقل يجمع العناصر تلقائياً: التقارب، التشابه، الإغلاق، الاستمرارية، الشكل/الخلفية.',
    rules: ['التشابه: العناصر المتشابهة تُقرأ كوظيفة واحدة.', 'الإغلاق: يمكنك الاستغناء عن الحدود إذا اكتمل الشكل ذهنياً.', 'الشكل/الخلفية: تأكد أن النص يُقرأ كأرضية مستقلة عن الصورة.'],
    mistakes: ['عناصر مختلفة بوظائف مختلفة بنفس الشكل', 'نص يذوب في الخلفية'],
  },
  {
    id: 'z-pattern',
    nameAr: 'مسار القراءة Z',
    nameEn: 'Z / F Reading Pattern',
    category: 'layout',
    summaryAr: 'العين تتحرك من أعلى البداية إلى النهاية، ثم قطراً للأسفل، ثم أفقياً. في العربية يُعكس الاتجاه.',
    rules: ['ابدأ بالشعار/السياق أعلى البداية.', 'العنوان في المسار القطري، والـ CTA في نهاية المسار.', 'في RTL: ابدأ من اليمين واعكس كل المسار.'],
    mistakes: ['CTA في أعلى الصفحة', 'معلومات ثانوية في المسار الرئيسي'],
  },
  {
    id: 'grid-8pt',
    nameAr: 'شبكة 8 نقاط',
    nameEn: '8pt Grid',
    category: 'layout',
    summaryAr: 'كل المسافات والأحجام مضاعفات 8 (أو 4 للتفاصيل) — إيقاع متناسق وقابل للتنفيذ.',
    rules: ['المسافات: 4, 8, 16, 24, 32, 48, 64.', 'الهوامش على الشبكة.', 'ارتفاع الأسطر والكتل مضاعفات 8 إن أمكن.'],
    mistakes: ['مسافات 13px و27px', 'هوامش مختلفة في كل جهة'],
    metrics: ['spacing.onScale >= 0.8'],
  },
  {
    id: 'type-scale',
    nameAr: 'المقياس الطباعي',
    nameEn: 'Modular Scale',
    category: 'typography',
    summaryAr: 'أحجام الخط تُشتق من نسبة ثابتة (1.25 أو 1.333) — تناسق موسيقي بدل أرقام عشوائية.',
    rules: ['اختر نسبة واحدة والتزم بها.', 'اربط الحجم الأساسي بحجم الكانفس.', 'لا تكسر المقياس إلا لضرورة (مثلاً شعار).'],
    mistakes: ['أحجام 31 و37 و42', 'عنوان أكبر قليلاً من النص فقط'],
  },
  {
    id: 'measure',
    nameAr: 'طول السطر',
    nameEn: 'Measure',
    category: 'typography',
    summaryAr: 'السطر الطويل يفقد التتبّع، والقصير يقطع النفس. 30–55 حرفاً للنص، 16–34 للعنوان.',
    rules: ['حدّد عرض صندوق النص لا عرض الكانفس.', 'لا تجعل سطر العنوان يزيد عن 3–4 أسطر.', 'اضبط الكسر يدوياً (`\n`) حين تحتاج معنىً أو إيقاعاً.'],
    mistakes: ['عنوان يمتد على كامل 1080px', 'سطر واحد بكلمة يتيمة'],
  },
  {
    id: 'arabic-flow',
    nameAr: 'التدفق العربي (RTL)',
    nameEn: 'RTL Flow',
    category: 'arabic',
    summaryAr: 'التصميم العربي يبدأ من اليمين: الشعار يميناً، العين تتحرك يميناً→يساراً، والأرقام تُقرأ من اليسار.',
    rules: ['حاذِ النص لليمين.', 'اعكس مسار Z واتجاه الأسهم.', 'ابدأ قائمة المزايا من اليمين.', 'لا تباعد أحرف العربية.'],
    mistakes: ['محاذاة يسار لنص عربي', 'أيقونة سهم لليسار في تدفق RTL', 'خلط الأرقام العربية واللاتينية'],
  },
  {
    id: 'color-harmony',
    nameAr: 'تناغم الألوان',
    nameEn: 'Colour Harmony',
    category: 'color',
    summaryAr: 'اللوحة تُبنى على علاقة هندسية على عجلة اللون: متجاورة، متكاملة، ثلاثية.',
    rules: ['قاعدة 60-30-10: لون مسيطر، ثانوي، ولكنة.', 'الألوان المحايدة تحمي اللوحة من الفوضى.', 'الأسود النقي نادراً ما يكون أفضل من كحلي داكن.'],
    mistakes: ['5 ألوان مشبعة بنفس الوزن', 'ألوان متكاملة بنسبة 50/50', 'استخدام الذهبي كخلفية كاملة'],
    metrics: ['palette.dominantRatio >= 0.55', 'palette.colorCount <= 5'],
  },
  {
    id: 'color-psychology',
    nameAr: 'سيكولوجيا اللون',
    nameEn: 'Colour Psychology',
    category: 'color',
    summaryAr: 'اللون يسبق الكلمة في المعنى: أخضر نمو وثقة، أزرق مؤسسي، ذهبي قيمة، أحمر إلحاح.',
    rules: ['اختر اللون حسب القطاع والجمهور لا حسب الذوق.', 'راعِ الثقافة المحلية (الأخضر والذهبي في الخليج).', 'اللون الأحمر للـ CTA فقط عندما يكون الإلحاح مطلوباً.'],
    mistakes: ['وردي لعلامة أمن سيبراني', 'أحمر لرسالة تهنئة'],
  },
  {
    id: 'accent-scarcity',
    nameAr: 'ندرة اللون المميز',
    nameEn: 'Accent Scarcity',
    category: 'color',
    summaryAr: 'اللون المميز يعمل فقط إذا كان نادراً. الذهبي على 10% من التصميم يبدو فخماً؛ على 80% يبدو رخيصاً.',
    rules: ['≤10% للّون المميز.', 'استخدمه للـ CTA أو كلمة واحدة أو خط رفيع.', 'لا تجعل الخلفية واللكنة بنفس التشبع.'],
    mistakes: ['لكنة ذهبية في كل عنصر', 'لكنة بنفس وزن الخلفية'],
  },
  {
    id: 'depth',
    nameAr: 'العمق والطبقات',
    nameEn: 'Depth & Layers',
    category: 'composition',
    summaryAr: 'الظل والتعتيم والتدرّج تصنع طبقات؛ لكن الظل الواحد يكفي — الظلال الكثيرة تُوحل.',
    rules: ['ظل واحد بنفس الاتجاه في كل التصميم.', 'التعتيم تحت النص 40–70% للصور.', 'استخدم تدرّجاً واحداً كحد أقصى.'],
    mistakes: ['ظلال في 4 اتجاهات', 'تدرّج بنفسجي على تصميم ذهبي'],
  },
  {
    id: 'imagery',
    nameAr: 'الصورة والاتجاه الفني',
    nameEn: 'Imagery & Art Direction',
    category: 'composition',
    summaryAr: 'الصورة تُختار لخدمة النص: مساحة هادئة للنص، بؤرة بشرية، وإضاءة متسقة مع المزاج.',
    rules: ['صورة واحدة بطل.', 'اختر صورة فيها فراغ (negative space) للنص.', 'لا تضع نصاً فوق منطقة عالية التفاصيل.', 'اتجاه النظر داخل الإطار لا خارجه.'],
    mistakes: ['صورة مزدحمة تحت العنوان', 'أكثر من صورة بطل', 'معالجة لونية مختلفة لكل صورة'],
  },
  {
    id: 'brand-consistency',
    nameAr: 'اتساق العلامة',
    nameEn: 'Brand Consistency',
    category: 'brand',
    summaryAr: 'العلامة تُبنى بالتكرار: نفس الشعار، نفس المساحة المحيطة، نفس اللوحة، نفس نبرة الكتابة.',
    rules: ['مساحة أمان حول الشعار = ارتفاع حرف الشعار.', 'لا تُشوّه الشعار أو تُغيّر لونه خارج الدليل.', 'نفس نبرة الصوت في كل منشور.'],
    mistakes: ['شعار بألوان مختلفة في كل منشور', 'شعار صغير جداً أو ملتصق بالحافة'],
  },
  {
    id: 'thumb-stopping',
    nameAr: 'إيقاف التمرير',
    nameEn: 'Thumb-stopping',
    category: 'production',
    summaryAr: 'لديك 0.3 ثانية داخل الخلاصة: تباين عالٍ، عنصر واحد ضخم، ورسالة تُقرأ بلا مجهود.',
    rules: ['عنوان يُقرأ بحجم مصغّر.', 'تباين عالٍ في أول 200ms.', 'لا نص رفيع أو رمادي فاتح.', 'الـ CTA واضح إن وُجد.'],
    mistakes: ['تصميم جميل لكن غير مقروء كمصغرة', 'تفاصيل صغيرة تختفي على الهاتف'],
  },
  {
    id: 'safe-zones',
    nameAr: 'مساحات الأمان للمنصات',
    nameEn: 'Platform Safe Zones',
    category: 'production',
    summaryAr: 'كل منصة تقتطع أجزاء من الصورة (واجهة الستوري، شريط الحالة). النص لا يقترب من الحواف.',
    rules: ['ستوري: تجنّب أعلى 120px وأسفل 200px على 1080×1920.', 'اترك هامشاً 5–8% من كل جهة.', 'لا تضع CTA في منطقة أزرار المنصة.'],
    mistakes: ['نص تحت شريط التقدّم', 'شعار في زاوية مقطوعة'],
    metrics: ['safeZone.violations == 0'],
  },
  {
    id: 'creative-concept',
    nameAr: 'الفكرة الإبداعية',
    nameEn: 'Creative Concept',
    category: 'creativity',
    summaryAr: 'التصميم الجيد يحمل فكرة واحدة تُروى بصرياً. الزخرفة ليست فكرة.',
    rules: ['اكتب الفكرة في جملة واحدة قبل التصميم.', 'استخدم استعارة بصرية واحدة.', 'اختبر: لو حذفت الشعار، هل تبقى الفكرة؟'],
    mistakes: ['تصميم بلا رسالة', 'أفكار متعددة في منشور واحد', 'تقليد بلا سبب'],
  },
  {
    id: 'scamper',
    nameAr: 'سكامبر للتنويع',
    nameEn: 'SCAMPER',
    category: 'creativity',
    summaryAr: 'أداة لتوليد بدائل: استبدل، ادمج، كيّف، عدّل، استخدم بشكل آخر، احذف، اعكس.',
    rules: ['ولّد 3 مسارات مختلفة لا 3 ألوان.', 'كل مسار يغيّر قراراً واحداً جوهرياً (الصورة/الشبكة/الطباعة).', 'احتفظ بنظام بصري مشترك بين المسارات.'],
    mistakes: ['ثلاث نسخ متطابقة', 'تغيير اللون فقط كبديل إبداعي'],
  },
  {
    id: 'minimalism',
    nameAr: 'الاختزال',
    nameEn: 'Reduction',
    category: 'creativity',
    summaryAr: 'الاحترافية غالباً حذف: كل عنصر يجب أن يبرّر وجوده.',
    rules: ['احذف أي عنصر لا يخدم الفكرة.', 'عنصر بطل + معلومة + فعل = كفاية.', 'الفراغ جزء من التكوين.'],
    mistakes: ['زخرفة لتغطية الفراغ', 'أيقونات بلا وظيفة'],
  },
  {
    id: 'storytelling',
    nameAr: 'الحكي البصري',
    nameEn: 'Visual Storytelling',
    category: 'creativity',
    summaryAr: 'التصميم القوي يبدأ من سؤال/توتر وينتهي بفعل. التسلسل هو الحكاية.',
    rules: ['ابدأ بـ«لماذا يهمني؟» في العنوان.', 'انتقل من المشكلة إلى الحل إلى الفعل.', 'اجعل الـ CTA نتيجة منطقية للنص.'],
    mistakes: ['عنوان وصفي بلا وعد', 'CTA منفصل عن الرسالة'],
  },
  {
    id: 'production-hygiene',
    nameAr: 'نظافة ملف التصدير',
    nameEn: 'Production Hygiene',
    category: 'production',
    summaryAr: 'ملف PSD احترافي = طبقات مسمّاة، مجموعات منطقية، نص حي، ولا طبقة مدمجة وحيدة.',
    rules: ['مجموعات: 00_Guides / 10_Text / 20_Brand / 30_Graphics / 40_Imagery / 50_Overlays / 90_Background.', 'أسماء واضحة لا "Layer 1 copy 3".', 'النص حي وقابل للتحرير.', 'الصور مدمجة كـ Smart Objects إن أمكن.'],
    mistakes: ['ملف مسطح', 'نص محوّل إلى صورة', 'طبقات بلا أسماء'],
  },
];

export function principle(id: string): DesignPrinciple {
  return PRINCIPLES.find((p) => p.id === id) ?? PRINCIPLES[0]!;
}

export function principlesByCategory(category: PrincipleCategory): DesignPrinciple[] {
  return PRINCIPLES.filter((p) => p.category === category);
}

/** Compact curriculum text used as system context for any LLM call. */
export function knowledgeContext(): string {
  const lines = PRINCIPLES.map(
    (p) => `- ${p.nameAr} (${p.nameEn}): ${p.summaryAr} القواعد: ${p.rules.join(' ')}`,
  );
  return [
    'أنت مدير فني عربي محترف. طبّق المبادئ التالية في كل قرار:',
    ...lines,
    'قواعد إلزامية: النص العربي بلا تباعد أحرف، محاذاة يمين، تباين 4.5:1، 3–4 مستويات طباعية، شبكة 8pt، بؤرة واحدة.',
  ].join('\n');
}

export const KNOWLEDGE_VERSION = '1.0.0';
