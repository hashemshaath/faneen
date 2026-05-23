import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

/**
 * P-20 — Admin businesses full-list / single-row read migration.
 * Each migrated file must:
 *  - no longer call supabase.from('businesses') for the migrated read
 *  - import + invoke the canonical wrapper(s)
 *  - preserve select / orderBy / filters / query keys verbatim
 */

describe('P-20 admin businesses read migration', () => {
  it('AdminBusinesses uses listAdminBusinesses with select(*) + created_at desc; no direct businesses read', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/listAdminBusinesses<Database\['public'\]\['Tables'\]\['businesses'\]\['Row'\]>\(\{/);
    expect(src).toContain("select: '*'");
    expect(src).toContain("orderBy: { column: 'created_at', ascending: false }");
    expect(src).toContain("queryKey: ['admin-businesses']");
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)\.select/);
  });

  it('AdminUsers uses listAdminBusinesses for admin-businesses-map with exact select', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toContain("queryKey: ['admin-businesses-map']");
    expect(src).toMatch(/listAdminBusinesses<BusinessInfo>\(/);
    expect(src).toContain(
      "select: 'id, user_id, name_ar, name_en, ref_id, username, is_active, is_verified, membership_tier, business_number'",
    );
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('AdminProviderReview uses listAdminBusinesses with 2 orderBy + limit(200) + conditional eq filter', () => {
    const src = read('src/pages/admin/AdminProviderReview.tsx');
    expect(src).toMatch(/listAdminBusinesses\(/);
    expect(src).toContain("queryKey: ['admin-provider-review', statusFilter]");
    expect(src).toContain("{ column: 'submitted_at', ascending: false, nullsFirst: false }");
    expect(src).toContain("{ column: 'created_at', ascending: false }");
    expect(src).toContain('limit: 200');
    expect(src).toContain("filters.push({ column: 'approval_status', op: 'eq', value: statusFilter })");
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('AdminMemberships migrates both businesses reads (by ids + all tiers)', () => {
    const src = read('src/pages/admin/AdminMemberships.tsx');
    expect(src).toContain('ids: businessIds');
    expect(src).toMatch(/listBusinessesByIds<\{/);
    expect(src).toContain("select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active'");
    expect(src).toContain("queryKey: ['admin-all-businesses-tiers']");
    expect(src).toMatch(/listAdminBusinesses<\{/);
    expect(src).toContain(
      "select: 'id, name_ar, name_en, membership_tier, logo_url, is_verified, is_active, username, rating_avg, rating_count, created_at'",
    );
    expect(src).toContain("orderBy: { column: 'membership_tier', ascending: false }");
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('AdminPrivateSectors uses listBusinessesByIds and no longer imports supabase', () => {
    const src = read('src/pages/admin/AdminPrivateSectors.tsx');
    expect(src).toMatch(/listBusinessesByIds</);
    expect(src).toContain("select: 'id, name_ar, name_en, ref_id'");
    expect(src).toContain('ids: businessIds');
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('AdminCategories uses listAdminBusinesses for category_id aggregation', () => {
    const src = read('src/pages/admin/AdminCategories.tsx');
    expect(src).toContain("queryKey: ['admin-category-business-counts']");
    expect(src).toMatch(/listAdminBusinesses<\{ category_id: string \| null \}>\(/);
    expect(src).toContain("select: 'category_id'");
    expect(src).not.toMatch(/supabase\.from\(['"]businesses['"]\)/);
  });

  it('AdminClientSitesMonitoring uses listBusinessesByIds with exact select', () => {
    const src = read('src/pages/admin/AdminClientSitesMonitoring.tsx');
    expect(src).toMatch(/listBusinessesByIds</);
    expect(src).toContain("select: 'id, logo_url, name_ar, name_en, username'");
    expect(src).toContain('ids: businessIds');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('AdminBusinessServiceAreas uses listAdminBusinesses with name_ar order + limit(1000)', () => {
    const src = read('src/pages/admin/locations/AdminBusinessServiceAreas.tsx');
    expect(src).toMatch(/listAdminBusinesses</);
    expect(src).toContain("select: 'id, name_ar, ref_id'");
    expect(src).toContain("orderBy: { column: 'name_ar' }");
    expect(src).toContain('limit: 1000');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]businesses['"]\)/);
  });

  it('AdminBusinessCoordinates uses listAdminBusinesses (read) and no longer imports supabase', () => {
    const src = read('src/pages/admin/locations/AdminBusinessCoordinates.tsx');
    expect(src).toMatch(/listAdminBusinesses<BizRow>\(/);
    expect(src).toContain("select: 'id, name_ar, ref_id, latitude, longitude, region, district, address'");
    expect(src).toContain("orderBy: { column: 'name_ar' }");
    expect(src).toContain('limit: 1000');
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('AdminClientBusinessCard uses getAdminBusinessById with maybeSingle (default)', () => {
    const src = read('src/components/admin/client-sites/AdminClientBusinessCard.tsx');
    expect(src).toMatch(/getAdminBusinessById<BusinessLite>\(/);
    expect(src).toContain('id: businessId');
    expect(src).toContain("select: 'id, ref_id, username, name_ar, name_en, logo_url, website'");
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
});

describe('P-20 intentionally-deferred businesses reads', () => {
  it('business_staff reads via listManagedBusinessesForUser remain canonical (P-24)', () => {
    const src = read('src/modules/businesses/services/listManagedBusinessesForUser.ts');
    expect(src).toMatch(/supabase\.from\(['"]business_staff['"]\)/);
  });

  it('P-12 write services (updateBusinessById / updateBusinessesByIds) remain in use by AdminBusinesses', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toContain('updateBusinessById');
    expect(src).toContain('updateBusinessesByIds');
  });
});