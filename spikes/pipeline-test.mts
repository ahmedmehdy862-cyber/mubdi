import { parseBrief } from '../packages/core/src/brief.ts';
import { generateSpec } from '../packages/core/src/spec.ts';
import { specToPsd, validatePsd } from '../packages/psd-engine/src/index.ts';
import fs from 'node:fs';

const brief = parseBrief('تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي');
for (let v = 0; v < 3; v++) {
  const spec = generateSpec(brief, 'ig_post_4x5', v);
  const buf = specToPsd(spec, 'editable');
  fs.writeFileSync(`spikes/variant-${v}.psd`, buf);
  const vres = validatePsd(buf, spec);
  console.log(`variant ${v}: ${buf.length} bytes, valid=${vres.ok}`, vres.errors);
}

// safe mode
const spec0 = generateSpec(brief, 'ig_post_4x5', 0);
const safeBuf = specToPsd(spec0, 'safe');
fs.writeFileSync('spikes/variant-safe.psd', safeBuf);
console.log('safe:', safeBuf.length, validatePsd(safeBuf, spec0).ok);
