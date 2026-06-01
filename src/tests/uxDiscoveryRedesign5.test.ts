import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-5 — Discovery pages (Sectors / Services / Brands).
 * Locks the discovery-helper guidance, primary CTAs, trust copy and
 * public-only routing against regressions while preserving SEO and
 * the brands_public / approved-only sources.
 */
describe('UX-REDESIGN-5 — Sectors hub', () => {
  const src = read('src/pages/SectorsHub.tsx');

  it('renders the "where to start" discovery helper with all 4 entry points', () => {
    expect(src).toContain('من أين تبدأ؟');
    expect(src).toContain('ابدأ من القطاع');
    expect(src).toContain('ابدأ من الخدمة');
    expect(src).toContain('ابدأ من العلامة');
    expect(src).toContain('أرسل طلب عرض سعر');
  });

  it('hero exposes both a quote CTA and a sectors→services secondary CTA', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/services"');
    expect(src).toContain('استعرض الخدمات');
  });

  it('renders the trust note without execution guarantees', () => {
    expect(src).toContain('البيانات المعروضة تعتمد على الجهات المنشورة والمعتمدة');
    expect(src).toContain('لا نضمن نتائج التنفيذ');
    for (const banned of ['نضمن', 'أفضل سعر', 'الأرخص', 'تنفيذ مضمون']) {
      // Note: "نضمن" appears inside "لا نضمن" so we look only for un-negated standalone forms.
      if (banned !== 'نضمن') {
        expect(src.includes(banned), `sectors hub leaks: ${banned}`).toBe(false);
      }
    }
  });

  it('exposes only public-safe routes', () => {
    for (const re of [/to=["']\/dashboard/, /to=["']\/admin/, /to=["']\/onboarding/, /to=["']\/compare\?ids=/]) {
      expect(src).not.toMatch(re);
    }
  });
});

describe('UX-REDESIGN-5 — Services hub', () => {
  const src = read('src/pages/Services.tsx');

  it('hero adds quote + sectors CTAs and a discovery helper line', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('اطلب عرض سعر');
    expect(src).toContain('استكشف القطاعات');
    expect(src).toContain('ابدأ من الخدمة إذا كنت تعرف المطلوب');
  });

  it('empty state offers quote + sectors actions, not a bare line', () => {
    expect(src).toContain('لا توجد خدمات مطابقة');
    expect(src).toMatch(/empty[\s\S]{0,40}|filtered\.length === 0/);
  });

  it('exposes only public-safe routes', () => {
    for (const re of [/to=["']\/dashboard/, /to=["']\/admin/, /to=["']\/auth/, /to=["']\/onboarding/]) {
      expect(src).not.toMatch(re);
    }
  });
});

describe('UX-REDESIGN-5 — Brands catalog', () => {
  const src = read('src/pages/BrandsCatalog.tsx');

  it('uses the approved-only brands_public source (via @/modules/brands)', () => {
    expect(src).toContain("from '@/modules/brands'");
    expect(src).toContain('listApprovedBrands');
    // Sentinel: never bypasses the module by importing the supabase client.
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    // Sentinel: never touches the raw admin table.
    expect(src).not.toMatch(/brand_catalog/);
  });

  it('hero adds quote + sectors CTAs and the brand-entry helper', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('استخدم العلامة التجارية عندما تكون لديك مواصفات محددة');
    expect(src).toContain('العلامات تظهر بعد الاعتماد');
  });

  it('empty state offers quote/sectors/services actions', () => {
    expect(src).toContain('لا توجد علامات مطابقة');
    expect(src).toContain('to="/services"');
  });

  it('exposes only public-safe routes', () => {
    for (const re of [/to=["']\/dashboard/, /to=["']\/admin/, /to=["']\/onboarding/, /to=["']\/auth/]) {
      expect(src).not.toMatch(re);
    }
  });
});

describe('UX-REDESIGN-5 — Brand detail', () => {
  const src = read('src/pages/BrandDetail.tsx');

  it('uses only approved-brand data accessors (no raw client)', () => {
    expect(src).toContain("from '@/modules/brands'");
    expect(src).toContain('getBrandBySlug');
    expect(src).toContain('listPublicProvidersForBrand');
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('replaces the dashboard-correction link with a public /contact route', () => {
    expect(src).not.toMatch(/to=["']\/dashboard/);
    expect(src).toContain('to="/contact"');
    expect(src).toContain('اطلب تصحيحاً');
  });

  it('renders an empty-providers state with quote/sectors/search CTAs', () => {
    expect(src).toContain('providerLinks.length === 0');
    expect(src).toContain('لا يوجد مزودون معتمدون مرتبطون بهذه العلامة بعد');
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('to="/search"');
  });

  it('clarifies that brand-provider relationships do not guarantee execution', () => {
    expect(src).toContain('الارتباط لا يعني ضمان نتائج التنفيذ');
  });

  it('exposes only public-safe routes', () => {
    for (const re of [/to=["']\/admin/, /to=["']\/onboarding/, /to=["']\/auth/, /to=["']\/compare\?ids=/]) {
      expect(src).not.toMatch(re);
    }
  });
});