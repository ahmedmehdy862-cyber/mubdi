import { describe, it, expect } from 'vitest';
import { parseBrief } from '../packages/core/src/brief';
import { expandContent, expandBrief, applyPackToBrief, TONES } from '../packages/core/src/content';
import { generateSpec } from '../packages/core/src/spec';
import { evaluateQuality } from '../packages/design-knowledge/src/index';

const VOLUNTEER = 'ملتقى تطوعي لتنظيم حملة تشجير في الحي';
const COURSE = 'دورة مجانية لتعليم البرمجة للأطفال يوم السبت الساعة 10 الصبح';

describe('content expansion engine (Q2)', () => {
  it('extracts real facts and never invents the missing ones', () => {
    const brief = parseBrief(COURSE);
    const pack = expandContent(brief, { prompt: COURSE });
    const date = pack.details.find((d) => d.kind === 'date')!;
    expect(date.source).toBe('extracted');
    expect(date.value).toContain('السبت');
    const place = pack.details.find((d) => d.kind === 'place')!;
    expect(place.isPlaceholder).toBe(true);
    expect(place.value).toMatch(/\[اكتب هنا/);
    const contact = pack.details.find((d) => d.kind === 'contact')!;
    expect(contact.isPlaceholder).toBe(true);
    expect(contact.value).toMatch(/\[اكتب هنا/);
    expect(pack.headlines).toHaveLength(3);
  });

  it('prompt with no facts yields all placeholders (honest, editable)', () => {
    const brief = parseBrief(VOLUNTEER);
    const pack = expandContent(brief, { prompt: VOLUNTEER });
    for (const kind of ['date', 'place', 'contact'] as const) {
      const field = pack.details.find((d) => d.kind === kind)!;
      expect(field.isPlaceholder).toBe(true);
      expect(field.value).toMatch(/\[اكتب هنا/);
    }
    expect(pack.subheadline.length).toBeGreaterThan(5);
    expect(pack.benefits.length).toBeGreaterThanOrEqual(3);
    expect(pack.hashtags.length).toBeGreaterThanOrEqual(2);
    expect(pack.caption).toContain('#');
  });

  it('tones change the CTA and pack records tone', () => {
    const brief = parseBrief(VOLUNTEER);
    const excited = expandContent(brief, { prompt: VOLUNTEER, tone: 'excited' });
    const formal = expandContent(brief, { prompt: VOLUNTEER, tone: 'formal' });
    const youthful = expandContent(brief, { prompt: VOLUNTEER, tone: 'youthful' });
    expect(excited.cta).toBe(TONES.excited.ctaAr);
    expect(formal.cta).toBe(TONES.formal.ctaAr);
    expect(youthful.cta).toBe(TONES.youthful.ctaAr);
    expect(excited.cta).not.toBe(formal.cta);
  });

  it('expandBrief feeds the enriched copy into spec generation — content gate passes', () => {
    const parsed = parseBrief(COURSE);
    const { brief, pack } = expandBrief(parsed, { prompt: COURSE });
    expect(brief.copy.headline).toBe(pack.headlines[0]);
    expect(brief.copy.body).toContain('الساعة 10 الصبح'); // extracted fact
    expect(brief.copy.body).toContain('[اكتب هنا'); // editable placeholder row
    expect(brief.copy.footer).toContain('#');
    const spec = generateSpec(brief, 'ig_post_4x5', 1);
    const evaluation = evaluateQuality(spec);
    const checks = evaluation.metrics.contentChecks;
    expect(checks.headline).toBe(true);
    expect(checks.subhead).toBe(true);
    expect(checks.details).toBe(true); // date row + benefit row
    expect(checks.cta).toBe(true);
    const detailsLayers = spec.layers.filter(
      (l) => l.type === 'text' && (l.metadata as Record<string, unknown>).role === 'body',
    );
    expect(detailsLayers.length).toBeGreaterThan(0);
  });

  it('applyPackToBrief round-trips edited values', () => {
    const brief = parseBrief(VOLUNTEER);
    const pack = expandContent(brief, { prompt: VOLUNTEER });
    pack.details.forEach((d) => {
      if (d.isPlaceholder) d.value = d.value.replace('[اكتب هنا]', 'الميدان الكبير');
    });
    const enriched = applyPackToBrief(brief, pack);
    expect(enriched.copy.body).not.toContain('[اكتب هنا]');
    expect(enriched.copy.body).toContain('الميدان الكبير');
  });
});
