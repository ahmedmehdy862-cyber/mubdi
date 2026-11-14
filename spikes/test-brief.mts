import { parseBrief, parseSeriesPlan } from '../packages/core/src/brief.ts';
const b = parseBrief('تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي');
console.log(JSON.stringify(b, null, 2));
const sp = parseSeriesPlan('كاروسيل 6 شرائح عن فوائد التطوع');
console.log('series count:', sp?.count);
