import { describe, it, expect } from 'vitest';
import { parseBrief } from '../packages/core/src/brief';
import { generateSpec } from '../packages/core/src/spec';
import { specToPsd, validatePsd } from '../packages/psd-engine/src/index';

describe('PSD export', () => {
  it('produces valid layered PSD', () => {
    const brief = parseBrief('تصميم بوست انستجرام لإعلان ملتقى تطوعي للجامعات يوم الجمعة الساعة 5 مساءً، الألوان أخضر وذهبي، بأسلوب شبابي');
    const spec = generateSpec(brief, 'ig_post_4x5', 0);
    const buf = specToPsd(spec, 'editable');
    const res = validatePsd(buf, spec);
    expect(res.ok).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
  it('safe mode produces valid PSD', () => {
    const brief = parseBrief('test');
    const spec = generateSpec(brief, 'ig_post_4x5', 0);
    const buf = specToPsd(spec, 'safe');
    expect(validatePsd(buf, spec).ok).toBe(true);
  });
});