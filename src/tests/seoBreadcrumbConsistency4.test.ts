import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

const DEEP_PAGES = [
  'src/pages/BusinessProfile.tsx',
  'src/pages/ProjectDetail.tsx',
  'src/pages/BlogPost.tsx',
  'src/pages/help/HelpArticlePage.tsx',
  'src/pages/help/HelpCategoryPage.tsx',
  'src/pages/help/HelpCenterHome.tsx',
  'src/pages/ProfileSystemDetail.tsx',
  'src/pages/BrandDetail.tsx',
  'src/pages/BrandsCatalog.tsx',
  'src/pages/ServiceDetail.tsx',
  'src/pages/Services.tsx',
  'src/pages/SectorLanding.tsx',
  'src/pages/SectorCity.tsx',
  'src/pages/SectorsHub.tsx',
];

describe('SEO-4 — BreadcrumbList consistency on deep public pages', () => {
  it('every deep public page emits a BreadcrumbList (inline or via helper)', () => {
    for (const f of DEEP_PAGES) {
      const src = read(f);
      const hasInline = /'@type':\s*'BreadcrumbList'/.test(src);
      const hasHelper = /buildBreadcrumbList\s*\(/.test(src);
      expect(hasInline || hasHelper, `${f} is missing a BreadcrumbList`).toBe(true);
    }
  });

  it('ProfileSystemDetail now ships a BreadcrumbList (was missing pre-SEO-4)', () => {
    const src = read('src/pages/ProfileSystemDetail.tsx');
    expect(src).toMatch(/buildBreadcrumbList/);
    expect(src).toMatch(/profile-systems/);
    expect(src).toMatch(/#breadcrumb/);
  });

  it('BrandDetail/BrandsCatalog use the shared helper with stable @id', () => {
    const brand = read('src/pages/BrandDetail.tsx');
    const catalog = read('src/pages/BrandsCatalog.tsx');
    expect(brand).toMatch(/buildBreadcrumbList\(/);
    expect(brand).toMatch(/#breadcrumb/);
    expect(catalog).toMatch(/buildBreadcrumbList\(/);
    expect(catalog).toMatch(/#breadcrumb/);
    // Inline literal Breadcrumb blocks must be gone on these two pages.
    expect(brand).not.toMatch(/'@type':\s*'BreadcrumbList'/);
    expect(catalog).not.toMatch(/'@type':\s*'BreadcrumbList'/);
  });

  it('Breadcrumbs never enumerate private/admin/auth/session routes', () => {
    const PRIVATE = [/\/admin\b/, /\/dashboard\b/, /\/auth\b/, /\/onboarding\b/, /\/settings\b/];
    for (const f of DEEP_PAGES) {
      const src = read(f);
      // Scope the search to breadcrumb-shaped regions: lines containing
      // BreadcrumbList or buildBreadcrumbList plus the surrounding ~25 lines.
      const matches = [
        ...src.matchAll(/(BreadcrumbList|buildBreadcrumbList)[\s\S]{0,1500}?(\]|\))/g),
      ].map((m) => m[0]);
      for (const block of matches) {
        for (const pat of PRIVATE) {
          expect(pat.test(block), `${f} breadcrumb leaks private route ${pat}`).toBe(false);
        }
      }
    }
  });

  it('Breadcrumbs do not embed PII-shaped fields (email/phone/ref_id)', () => {
    const FORBIDDEN = [/\bemail\b/i, /\bphone\b/i, /\bmobile\b/i, /\bref_id\b/i];
    for (const f of DEEP_PAGES) {
      const src = read(f);
      const matches = [
        ...src.matchAll(/buildBreadcrumbList\([\s\S]{0,800}?\)/g),
      ].map((m) => m[0]);
      for (const block of matches) {
        for (const pat of FORBIDDEN) {
          expect(pat.test(block), `${f} breadcrumb mentions ${pat}`).toBe(false);
        }
      }
    }
  });

  it('No deep page emits two sibling top-level BreadcrumbList blocks', () => {
    for (const f of DEEP_PAGES) {
      const src = read(f);
      const occurrences = (src.match(/'@type':\s*'BreadcrumbList'/g) || []).length;
      // BlogPost intentionally nests one inside Article.breadcrumb — that
      // still appears in the source as a single occurrence of the literal.
      expect(occurrences, `${f} has duplicate BreadcrumbList`).toBeLessThanOrEqual(1);
    }
  });
});
