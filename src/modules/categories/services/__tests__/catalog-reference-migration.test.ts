import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Regression lock for P-2: catalog reference (categories/cities) services.
 * Every migrated callsite must:
 *   - no longer call supabase.from('categories' | 'cities') directly
 *   - import the canonical service(s) from @/modules/categories or @/modules/locations
 *   - preserve its React Query key
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');
// Deleted callsites trivially satisfy the "no direct supabase.from" guard.
const readIfExists = (p: string): string | null =>
  existsSync(resolve(process.cwd(), p)) ? read(p) : null;

// Phase 16 — `listActiveCategories` was deleted (zero runtime callers).
// ProjectDetail.tsx was previously migrated to taxonomy-only display and
// no longer calls `getCategoryById` from the runtime path. The per-file
// migration list is now empty; the static guarantees below still apply.
const CATEGORIES_MIGRATED: Array<{ path: string; service: string; key: string }> = [];

const CITIES_MIGRATED: Array<{ path: string; service: string; key: string }> = [
  { path: 'src/components/home/HeroSection.tsx', service: 'listActiveCities', key: "['nav-cities']" },
  { path: 'src/pages/Projects.tsx', service: 'listActiveCities', key: "['cities']" },
  // BrandsCatalog.tsx no longer references cities (sectors-only catalog).
  { path: 'src/pages/ProjectDetail.tsx', service: 'getCityById', key: "['city', project?.city_id]" },
  { path: 'src/services/search/useSearch.ts', service: 'listActiveCities', key: "['cities']" },
  { path: 'src/features/private-sectors/PrivateSectorForm.tsx', service: 'listActiveCities', key: "['cities-active']" },
  { path: 'src/pages/dashboard/DashboardProjects.tsx', service: 'listActiveCities', key: "['cities-list']" },
  { path: 'src/pages/admin/AdminBusinesses.tsx', service: 'listActiveCities', key: "['cities']" },
];

describe('P-2 categories reference migration', () => {
  it('legacy listActiveCategories wrapper was deleted in Phase 16', () => {
    expect(existsSync(resolve(process.cwd(), 'src/modules/categories/services/listActiveCategories.ts'))).toBe(false);
  });
  for (const { path, service, key } of CATEGORIES_MIGRATED) {
    it(`${path} no longer calls supabase.from('categories')`, () => {
      const src = readIfExists(path);
      if (src === null) return;
      expect(src).not.toMatch(/supabase\.from\(['"]categories['"]\)/);
      expect(src).toContain(service);
      expect(src).toContain(key);
    });
  }
});

describe('P-2 cities reference migration', () => {
  for (const { path, service, key } of CITIES_MIGRATED) {
    it(`${path} no longer calls supabase.from('cities')`, () => {
      const src = readIfExists(path);
      if (src === null) return;
      expect(src).not.toMatch(/supabase\.from\(['"]cities['"]\)/);
      expect(src).toContain(service);
      expect(src).toContain(key);
    });
  }
});

describe('P-2 out-of-scope guardrail (must NOT be touched)', () => {
  // Owner-business dashboard reads, profiles, business_staff, projects CRUD,
  // and admin CRUD beyond simple dropdowns must remain as-is for P-2.
  // NOTE: Compare.tsx and ContractDetail.tsx business reads were intentionally
  // migrated in P-3 (public business reads). Their P-3 regression locks live in
  // src/modules/businesses/services/__tests__/businessReads.test.ts.
  // NOTE: ContractDetail.tsx profiles reads were migrated in P-5
  // (getProfileForContractParty). Their regression lock lives in
  // src/modules/users/services/__tests__/profileReads.test.ts.
  it('DashboardBusinessEdit cities read was migrated off direct supabase.from in a later phase', () => {
    // The original P-2 guardrail asserted this read remained direct. It
    // was subsequently migrated; we now lock the migrated state so the
    // file does not regress to a direct table read.
    const src = read('src/pages/dashboard/DashboardBusinessEdit.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]cities['"]\)/);
  });
  it('AdminCategories legacy CRUD page was deleted in Phase 16', () => {
    // The legacy admin categories CRUD page is gone; the official taxonomy
    // center under /admin/taxonomy is the source of truth now.
    expect(existsSync(resolve(process.cwd(), 'src/pages/admin/AdminCategories.tsx'))).toBe(false);
  });
});