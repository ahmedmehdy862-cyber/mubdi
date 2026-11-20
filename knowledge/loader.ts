/**
 * K0 — knowledge loader. Validates on every load: an invalid handbook
 * throws instead of silently feeding bad knowledge to the Art Director.
 */
import * as fs from 'node:fs';
import { validateHandbook } from './schema';
import type { Handbook, KnowledgeRule } from './schema';

let cached: Handbook | null = null;

function readJson(url: URL): unknown {
  return JSON.parse(fs.readFileSync(url, 'utf8')) as unknown;
}

/** Load + validate knowledge/handbook.json (throws on any violation). */
export function loadHandbook(): Handbook {
  if (cached) return cached;
  const raw = readJson(new URL('./handbook.json', import.meta.url));
  const { rules, errors } = validateHandbook(raw);
  if (!rules) {
    throw new Error(`knowledge/handbook.json is invalid:\n- ${errors.join('\n- ')}`);
  }
  if (rules.length < 10) {
    throw new Error(`knowledge/handbook.json must keep at least 10 rules (has ${rules.length})`);
  }
  cached = { version: 1, rules };
  return cached;
}

export function handbookRules(): KnowledgeRule[] {
  return loadHandbook().rules;
}

export function hasRule(id: string): boolean {
  return handbookRules().some((rule) => rule.id === id);
}

/**
 * Every decision and designer note must cite rule ids that exist —
 * free-floating rationale is not knowledge.
 */
export function assertCites(ids: readonly string[]): { ok: boolean; missing: string[] } {
  const missing = ids.filter((id) => !hasRule(id));
  return { ok: missing.length === 0, missing };
}

/** Extract cited rule ids from `rules:` / `القواعد المرتبطة:` lines of a markdown doc. */
export function citedIds(markdown: string, marker: RegExp): string[][] {
  const lines = markdown.split(/\r?\n/).filter((line) => marker.test(line));
  return lines.map((line) =>
    line
      .replace(marker, '')
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );
}

/** Reset the module cache — tests use this to force revalidation. */
export function _resetCache(): void {
  cached = null;
}
