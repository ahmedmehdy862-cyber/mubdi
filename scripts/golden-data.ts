/** Golden Set data — 20 prompts covering the Section-1 occasions.
 * Data only; the runners live in golden-set.ts (baseline) and
 * golden-calibrated.ts (calibrated). Importing this module must not
 * trigger any runs. */

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
