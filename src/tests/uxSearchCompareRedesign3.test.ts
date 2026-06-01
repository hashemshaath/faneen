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
    // No bare `*` parent select on businesses, and no PII columns inside the
    // curated select literals (comments are allowed to mention them).
    const selectLiterals = src.match(/select:\s*\n?\s*'[^']*'(\s*\+\s*\n?\s*'[^']*')*/g) || [];
    expect(selectLiterals.length).toBeGreaterThan(0);
    const joined = selectLiterals.join(' ');
    for (const pii of ['email', 'national_id', 'vat_number', 'cr_document', 'account_manager', 'phone']) {
      expect(joined.includes(pii), `Compare select must not include PII column ${pii}`).toBe(false);
    }
    expect(joined).not.toMatch(/select:\s*'\*'/);
  });

  it('preserves the SERVICE-ACTIVATION triple-gate on embedded services', () => {
    expect(src).toContain("['business_services.is_active', true]");
    expect(src).toContain("['business_services.provider_status', 'active']");
    expect(src).toContain("['business_services.admin_status', 'allowed']");
  });

  it('does not display raw membership enum (uses localized label helper)', () => {
    expect(src).toContain('getMembershipTierLabel(b.membership_tier');
  });

  it('empty state explains the 3-step comparison flow', () => {
    expect(src).toContain('ابحث وصفِّ النتائج');
    expect(src).toContain('أضف للمقارنة');
    expect(src).toContain('قرّر وتواصل');
  });

  it('single-provider state surfaces the add-second-provider hint', () => {
    expect(src).toContain('أضف جهة ثانية للمقارنة');
    expect(src).toContain('selectedBusinesses.length === 1');
  });

  it('mobile users get a horizontal-scroll affordance for the table', () => {
    expect(src).toMatch(/md:hidden[\s\S]{0,160}اسحب أفقياً/);
  });
});

describe('UX-REDESIGN-3 — Search header hero CTAs', () => {
  const src = read('src/components/search/SearchHeader.tsx');

  it('exposes a primary quote CTA and sectors CTA in the hero', () => {
    expect(src).toContain('to="/contact"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('اطلب عرض سعر');
    expect(src).toContain('استكشف القطاعات');
  });

  it('renders the filter-then-compare helper line', () => {
    expect(src).toContain('استخدم الفلاتر لتقريب النتائج، ثم قارن قبل التواصل.');
  });

  it('hero CTAs never link to private/admin/auth routes', () => {
    for (const re of [/to=["']\/dashboard/, /to=["']\/admin/, /to=["']\/auth/, /to=["']\/onboarding/]) {
      expect(src).not.toMatch(re);
    }
  });
});