import { parseBrief } from '../packages/core/src/brief.ts';
import { generateSpec } from '../packages/core/src/spec.ts';
import { renderSpecToPng } from '../packages/renderer/src/index.ts';
import fs from 'node:fs';
const brief = parseBrief('تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي');
const spec = generateSpec(brief, 'ig_post_4x5', 0);
const buf = renderSpecToPng(spec);
fs.writeFileSync('spikes/render-0.png', buf);
console.log('rendered', buf.length);
