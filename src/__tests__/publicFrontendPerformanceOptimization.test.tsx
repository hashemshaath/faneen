/**
 * PUBLIC FRONTEND PERFORMANCE + SPEED + RESPONSIVENESS OPTIMIZATION
 *
 * Static guard for the public surface (home + search + categories +
 * sector pages). Performance is enforced upstream by:
 *   - src/__tests__/cwv-optimizations.test.ts            (LCP / motion / cv-auto)
 *   - src/tests/performanceAccessibilityFinal1.test.ts   (lazyRetry routing)
 *   - src/tests/seoImageQuality5.test.ts                 (image a11y / CLS)
 *   - src/__tests__/homePagePerformanceCleanup.test.tsx  (home invariants)
 *
 * This file adds the cross-public-route invariants requested by the
 * audit task: no admin/dashboard leakage, single landmark, RUM key
 * preserved, no suppressions / hex / `any` in public page files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const PUBLIC_PAGES = [
  'src/pages/Index.tsx',
  'src/pages/Categories.tsx',
  'src/pages/SearchV3.tsx',
  'src/pages/SectorLanding.tsx',
  'src/pages/SectorCity.tsx',
  'src/pages/SectorsHub.tsx',
];

describe('PUBLIC FRONTEND PERFORMANCE + SPEED + RESPONSIVENESS', () => {
  it('home page preserves the RUM route key', () => {
    expect(read('src/pages/Index.tsx')).toMatch(/useImagePerfTracking\(\s*['"]home['"]\s*\)/);
  });

  it('public pages do not statically import admin/dashboard modules', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      expect(src, `${p} imports admin/`).not.toMatch(/from\s+["'][^"']*\/admin\//);
      expect(src, `${p} imports dashboard/`).not.toMatch(/from\s+["'][^"']*\/dashboard\//);
    }
  });

  it('public pages have no hardcoded hex colors', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      // Allow hex inside JSON-LD url strings (e.g. tracking ids) — none expected.
      const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g);
      expect(hex, `${p} has hex literals: ${hex?.join(', ')}`).toBeNull();
    }
  });

  it('public pages have no suppressions or `any`', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
      // Allow only the narrow `react-hooks/exhaustive-deps` opt-out used in
      // SearchV3 for intentional one-shot effects; ban every other variant.
      const bad = (src.match(/eslint-disable[^\n]*/g) ?? []).filter(
        (l) => !/react-hooks\/exhaustive-deps/.test(l),
      );
      expect(bad, `${p} has disallowed eslint-disable: ${bad.join(' | ')}`).toEqual([]);
      expect(src).not.toMatch(/\bas\s+any\b/);
    }
  });

  it('home page renders exactly one <main> and HeroV2 eagerly', () => {
    const src = read('src/pages/Index.tsx');
    expect(src.match(/<main\b/g)?.length ?? 0).toBe(1);
    expect(src).toMatch(/import\s*\{[^}]*HeroV2[^}]*\}\s*from\s*["']@\/components\/home\/v2\/HomeV2["']/);
    expect(src).toMatch(/<HeroV2\s*\/>/);
  });

  it('home page keeps below-the-fold sections lazy + LazyOnView wrapped', () => {
    const src = read('src/pages/Index.tsx');
    expect(src).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(["']@\/components\/home\/v2\/sections\/HomeSectorGrid["']\)\)/);
    expect(src).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(["']@\/components\/home\/v2\/sections\/FAQSection["']\)\)/);
    expect((src.match(/<LazyOnView\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((src.match(/<Suspense\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('home page keeps full multi-JSON-LD payload (WebSite + 2 ItemList + Breadcrumb + optional FAQ)', () => {
    const src = read('src/pages/Index.tsx');
    expect(src).toMatch(/useMultiJsonLd\(/);
    expect(src).toMatch(/'@type':\s*'WebSite'/);
    expect(src.match(/'@type':\s*'ItemList'/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/'@type':\s*'BreadcrumbList'/);
    expect(src).toMatch(/'@type':\s*'FAQPage'/);
  });

  it('Search V3 ships no leaflet/recharts in the initial bundle', () => {
    const page = read('src/pages/SearchV3.tsx');
    const results = read('src/components/search/v3/SearchResultsV3.tsx');
    for (const src of [page, results]) {
      expect(src).not.toMatch(/from\s+["']leaflet["']/);
      expect(src).not.toMatch(/from\s+["']react-leaflet["']/);
      expect(src).not.toMatch(/from\s+["']recharts["']/);
    }
  });

  it('public pages do not use empty/undefined/null <img src>', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      expect(src).not.toMatch(/<img[^>]+src=""/);
      expect(src).not.toMatch(/<img[^>]+src=\{undefined\}/);
      expect(src).not.toMatch(/<img[^>]+src=\{null\}/);
    }
  });

  it('public pages do not deep-link to admin/dashboard/onboarding', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      expect(src).not.toMatch(/to=["']\/admin/);
      expect(src).not.toMatch(/to=["']\/dashboard/);
      expect(src).not.toMatch(/to=["']\/onboarding/);
    }
  });
});