import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import { KNOWLEDGE_DOMAINS, validateRule, validateHandbook } from '../knowledge/schema';
import type { KnowledgeRule } from '../knowledge/schema';
import { loadHandbook, handbookRules, hasRule, assertCites, citedIds } from '../knowledge/loader';

function makeRule(overrides: Partial<KnowledgeRule> = {}): Record<string, unknown> {
  return {
    id: 'sample-rule',
    domain: 'color',
    whyAr: 'سبب كافٍ وواضح لهذه القاعدة يتجاوز عشرين حرفاً حتى تُقبل.',
    observableAr: 'مؤشر قابل للقياس يظهر في الرندر.',
    measure: 'rubric.sample>=1',
    source: 'handbook',
    addedAt: '2026-11-20',
    ...overrides,
  };
}

describe('knowledge schema (K0)', () => {
  it('rejects unknown fields — knowledge never stores reference material', () => {
    const { errors } = validateRule(makeRule({ pixels: 'base64blob' } as Partial<KnowledgeRule>));
    expect(errors.some((e) => e.includes('unknown field'))).toBe(true);
  });

  it('rejects reference payloads and file paths in text fields', () => {
    const payload = validateRule(makeRule({ whyAr: 'مرجع بصري data:image/png;base64,AAAA' }));
    expect(payload.errors.some((e) => e.includes('reference material'))).toBe(true);
    const path = validateRule(makeRule({ observableAr: 'المرجع من C:\\refs\\poster.png' }));
    expect(path.errors.some((e) => e.includes('reference material'))).toBe(true);
  });

  it('rejects bad ids, domains, sources, dates and measures', () => {
    expect(validateRule(makeRule({ id: 'Not Kebab' })).errors.length).toBeGreaterThan(0);
    expect(validateRule(makeRule({ domain: 'astrology' })).errors.length).toBeGreaterThan(0);
    expect(validateRule(makeRule({ source: 'scraped' })).errors.length).toBeGreaterThan(0);
    expect(validateRule(makeRule({ addedAt: '20/11/2026' })).errors.length).toBeGreaterThan(0);
    expect(validateRule(makeRule({ measure: '???' })).errors.length).toBeGreaterThan(0);
    expect(validateRule(makeRule({ whyAr: 'قصير' })).errors.length).toBeGreaterThan(0);
  });

  it('accepts a well-formed rule', () => {
    const { rule, errors } = validateRule(makeRule());
    expect(errors).toEqual([]);
    expect(rule?.id).toBe('sample-rule');
  });

  it('rejects handbook envelope violations and duplicate ids', () => {
    expect(validateHandbook('nope').errors.length).toBeGreaterThan(0);
    expect(validateHandbook({ version: 2, rules: [] }).errors.length).toBeGreaterThan(0);
    const dup = validateHandbook({ version: 1, rules: [makeRule(), makeRule()] });
    expect(dup.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });
});

describe('handbook (seeded at K0)', () => {
  it('loads and validates the real handbook', () => {
    expect(() => loadHandbook()).not.toThrow();
    expect(handbookRules().length).toBeGreaterThanOrEqual(18);
  });

  it('keeps ids unique and every rule why-first', () => {
    const rules = handbookRules();
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of rules) {
      expect(r.whyAr.trim().length).toBeGreaterThanOrEqual(20);
      expect(KNOWLEDGE_DOMAINS).toContain(r.domain);
      expect(r.measure.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('resolves every measure to a real check or a declared pending one', () => {
    const state = fs.readFileSync(new URL('../PROJECT_STATE.md', import.meta.url), 'utf8');
    for (const r of handbookRules()) {
      if (r.measure.startsWith('pending:')) {
        expect(state.includes(r.measure)).toBe(true);
      }
    }
  });

  it('assertCites accepts real ids and reports missing ones', () => {
    expect(assertCites(['readable-contrast', 'logo-clear-zone']).ok).toBe(true);
    const miss = assertCites(['readable-contrast', 'no-such-rule']);
    expect(miss.ok).toBe(false);
    expect(miss.missing).toEqual(['no-such-rule']);
  });
});

describe('decision and note citation discipline', () => {
  const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

  it('every DECISIONS.md section cites at least one existing rule', () => {
    const md = read('../DECISIONS.md');
    const sections = md.split(/\n(?=## )/).slice(1);
    expect(sections.length).toBeGreaterThanOrEqual(1);
    for (const section of sections) {
      const heading = section.split('\n')[0];
      const lines = section.split('\n');
      const ruleLine = lines.find((l) => /^rules:/.test(l));
      expect(ruleLine, `decision "${heading}" must have a rules: line`).toBeTruthy();
      const ids = citedIds(ruleLine!, /^\s*rules:\s*/)[0] ?? [];
      expect(ids.length, `decision "${heading}" must cite ≥1 rule`).toBeGreaterThan(0);
      for (const id of ids)
        expect(hasRule(id), `unknown rule "${id}" cited by "${heading}"`).toBe(true);
    }
  });

  it('designer-notes keeps the top-priority banner, template and valid citations', () => {
    const md = read('../knowledge/designer-notes.md');
    expect(md.includes('الأولوية القصوى')).toBe(true);
    expect(md.includes('القواعد المرتبطة')).toBe(true);
    const citations = citedIds(md, /^\s*-\s*القواعد المرتبطة:\s*/).map((ids) =>
      ids.filter((id) => !id.includes('<') && !id.includes('>')),
    );
    for (const ids of citations) {
      if (ids.length === 0) continue; // template placeholder line
      const { ok, missing } = assertCites(ids);
      expect(ok, `unknown rules cited: ${missing.join(', ')}`).toBe(true);
    }
  });

  it('project state records the acceptance gate', () => {
    const md = read('../PROJECT_STATE.md');
    expect(md.includes('60/60')).toBe(true);
    expect(md.includes('20/20')).toBe(true);
  });
});
