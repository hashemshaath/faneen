import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

/**
 * R4B — Public read wrappers for businesses_public.
 *
 * Each wrapper must preserve verbatim select/filter/order/limit so callsite
 * behavior is identical to the inlined query it replaces.
 */
describe('R4B public read wrappers preserve verbatim query shape', () => {
  it('listTopPublicProviders: exact select + is_active + rating_count>0 + order + default limit 8', () => {
    const src = read('src/modules/businesses/services/public/listTopPublicProviders.ts');
    expect(src).toContain("from('businesses_public')");
    expect(src).toContain(
      'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, membership_tier, is_verified, category_id, categories(name_ar, name_en), cities(name_ar, name_en)',
    );
    expect(src).toContain(".eq('is_active', true)");
    expect(src).toContain(".gt('rating_count', 0)");
    expect(src).toContain(".order('rating_avg', { ascending: false })");
    expect(src).toContain('limit = 8');
    expect(src).toContain('return (data ?? [])');
  });

  it('listPublicBusinessesByCategory: exact select + category_id filter + order + default limit 50', () => {
    const src = read('src/modules/businesses/services/public/listPublicBusinessesByCategory.ts');
    expect(src).toContain("from('businesses_public')");
    expect(src).toContain(
      'id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, cities(name_ar, name_en)',
    );
    expect(src).toContain(".eq('category_id', categoryId)");
    expect(src).toContain(".order('rating_avg', { ascending: false })");
    expect(src).toContain('limit = 50');
  });

  it('getPublicBusinessForVerify: exact select + username filter + maybeSingle terminal', () => {
    const src = read('src/modules/businesses/services/public/getPublicBusinessForVerify.ts');
    expect(src).toContain("from('businesses_public')");
    expect(src).toContain(
      'id, username, name_ar, name_en, short_description_ar, short_description_en, logo_url, is_verified, is_active, ref_id, business_number, membership_tier, city_id, region, rating_avg, rating_count, created_at',
    );
    expect(src).toContain(".eq('username', username)");
    expect(src).toContain('.maybeSingle()');
    // PII: must not select owner email/phone/user_id.
    expect(src).not.toMatch(/\buser_id\b/);
    expect(src).not.toMatch(/\bphone\b/);
    expect(src).not.toMatch(/\bemail\b/);
  });

  it('listPublicProvidersForAnalytics: exact select, in() filter, early-return on empty ids', () => {
    const src = read('src/modules/businesses/services/public/listPublicProvidersForAnalytics.ts');
    expect(src).toContain("from('businesses_public')");
    expect(src).toContain(
      'id, name_ar, name_en, username, logo_url, rating_avg, rating_count, membership_tier, is_verified',
    );
    expect(src).toContain(".in('id', ids)");
    expect(src).toContain('if (!ids.length) return []');
    expect(src).not.toMatch(/\buser_id\b/);
    expect(src).not.toMatch(/\bphone\b/);
    expect(src).not.toMatch(/\bemail\b/);
  });
});

describe('R4B callsites delegate to wrappers (no direct businesses_public reads)', () => {
  it('TopProvidersSection uses listTopPublicProviders and no direct supabase.from', () => {
    const src = read('src/components/home/TopProvidersSection.tsx');
    expect(src).toContain('listTopPublicProviders');
    expect(src).not.toMatch(/supabase\s*\n?\s*\.from\(\s*["']businesses_public["']\s*\)/);
  });

  it('Categories uses listPublicBusinessesByCategory and no direct businesses_public read', () => {
    const src = read('src/pages/Categories.tsx');
    expect(src).toContain('listPublicBusinessesByCategory');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses_public['"]\)/);
  });

  it('VerifyBusiness uses getPublicBusinessForVerify and no direct businesses_public read', () => {
    const src = read('src/pages/VerifyBusiness.tsx');
    expect(src).toContain('getPublicBusinessForVerify');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses_public['"]\)/);
  });

  it('AdminProviderAnalytics uses listPublicProvidersForAnalytics and no direct businesses_public read', () => {
    const src = read('src/pages/admin/AdminProviderAnalytics.tsx');
    expect(src).toContain('listPublicProvidersForAnalytics');
    expect(src).not.toMatch(/supabase\.from\(['"]businesses_public['"]\)/);
  });
});