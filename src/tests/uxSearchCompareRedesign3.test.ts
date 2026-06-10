import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-3 — Search & Compare public invariants (Search V3 era).
 * Locks the public-route allow-list and trust disclaimers across the
 * rebuilt /search page (Search V3) and the /compare page, while
 * preserving SEO-1..SEO-10A guarantees and the PERF-1D public column
 * allow-list.
 */
const v3Dir = 'src/components/search/v3';
const v3Sources = readdirSync(join(process.cwd(), v3Dir))
  .filter((n) => n.endsWith('.tsx') || n.endsWith('.ts'))
  .map((n) => ({ path: join(v3Dir, n), src: read(join(v3Dir, n)) }));
const searchPage = read('src/pages/SearchV3.tsx');
const allSearchSources = [{ path: 'src/pages/SearchV3.tsx', src: searchPage }, ...v3Sources];

describe('UX-REDESIGN-3 — Search V3 empty/no-result + public-route invariants', () => {
  it('Search V3 never links into private/admin/auth/onboarding routes', () => {
    for (const { path, src } of allSearchSources) {
      for (const re of [
        /["']\/dashboard(?:\/|["'])/,
        /["']\/admin(?:\/|["'])/,
        /["']\/auth(?:["'?])/,
        /["']\/onboarding(?:\/|["'])/,
      ]) {
        expect(re.test(src), `${path} links to a private route via ${re}`).toBe(false);
      }
    }
  });

  it('Search V3 empty-state exposes a bilingual "no results" message', () => {
    const empty = v3Sources.find((s) => s.path.endsWith('SearchEmptyStateV3.tsx'));
    expect(empty, 'SearchEmptyStateV3.tsx').toBeDefined();
    expect(empty!.src).toContain('لا توجد نتائج');
    expect(empty!.src).toMatch(/No results/);
  });

  it('no guarantee/PDPL/pricing claims leak into Search V3 sources', () => {
    for (const { path, src } of allSearchSources) {
      for (const banned of ['نضمن', 'تواصل مباشر مضمون', 'PDPL', 'أفضل سعر']) {
        expect(src.includes(banned), `${path} leaks banned claim: ${banned}`).toBe(false);
      }
    }
  });

  it('Search V3 routes legacy "/search" through SearchV3', () => {
    const stub = read('src/pages/Search.tsx');
    expect(stub).toMatch(/SearchV3/);
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

describe('UX-REDESIGN-3 — Search V3 header structure', () => {
  const src = read('src/components/search/v3/SearchHeaderV3.tsx');

  it('exposes a sticky toolbar with the bilingual search autocomplete', () => {
    expect(src).toMatch(/sticky/);
    expect(src).toMatch(/SearchAutocomplete/);
  });

  it('header never links into private/admin/auth/onboarding routes', () => {
    for (const re of [/to=["']\/dashboard/, /to=["']\/admin/, /to=["']\/auth/, /to=["']\/onboarding/]) {
      expect(src).not.toMatch(re);
    }
  });
});