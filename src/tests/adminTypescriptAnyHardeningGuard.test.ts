/**
 * ADMIN TYPESCRIPT ANY HARDENING GUARD (hard ceiling).
 *
 * Counts `any`-shaped occurrences inside admin scope and fails when a file
 * exceeds its current ceiling. Ceilings are per-file allow-list entries with
 * a justification and an expected count; they act as a debt ratchet — new
 * additions are blocked, removals must be reflected here (count goes down or
 * the entry disappears).
 *
 * Suppressions (`@ts-ignore`, `@ts-expect-error`) are unconditionally banned
 * across admin scope.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const ROOTS = [
  path.resolve(__dirname, '../pages/admin'),
  path.resolve(__dirname, '../components/admin'),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|ts)$/.test(e)) out.push(full);
  }
  return out;
}

const ANY_PATTERNS: ReadonlyArray<RegExp> = [
  /\bas any\b/g,
  /:\s*any\b/g,
  /<any>/g,
  /Record<string,\s*any>/g,
  /\bany\[\]/g,
];

function countAny(src: string): number {
  // Only strip block + line comments. Stripping string literals is unsafe
  // here because JSX/TSX bodies routinely contain unbalanced apostrophes
  // (`don't`, `it's`, etc.) which would consume large code spans.
  const cleaned = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  let n = 0;
  for (const re of ANY_PATTERNS) {
    const m = cleaned.match(re);
    if (m) n += m.length;
  }
  return n;
}

/**
 * Per-file ceilings. Reduce or remove entries as files are cleaned;
 * never raise a ceiling.
 */
interface Allow {
  file: string;
  max: number;
  reason: string;
  followUp: string;
}
const ALLOWLIST: ReadonlyArray<Allow> = [
  {
    file: 'src/pages/admin/AdminBusinesses.tsx',
    max: 40,
    reason:
      'Large legacy admin form: dynamic create/edit state, Supabase joined business+branches+images shape, CSV export.',
    followUp:
      'Extract typed CreateBusinessForm / EditBusinessForm and a BusinessRow type from listBusinesses; replace setForm((f: any) => ...) with React.SetStateAction.',
  },
  {
    file: 'src/pages/admin/AdminMemberships.tsx',
    max: 17,
    reason:
      'Plan/subscription join shape and dynamic limits JSON; PlanCard/SubCard props typed informally.',
    followUp:
      'Introduce MembershipPlanRow + MembershipSubscriptionRow from supabase types; type PlanCard/SubCard props.',
  },
  {
    file: 'src/pages/admin/AdminActivityLog.tsx',
    max: 4,
    reason:
      'Heterogeneous jsonb `details` payload per action type — narrowing per-action requires a discriminated union.',
    followUp:
      'Define ActivityLogDetails discriminated union keyed by `action`; type buildDetailItems / buildSummary.',
  },
  {
    file: 'src/pages/admin/AdminProviderAnalytics.tsx',
    max: 6,
    reason:
      'Reads ad-hoc event rows + joined business shape used only for analytics aggregation.',
    followUp:
      'Introduce ProviderAnalyticsEvent and ProviderBusinessLite row types.',
  },
  {
    file: 'src/pages/admin/AdminMembershipRejections.tsx',
    max: 2,
    reason:
      'Single `applyFilters(q: any): any` wraps a Supabase query builder whose generic chain is non-trivial to type.',
    followUp:
      'Type with PostgrestFilterBuilder<...> generics or move filtering into a typed helper.',
  },
];

const ALLOWLISTED_FILES = new Set(
  ALLOWLIST.map((a) => path.resolve(__dirname, '../..', a.file)),
);

describe('ADMIN TYPESCRIPT ANY HARDENING GUARD', () => {
  const adminFiles = ROOTS.flatMap(walk);

  it.each(ALLOWLIST)(
    '$file is at or under its any-ceiling ($max)',
    ({ file, max }) => {
      const full = path.resolve(__dirname, '../..', file);
      const n = countAny(readFileSync(full, 'utf8'));
      // Ceiling is hard upper bound; if you cleaned the file, lower `max` here.
      expect(
        n,
        `${file}: any-count ${n} exceeds ceiling ${max}. Either clean the new occurrence or lower the ceiling.`,
      ).toBeLessThanOrEqual(max);
    },
  );

  it('no admin file outside the allowlist may contain `any`-shaped types', () => {
    const offenders: string[] = [];
    for (const f of adminFiles) {
      if (ALLOWLISTED_FILES.has(f)) continue;
      const n = countAny(readFileSync(f, 'utf8'));
      if (n > 0) {
        offenders.push(`${path.relative(path.resolve(__dirname, '../..'), f)} (${n})`);
      }
    }
    expect(
      offenders,
      `Add an allowlist entry with a justification, or remove the any usage:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('admin scope contains no @ts-ignore / @ts-expect-error suppressions', () => {
    const offenders: string[] = [];
    for (const f of adminFiles) {
      const src = readFileSync(f, 'utf8');
      if (/@ts-ignore|@ts-expect-error/.test(src)) {
        offenders.push(path.relative(path.resolve(__dirname, '../..'), f));
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('allowlist entries each carry a reason and a follow-up plan', () => {
    for (const a of ALLOWLIST) {
      expect(a.reason.length, `${a.file}: reason required`).toBeGreaterThan(20);
      expect(a.followUp.length, `${a.file}: followUp required`).toBeGreaterThan(20);
    }
  });
});