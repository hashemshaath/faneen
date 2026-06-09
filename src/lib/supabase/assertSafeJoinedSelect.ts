/**
 * Runtime guard for PostgREST embedded select strings.
 *
 * Background: a regression embedded `cities(id, name_ar, name_en, slug)` even
 * though `public.cities` has no `slug` column. PostgREST returned a 400 and
 * every `/:username` profile failed to load. This helper catches that class
 * of mistake before the request leaves the browser, by checking that each
 * embedded relation only references columns we've explicitly whitelisted —
 * including a hard deny-list for fields known to be reserved or missing
 * (e.g. `slug` on `cities`).
 *
 * In dev / test the helper THROWS to fail loud during local work and CI.
 * In production it `console.error`s with a structured reason so the same
 * alert pipeline that listens to profile-fetch errors can surface a spike
 * (the call still proceeds so we don't make the user-visible failure worse).
 */

export interface JoinedSchemaRule {
  /** Columns that are allowed inside this embedded relation. */
  allow: readonly string[];
  /**
   * Columns that are explicitly forbidden — typically because they do not
   * exist on the underlying table and have caused production 400s before.
   * Checked even when `allow` is permissive, so a future widened whitelist
   * can't silently re-introduce a known-bad column.
   */
  deny?: readonly string[];
}

export type JoinedSchema = Record<string, JoinedSchemaRule>;

/** Reserved / known-missing fields per relation. Keep this in sync with the
 * actual `public.cities` / `public.countries` table schemas. */
export const LOCATION_JOINED_SCHEMA: JoinedSchema = {
  cities: {
    allow: ['id', 'name_ar', 'name_en', 'country_id', 'is_active'],
    // These have all produced PostgREST 400s historically.
    deny: ['slug', 'code', 'country_code', 'region'],
  },
  countries: {
    allow: ['id', 'name_ar', 'name_en', 'code', 'iso_code', 'is_active'],
    deny: ['slug'],
  },
};

function extractEmbeds(select: string): Array<{ relation: string; cols: string[] }> {
  // Matches `relation(col1, col2, ...)` — does not recurse into nested embeds,
  // which is fine for our use case (location embeds are flat).
  const out: Array<{ relation: string; cols: string[] }> = [];
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\(([^()]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(select)) !== null) {
    const relation = m[1];
    const cols = m[2].split(',').map((c) => c.trim()).filter(Boolean);
    out.push({ relation, cols });
  }
  return out;
}

export interface SelectValidationIssue {
  relation: string;
  column: string;
  kind: 'unknown' | 'denied';
}

export function validateJoinedSelect(
  select: string,
  schema: JoinedSchema,
): SelectValidationIssue[] {
  const issues: SelectValidationIssue[] = [];
  for (const { relation, cols } of extractEmbeds(select)) {
    const rule = schema[relation];
    if (!rule) continue; // relation not governed — skip
    const allow = new Set(rule.allow);
    const deny = new Set(rule.deny ?? []);
    for (const col of cols) {
      if (deny.has(col)) {
        issues.push({ relation, column: col, kind: 'denied' });
      } else if (!allow.has(col)) {
        issues.push({ relation, column: col, kind: 'unknown' });
      }
    }
  }
  return issues;
}

function isDev(): boolean {
  try {
    // Vite — true in dev/test, false in prod builds.
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

/**
 * Validate `select` against `schema`. Throws in dev/test, logs in prod.
 * Returns the issues so callers can ship structured telemetry.
 */
export function assertSafeJoinedSelect(
  select: string,
  schema: JoinedSchema = LOCATION_JOINED_SCHEMA,
  context?: string,
): SelectValidationIssue[] {
  const issues = validateJoinedSelect(select, schema);
  if (issues.length === 0) return issues;
  const summary = issues
    .map((i) => `${i.relation}.${i.column} (${i.kind})`)
    .join(', ');
  const label = context ? `[safe-select:${context}]` : '[safe-select]';
  if (isDev()) {
    throw new Error(`${label} forbidden columns in embedded select: ${summary}`);
  }
  // eslint-disable-next-line no-console
  console.error(`${label} embedded select contains forbidden columns`, {
    select,
    issues,
  });
  return issues;
}
