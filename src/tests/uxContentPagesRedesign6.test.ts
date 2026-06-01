import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-6 — Projects / Showcase / Blog / Help public content pages.
 * Locks public-safe CTAs, trust copy, and the absence of admin/dashboard/
 * auth/onboarding links on public content surfaces.
 */
describe('UX-REDESIGN-6 — Projects hub', () => {
  const src = read('src/pages/Projects.tsx');

  it('hero adds public quote + sectors CTAs', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('اطلب عرض سعر');
    expect(src).toContain('استكشف القطاعات');
  });

  it('hero carries a no-guarantee trust note', () => {
    expect(src).toContain('لا تعني ضمان نتائج التنفيذ');
  });

  it('empty state offers safe recovery CTAs', () => {
    expect(src).toContain('لا توجد مشاريع مطابقة');
    expect(src).toContain('استعرض الخدمات');
    expect(src).toContain('تواصل معنا');
  });

  it('does not link to private routes', () => {
    expect(src).not.toMatch(/to="\/dashboard/);
    expect(src).not.toMatch(/to="\/admin/);
    expect(src).not.toMatch(/to="\/auth/);
    expect(src).not.toMatch(/to="\/onboarding/);
  });
});

describe('UX-REDESIGN-6 — ProjectDetail', () => {
  const src = read('src/pages/ProjectDetail.tsx');

  it('explore-more block offers a quote CTA and trust note', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('اطلب عرض سعر لمشروع مشابه');
    expect(src).toContain('منشورة بعد المراجعة');
  });

  it('does not link to private routes', () => {
    expect(src).not.toMatch(/to="\/dashboard/);
    expect(src).not.toMatch(/to="\/admin/);
    expect(src).not.toMatch(/to="\/auth/);
    expect(src).not.toMatch(/to="\/onboarding/);
  });
});

describe('UX-REDESIGN-6 — Showcase', () => {
  const src = read('src/pages/Showcase.tsx');

  it('hero exposes quote + sectors CTAs and trust copy', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('الظهور في المعرض لا يعني ضمان نتائج التنفيذ');
  });

  it('provider CTA points to the public for-providers page, not dashboard', () => {
    expect(src).toContain('to="/for-providers"');
    expect(src).not.toMatch(/to="\/dashboard/);
  });

  it('empty states (logos + works) carry safe recovery CTAs', () => {
    expect(src).toContain('استكشف القطاعات');
    expect(src).toContain('استعرض الخدمات');
    expect(src).toContain('شاهد المشاريع');
  });

  it('preserves the verified-only triple-gate query', () => {
    expect(src).toContain('business.is_verified');
    expect(src).toContain('business.is_active');
    expect(src).toContain("business.approval_status");
    expect(src).toContain('business.is_demo');
  });

  it('does not link to private routes', () => {
    expect(src).not.toMatch(/to="\/admin/);
    expect(src).not.toMatch(/to="\/auth/);
    expect(src).not.toMatch(/to="\/onboarding/);
  });
});

describe('UX-REDESIGN-6 — Blog listing', () => {
  const src = read('src/pages/Blog.tsx');

  it('empty state offers safe public CTAs', () => {
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('to="/help"');
  });

  it('does not link to private routes', () => {
    expect(src).not.toMatch(/to="\/dashboard/);
    expect(src).not.toMatch(/to="\/admin/);
    expect(src).not.toMatch(/to="\/auth/);
    expect(src).not.toMatch(/to="\/onboarding/);
  });
});

describe('UX-REDESIGN-6 — BlogPost', () => {
  const src = read('src/pages/BlogPost.tsx');

  it('adds an end-of-article public CTA with no-guarantee copy', () => {
    expect(src).toContain('جاهز للخطوة التالية؟');
    expect(src).toContain('to="/quote"');
    expect(src).toContain('to="/sectors"');
    expect(src).toContain('لا تعني ضمان التنفيذ');
  });

  it('does not link to private routes', () => {
    expect(src).not.toMatch(/to="\/dashboard/);
    expect(src).not.toMatch(/to="\/admin/);
    expect(src).not.toMatch(/to="\/auth/);
    expect(src).not.toMatch(/to="\/onboarding/);
  });
});

describe('UX-REDESIGN-6 — Help center', () => {
  const home = read('src/pages/help/HelpCenterHome.tsx');
  const article = read('src/pages/help/HelpArticlePage.tsx');
  const cat = read('src/pages/help/HelpCategoryPage.tsx');

  it('article page keeps a public support CTA', () => {
    expect(article).toContain('to="/contact"');
    expect(article).toContain('تواصل مع الدعم');
  });

  it('category empty state offers help + contact CTAs', () => {
    expect(cat).toContain('to="/help"');
    expect(cat).toContain('to="/contact"');
  });

  it('help center home keeps a public report-issue / search recovery path', () => {
    expect(home).toContain('/help/report-issue');
  });

  for (const [name, src] of [['HelpCenterHome', home], ['HelpArticlePage', article], ['HelpCategoryPage', cat]] as const) {
    it(`${name} does not link to private routes`, () => {
      expect(src).not.toMatch(/to="\/dashboard/);
      expect(src).not.toMatch(/to="\/admin/);
      expect(src).not.toMatch(/to="\/auth/);
      expect(src).not.toMatch(/to="\/onboarding/);
    });
  }
});
