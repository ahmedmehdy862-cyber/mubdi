/**
 * K0 — Art Director knowledge schema.
 *
 * We learn WHY, never WHAT. A rule stores the reason a design choice works
 * plus the observable a passing render must show — never reference pixels,
 * reference text, logos, signatures or any sample content. The validator is
 * a strict whitelist: unknown fields are rejected, so reference material
 * cannot be smuggled into the knowledge base.
 *
 * Knowledge changes pass the same gates as code: tsc, eslint, vitest
 * (tests/knowledge.test.ts validates the whole handbook through this file).
 */

/** The 10 skill domains of the methodology + `process` (engine lessons). */
export const KNOWLEDGE_DOMAINS = [
  'hierarchy',
  'layout',
  'color',
  'type',
  'rtl',
  'balance',
  'gestalt',
  'creative',
  'brand',
  'production',
  'process',
] as const;
export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number];

export const RULE_SOURCES = ['handbook', 'interview', 'derived'] as const;
export type RuleSource = (typeof RULE_SOURCES)[number];

export interface KnowledgeRule {
  /** kebab-case, unique across the handbook. */
  id: string;
  domain: KnowledgeDomain;
  /** WHY the rule exists — the lesson, in Arabic. Minimum 20 chars. */
  whyAr: string;
  /** What a passing render shows — observable, measurable, no references. */
  observableAr: string;
  /** The machine check this rule maps to (rubric id, probe, or `pending:*`). */
  measure: string;
  source: RuleSource;
  /** ISO date, YYYY-MM-DD. */
  addedAt: string;
}

export interface Handbook {
  version: 1;
  rules: KnowledgeRule[];
}

const RULE_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'domain',
  'whyAr',
  'observableAr',
  'measure',
  'source',
  'addedAt',
]);

const ID_RE = /^[a-z][a-z0-9-]{2,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEASURE_RE = /^(pending:[a-z][\w.:-]*|[a-z]\w*(?:\.\w+)+.*)$/;

/**
 * Reference material must never be stored: image payloads, data URIs,
 * base64 blobs, and filesystem paths of reference files.
 */
const FORBIDDEN_VALUE_RE = /data:image\/|base64,|[A-Za-z]:\\|\/(?:references?|refs|assets)\//i;

export interface ValidationResult {
  rule?: KnowledgeRule;
  errors: string[];
}

export function validateRule(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { errors: ['rule must be a plain object'] };
  }
  const raw = value as Record<string, unknown>;

  for (const key of Object.keys(raw)) {
    if (!RULE_FIELDS.has(key)) {
      errors.push(`unknown field "${key}" — knowledge stores why, never reference material`);
    }
  }

  const text = (key: string, min: number): void => {
    const v = raw[key];
    if (typeof v !== 'string' || v.trim().length < min) {
      errors.push(`"${key}" must be a string of at least ${min} characters`);
    }
  };
  text('id', 3);
  text('whyAr', 20);
  text('observableAr', 10);
  text('measure', 3);

  if (typeof raw.id === 'string' && !ID_RE.test(raw.id)) {
    errors.push(`"id" must be kebab-case (got "${raw.id}")`);
  }
  if (
    typeof raw.domain === 'string' &&
    !(KNOWLEDGE_DOMAINS as readonly string[]).includes(raw.domain)
  ) {
    errors.push(`"domain" must be one of: ${KNOWLEDGE_DOMAINS.join(', ')}`);
  }
  if (typeof raw.source === 'string' && !(RULE_SOURCES as readonly string[]).includes(raw.source)) {
    errors.push(`"source" must be one of: ${RULE_SOURCES.join(', ')}`);
  }
  if (typeof raw.addedAt === 'string' && !DATE_RE.test(raw.addedAt)) {
    errors.push(`"addedAt" must be YYYY-MM-DD (got "${raw.addedAt}")`);
  }
  if (typeof raw.measure === 'string' && !MEASURE_RE.test(raw.measure.trim())) {
    errors.push(
      `"measure" must be a check id like "rubric.id" or "pending:*" (got "${raw.measure}")`,
    );
  }

  for (const key of ['whyAr', 'observableAr', 'measure'] as const) {
    const v = raw[key];
    if (typeof v === 'string' && FORBIDDEN_VALUE_RE.test(v)) {
      errors.push(`"${key}" looks like reference material (paths/payloads are forbidden)`);
    }
  }

  if (errors.length > 0) return { errors };
  return { rule: raw as unknown as KnowledgeRule, errors: [] };
}

export interface HandbookValidation {
  rules?: KnowledgeRule[];
  errors: string[];
}

export function validateHandbook(value: unknown): HandbookValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { errors: ['handbook must be a plain object { version, rules }'] };
  }
  const raw = value as Record<string, unknown>;
  const errors: string[] = [];
  if (raw.version !== 1) errors.push(`"version" must be 1 (got ${JSON.stringify(raw.version)})`);
  if (!Array.isArray(raw.rules)) {
    errors.push('"rules" must be an array');
    return { errors };
  }

  const rules: KnowledgeRule[] = [];
  const seen = new Set<string>();
  raw.rules.forEach((entry: unknown, index: number) => {
    const { rule, errors: ruleErrors } = validateRule(entry);
    for (const e of ruleErrors) errors.push(`rules[${index}]: ${e}`);
    if (rule) {
      if (seen.has(rule.id)) errors.push(`rules[${index}]: duplicate id "${rule.id}"`);
      seen.add(rule.id);
      rules.push(rule);
    }
  });

  if (errors.length > 0) return { errors };
  return { rules, errors: [] };
}
