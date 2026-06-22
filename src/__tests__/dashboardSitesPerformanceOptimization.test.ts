/**
 * DASHBOARD SITES PERFORMANCE + LAZY LOADING — source-level guards.
 *
 * Locks in the N+1 fix and lazy-loading wiring:
 *  - project / contract counts come from a SINGLE batched IN-query each.
 *  - secondary queries are gated by `enabled: siteIds.length > 0`.
 *  - both count queries share a memoized `siteIds` key.
 *  - the page is lazy-imported from App.tsx.
 *  - no per-site loops, no service_role, no `any`, no hex.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(resolve('src/pages/dashboard/DashboardSites.tsx'), 'utf8');
const APP  = readFileSync(resolve('src/App.tsx'), 'utf8');

describe('DashboardSites — performance guards', () => {
  it('contract counts use a single batched IN query', () => {
    expect(PAGE).toMatch(/\.from\('contracts'\)\s*\n?\s*\.select\('execution_site_id'\)\s*\n?\s*\.in\('execution_site_id',\s*siteIds\)/);
  });

  it('project counts use a single batched IN query', () => {
    expect(PAGE).toMatch(/\.from\('projects'\)\s*\n?\s*\.select\('site_id'\)\s*\n?\s*\.in\('site_id',\s*siteIds\)/);
  });

  it('exposes a memoized siteIds + siteIdsKey', () => {
    expect(PAGE).toMatch(/const\s+siteIds\s*=\s*useMemo\(\(\)\s*=>\s*sites\.map\(/);
    expect(PAGE).toMatch(/const\s+siteIdsKey\s*=\s*useMemo\(/);
  });

  it('both count queries are gated by siteIds.length', () => {
    const enables = PAGE.match(/enabled:\s*siteIds\.length\s*>\s*0/g) ?? [];
    expect(enables.length).toBeGreaterThanOrEqual(2);
  });

  it('both count queries set a staleTime (cache reuse across mounts)', () => {
    const stales = PAGE.match(/staleTime:\s*60_000/g) ?? [];
    expect(stales.length).toBeGreaterThanOrEqual(2);
  });

  it('site list and counts queries are memoized (KPI + filtered)', () => {
    expect(PAGE).toMatch(/const\s+stats\s*=\s*useMemo\(/);
    expect(PAGE).toMatch(/const\s+filtered\s*=\s*useMemo\(/);
  });

  it('no per-site loop creates a per-site query (no N+1)', () => {
    // A per-site useQuery would imply something like sites.map(s => useQuery(...))
    // which is illegal but also catches the wrong-shape pattern.
    expect(PAGE).not.toMatch(/sites\.map\([^)]*useQuery/);
  });

  it('page is lazy-imported in App.tsx', () => {
    expect(APP).toMatch(/lazyRetry\(\(\) => import\("\.\/pages\/dashboard\/DashboardSites"\)\)/);
  });

  it('still queries client_sites (and not projects) for the cards', () => {
    expect(PAGE).toMatch(/\.from\('client_sites'\)/);
    expect(PAGE).not.toMatch(/\.from\('projects'\)[\s\S]{0,200}as\s+ClientSite/);
  });

  it('no service_role / no hex / no any / no ts-ignore', () => {
    expect(PAGE).not.toMatch(/service_role/i);
    expect(PAGE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/@ts-ignore/);
  });
});