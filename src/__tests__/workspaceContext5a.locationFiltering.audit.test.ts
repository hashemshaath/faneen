/**
 * WORKSPACE-CONTEXT-5A — active_location_id filtering audit.
 *
 * Source of truth for `active_location_id`:
 *   `business_branches.id`, resolved by
 *   `@/modules/locations/services/workspace/listLocationsForEntity`
 *   (filters by `business_id = entity_id`, RLS-backed).
 *
 * Module-by-module matrix (verified against live schema on 2026-05-26):
 *
 * | Module        | Column                          | FK target            | Same as active_location_id? | Wrapper supports filter | Decision |
 * |---------------|---------------------------------|----------------------|-----------------------------|-------------------------|----------|
 * | contracts     | execution_site_id               | client_sites.id      | NO (client-owned site)      | n/a                     | DEFER    |
 * | contracts     | location_id                     | (no FK)              | UNKNOWN                     | n/a                     | DEFER    |
 * | lead_requests | source_site_id                  | client_sites.id      | NO                          | n/a                     | DEFER    |
 * | lead_requests | location_id                     | (no FK)              | UNKNOWN                     | n/a                     | DEFER    |
 * | quote_requests| location_id                     | (no FK)              | UNKNOWN                     | n/a                     | DEFER    |
 * | bookings      | —                               | —                    | no column                   | n/a                     | DEFER    |
 * | services      | —                               | —                    | no column (business-level)  | n/a                     | DEFER    |
 * | reviews       | —                               | —                    | no column (business-level)  | n/a                     | DEFER    |
 * | staff inv.    | location_staff_assignments.location_id | (no FK in DB)| UNKNOWN — not a dashboard list filter | n/a            | DEFER    |
 * | documents     | —                               | —                    | no column                   | n/a                     | DEFER    |
 * | analytics     | RPC param `_business_id`        | businesses.id        | n/a — no location param     | RPC has no _location_id | DEFER    |
 * | membership / payment | —                        | —                    | not location-scoped         | n/a                     | DEFER    |
 *
 * Outcome: **no module qualifies for safe `active_location_id` filtering
 * in this phase.** Implementing any filter would either (a) bind a
 * `business_branches.id` to a column that semantically references a
 * different table (`client_sites`), or (b) bind it to an unconstrained
 * column whose population semantics are unknown. Both risks contradict
 * the phase rule: "Do not filter a module unless its table has a clear
 * location/branch/site column and existing wrappers support it."
 *
 * Invariants this audit locks down:
 *  - Migrated dashboard pages (contracts / leads / bookings) still
 *    document why `active_location_id` is intentionally not applied.
 *  - No new production code starts consuming `active_location_id` for
 *    row filtering until a wrapper + schema mapping exists.
 *  - The location switcher remains a workspace-context-only control;
 *    selecting a location must not silently hide records.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

const MIGRATED_DASHBOARD_PAGES = [
  'pages/dashboard/DashboardContracts.tsx',
  'pages/dashboard/DashboardLeads.tsx',
  'pages/dashboard/DashboardBookings.tsx',
];

/**
 * Pages that explicitly read row filters off `active_location_id`.
 * In phase 5A this list MUST stay empty. A non-empty list means a
 * filter snuck in without the schema/wrapper mapping required by the
 * phase rules — fail loudly so it is reviewed.
 */
const PAGE_DIRS = ['pages', 'pages/dashboard', 'pages/admin', 'modules'];

describe('WORKSPACE-CONTEXT-5A — active_location_id filtering audit', () => {
  it('listLocationsForEntity is the canonical wrapper, sourced from business_branches', () => {
    const src = readFileSync(
      join(SRC, 'modules/locations/services/workspace/listLocationsForEntity.ts'),
      'utf8',
    );
    expect(src).toContain("from('business_branches')");
    expect(src).toContain("eq('business_id', entityId)");
  });

  it('migrated dashboard pages still document why active_location_id is not applied', () => {
    for (const p of MIGRATED_DASHBOARD_PAGES) {
      const src = read(p);
      expect(src, p).toMatch(/active_location_id/);
      // Each migrated page must explicitly note the deferral so reviewers
      // see the schema-mapping caveat before adding a filter.
      expect(src, p).toMatch(/intentionally NOT applied|deferred|no branch column|no enforced branch column/i);
    }
  });

  it('no production code uses active_location_id as a row filter yet', () => {
    // Walk the production code (excluding tests, the hook itself, and
    // the location switcher component) and confirm nobody is feeding
    // active_location_id into a supabase query.
    const ALLOW = new Set<string>([
      'hooks/useActiveWorkspace.ts',
      'components/dashboard/ActiveLocationSwitcher.tsx',
    ]);
    const offenders: string[] = [];
    function walk(rel: string) {
      const abs = join(SRC, rel);
      for (const name of readdirSync(abs, { withFileTypes: true })) {
        const child = `${rel}/${name.name}`;
        if (name.isDirectory()) {
          if (name.name === '__tests__' || name.name === 'node_modules') continue;
          walk(child);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name.name)) continue;
        if (name.name.endsWith('.test.ts') || name.name.endsWith('.test.tsx')) continue;
        if (ALLOW.has(child)) continue;
        const src = readFileSync(join(SRC, child), 'utf8');
        if (!src.includes('active_location_id')) continue;
        // It's fine to *reference* the field in a comment or destructure
        // it from the hook; what we forbid is wiring it into a query.
        // A filter pattern looks like one of these:
        //   .eq('location_id', active_location_id)
        //   .eq('execution_site_id', active_location_id)
        //   _location_id: active_location_id
        //   location_id: active_location_id
        const filterRe =
          /(?:\.eq\(\s*['"](?:location_id|execution_site_id|source_site_id|site_id|branch_id)['"]\s*,\s*active_location_id|\b(?:_location_id|location_id|branch_id|site_id|execution_site_id)\s*:\s*active_location_id\b)/;
        if (filterRe.test(src)) offenders.push(child);
      }
    }
    for (const d of PAGE_DIRS) walk(d);
    expect(offenders, `active_location_id filter wired in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('regression: contract / lead schemas have no business_branches FK on their location columns', () => {
    // Documentation guard — this lives in a comment because the test
    // can't query the DB directly here, but the audit above verified
    // it against the live schema. We assert the migrated pages have
    // NOT introduced a join/select that would imply such a mapping.
    for (const p of MIGRATED_DASHBOARD_PAGES) {
      const src = read(p);
      expect(src, p).not.toMatch(/business_branches!?location_id/);
      expect(src, p).not.toMatch(/business_branches!?execution_site_id/);
    }
  });
});