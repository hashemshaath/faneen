import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-4 — Public BusinessProfile invariants.
 * Locks the conversion/trust/mobile upgrades against regressions while
 * preserving SEO-1..SEO-10A guarantees: no private routes, no fake
 * claims, no PDPL/pricing literals, LocalBusiness JSON-LD intact.
 */
describe('UX-REDESIGN-4 — public BusinessProfile', () => {
  const page = read('src/pages/BusinessProfile.tsx');
  const trust = read('src/components/business-profile/BusinessProfileTrustStrip.tsx');
  const sticky = read('src/components/business-profile/BusinessProfileStickyCta.tsx');

  it('renders the trust strip and sticky CTA on the public profile', () => {
    expect(page).toContain('BusinessProfileTrustStrip');
    expect(page).toContain('BusinessProfileStickyCta');
  });

  it('trust strip carries the Qitaat review-before-publish disclaimer (no guarantee)', () => {
    expect(trust).toContain('نراجع بيانات الظهور قبل النشر');
    expect(trust).toContain('ولا نضمن نتائج التنفيذ');
    expect(trust).toContain('data-trust-disclaimer="qitaat-review-no-guarantee"');
  });

  it('verified badge text only appears when the business is verified', () => {
    // The "جهة موثّقة" / "Verified provider" item must be conditional on
    // the isVerified prop — never hard-coded into the strip.
    expect(trust).toMatch(/if\s*\(\s*isVerified\s*\)/);
    expect(trust).toContain('جهة موثّقة');
    expect(trust).toContain('Verified provider');
  });

  it('mobile sticky CTA is mobile-only and RTL-safe', () => {
    expect(sticky).toContain('sm:hidden');
    expect(sticky).toMatch(/dir=\{isRTL\s*\?\s*['"]rtl['"]\s*:\s*['"]ltr['"]\}/);
    expect(sticky).toContain('env(safe-area-inset-bottom)');
  });

  it('sticky CTA does not link to admin / dashboard / auth / onboarding', () => {
    for (const priv of ['/admin', '/dashboard', '/auth', '/onboarding']) {
      expect(sticky.includes(`"${priv}`), `sticky CTA must not link to ${priv}`).toBe(false);
      expect(sticky.includes(`'${priv}`), `sticky CTA must not link to ${priv}`).toBe(false);
    }
  });

  it('sticky CTA is hidden for the owner viewing their own profile', () => {
    expect(page).toMatch(/business\.user_id\s*!==\s*user\?\.id/);
  });

  it('contact copy avoids unverifiable guarantee/PDPL/pricing claims', () => {
    for (const banned of [
      'تواصل مباشر مضمون',
      'نضمن التنفيذ',
      'PDPL',
      'استضافة محلية',
      'أفضل سعر',
    ]) {
      expect(trust.includes(banned), `trust strip leaks: ${banned}`).toBe(false);
      expect(sticky.includes(banned), `sticky CTA leaks: ${banned}`).toBe(false);
    }
  });

  it('preserves LocalBusiness JSON-LD and canonical metadata', () => {
    expect(page).toContain("'LocalBusiness'");
    expect(page).toMatch(/canonical:\s*business\s*\?\s*`https:\/\/qitaat\.com\//);
    expect(page).toContain('useMultiJsonLd');
  });

  it('preserves the SEO-7 hub/spoke explore-more block with public-safe routes only', () => {
    for (const route of ['/sectors', '/services', '/brands', '/showcase']) {
      expect(page).toContain(`to="${route}"`);
    }
    expect(page).not.toMatch(/to=["']\/admin/);
    expect(page).not.toMatch(/to=["']\/dashboard/);
  });

  it('primary mobile CTA labels are conversion-focused but not guarantees', () => {
    expect(sticky).toContain('اطلب عرض سعر');
    expect(sticky).toContain('Request a quote');
    // Microcopy must reference the platform-mediated request, not a guarantee.
    expect(sticky).toContain('أرسل طلبك للجهة عبر قِطاعات');
  });
});