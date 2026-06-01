import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-3 — Search & Compare public invariants.
 * Locks the empty/no-result CTA upgrades and the trust disclaimers
 * against regressions while preserving SEO-1..SEO-10A guarantees and
 * the PERF-1D public column allow-lists.
 */
describe('UX-REDESIGN-3 — Search empty/no-result states', () => {
  const src = read('src/components/search/SearchResults.tsx');

  it('directory-empty state links only to public-safe routes', () => {
    expect(src).toContain('href="/for-providers"');
    expect(src).toContain('href="/sectors"');
  });

  it('directory-empty state no longer links to dashboard/auth', () => {
    expect(src).not.toContain('href="/dashboard"');
    expect(src).not.toContain('href="/auth"');
    expect(src).not.toMatch(/href=["']\/admin/);
  });

  it('no-results state surfaces a quote/help CTA and a sectors link', () => {
    expect(src).toContain('href="/contact"');
    // Arabic helper copy mandated by UX-REDESIGN-3 brief.
    expect(src).toContain('لم نجد نتائج مطابقة');
    expect(src).toContain('جرّب توسيع المدينة أو القطاع');
  });

  it('no guarantee/PDPL/pricing claims leak into search empty states', () => {
    for (const banned of ['نضمن', 'تواصل مباشر مضمون', 'PDPL', 'أفضل سعر']) {
      expect(src.includes(banned), `search empty state leaks: ${banned}`).toBe(false);
    }
  });
});

describe('UX-REDESIGN-3 — Compare empty/result states', () => {
  const src = read('src/pages/Compare.tsx');

  it('preserves the noindex policy for compare query pages', () => {
    expect(src).toMatch(/noindex:\s*selectedIds\.length\s*>\s*0/);
  });

  it('empty state guides to /search and /sectors with the mandated copy', () => {
    expect(src).toContain('to="/search"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('أضف جهتين أو أكثر للمقارنة');
  });

  it('renders the comparison disclaimer (no execution guarantee)', () => {
    expect(src).toContain('لا تضمن نتائج التنفيذ');
    expect(src).toContain('does not guarantee execution');
  });

  it('post-table CTA strip exposes only public-safe routes', () => {
    expect(src).toContain('to="/contact"');
    expect(src).not.toMatch(/to=["']\/dashboard/);
    expect(src).not.toMatch(/to=["']\/admin/);
    expect(src).not.toMatch(/to=["']\/auth/);
    expect(src).not.toMatch(/to=["']\/onboarding/);
  });

  it('preserves the PERF-1D.2 explicit public column allow-list (no PII)', () => {
    // Sentinel: the curated select string must remain — never replaced with `*`.
    expect(src).toContain("'id, username, name_ar, name_en, logo_url, '");
    for (const pii of ['email', 'national_id', 'vat_number', 'cr_document', 'account_manager']) {
      expect(src.includes(pii), `Compare must not select PII column ${pii}`).toBe(false);
    }
  });

  it('preserves the SERVICE-ACTIVATION triple-gate on embedded services', () => {
    expect(src).toContain("['business_services.is_active', true]");
    expect(src).toContain("['business_services.provider_status', 'active']");
    expect(src).toContain("['business_services.admin_status', 'allowed']");
  });

  it('does not display raw membership enum (uses localized label helper)', () => {
    expect(src).toContain('getMembershipTierLabel(b.membership_tier');
  });
});