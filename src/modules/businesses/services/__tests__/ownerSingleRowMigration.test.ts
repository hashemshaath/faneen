import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

/**
 * P-17 — Owner single-row businesses read migration.
 *
 * Each target file must:
 *  - no longer contain `from('businesses')...eq('user_id', ...)...maybeSingle` directly
 *  - import + invoke getOwnerBusiness
 *  - preserve its exact select string
 *  - preserve its React Query key
 *  - preserve its `enabled` predicate (where present)
 */

type Migrated = {
  path: string;
  select: string;
  queryKey: string;
  enabled?: string;
  staleTime?: string;
};

const MIGRATED: Migrated[] = [
  {
    path: 'src/hooks/useProviderReadiness.ts',
    select:
      "'id, name_ar, username, logo_url, description_ar, short_description_ar, category_id, city_id, phone, mobile, email, address, approval_status, approval_notes, onboarding_completion, username_status, is_active'",
    queryKey: "['provider-readiness', userId]",
    enabled: '!!userId',
  },
  {
    path: 'src/pages/dashboard/DashboardCommunicationPreferences.tsx',
    select: '"id, name_ar, name_en"',
    queryKey: '["my-primary-business", user?.id]',
    enabled: '!!user?.id',
  },
  {
    path: 'src/pages/dashboard/DashboardBusinessEdit.tsx',
    select: "'*'",
    queryKey: "['business-edit', user?.id]",
    enabled: '!!user',
  },
  {
    path: 'src/pages/dashboard/DashboardBusinessDraft.tsx',
    select:
      "'id, ref_id, approval_status, name_ar, name_en, short_description_ar, description_ar, phone, mobile, email, address, region, national_id, unified_number'",
    queryKey: "['business-draft-form', user?.id]",
    enabled: '!!user',
    staleTime: '15_000',
  },
  {
    path: 'src/pages/dashboard/DashboardBusinessCompletion.tsx',
    select:
      // Select was extended to include `username` and `updated_at` to
      // power the page header chip + last-updated indicator.
      "'id, ref_id, username, approval_status, onboarding_completion, approval_notes, name_ar, name_en, logo_url, description_ar, short_description_ar, phone, mobile, email, city_id, region, address, latitude, longitude, sectors, sub_services, national_id, unified_number, updated_at'",
    queryKey: "['business-completion', user?.id]",
    enabled: '!!user',
    staleTime: '30_000',
  },
  {
    path: 'src/pages/dashboard/DashboardPromotions.tsx',
    select: "'id, username, name_ar, name_en'",
    queryKey: "['my-business-info', user?.id]",
    enabled: '!!user',
  },
  {
    path: 'src/pages/dashboard/DashboardShowcase.tsx',
    select: '"id, name_ar, name_en, is_verified, is_active"',
    queryKey: '["showcase-business", user?.id]',
    enabled: '!!user?.id',
  },
];

describe('P-17 owner single-row read migration', () => {
  for (const m of MIGRATED) {
    it(`${m.path} routes owner single-row read through getOwnerBusiness`, () => {
      const src = read(m.path);
      // No direct owner single-row read remains.
      expect(src).not.toMatch(
        /supabase\s*\.\s*from\(['"]businesses['"]\)[\s\S]*?eq\(['"]user_id['"][\s\S]*?maybeSingle/,
      );
      // Wrapper imported + invoked.
      expect(src).toMatch(/getOwnerBusiness/);
      // Select preserved verbatim.
      expect(src).toContain(m.select);
      // React Query key preserved.
      expect(src).toContain(m.queryKey);
      if (m.enabled) expect(src).toContain(`enabled: ${m.enabled}`);
      if (m.staleTime) expect(src).toContain(`staleTime: ${m.staleTime}`);
    });
  }
});

describe('P-17 intentionally-deferred callsites (post-P-18)', () => {
  it('listManagedBusinessesForUser remains the canonical staff+owner aggregator (P-24)', () => {
    const src = read('src/modules/businesses/services/listManagedBusinessesForUser.ts');
    expect(src).toMatch(/supabase\.from\(['"]businesses['"]\)/);
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });
});