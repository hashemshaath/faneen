import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * HOME-PERF-CLEANUP — invariants that protect the homepage's
 * performance, accessibility and code-quality posture. The home page
 * lives at `/` and renders `<HeroV2>` eagerly plus four lazy sections.
 */
describe('Home page performance + cleanup invariants', () => {
  const indexSrc = read('src/pages/Index.tsx');
  const heroSrc = read('src/components/home/v2/HomeV2.tsx');
  const sectionsDir = 'src/components/home/v2/sections';
  const sectionFiles = readdirSync(sectionsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(sectionsDir, f));
  const sectionSources = sectionFiles.map((p) => read(p));
  const allHomeSources = [indexSrc, heroSrc, ...sectionSources];

  it('renders exactly one <main> landmark on the homepage', () => {
    const opens = indexSrc.match(/<main(\s|>)/g) ?? [];
    expect(opens.length).toBe(1);
  });

  it('mounts hero eagerly and below-the-fold sections via LazyOnView + Suspense', () => {
    expect(indexSrc).toMatch(/<HeroV2\s*\/?>/);
    for (const section of ['HomeSectorGrid', 'HomeAudienceSplit', 'HomeCategoryRows', 'FAQSection']) {
      const re = new RegExp(
        `<LazyOnView[\\s\\S]*?<Suspense[\\s\\S]*?<${section}\\s*/?>[\\s\\S]*?</Suspense>[\\s\\S]*?</LazyOnView>`,
      );
      expect(indexSrc, `${section} must be lazy-mounted`).toMatch(re);
    }
  });

  it('hero LCP image is eager + fetchpriority=high, other slides are lazy', () => {
    expect(heroSrc).toMatch(/loading=\{i === 0 \? 'eager' : 'lazy'\}/);
    expect(heroSrc).toMatch(/fetchpriority:\s*i === 0 \? 'high' : 'low'/);
  });

  it('every <img> in home/v2 sections is lazy with explicit dimensions or aspect-ratio', () => {
    for (let i = 0; i < sectionFiles.length; i++) {
      const src = sectionSources[i];
      const file = sectionFiles[i];
      const imgs = src.match(/<img\b[^>]*>/g) ?? [];
      for (const tag of imgs) {
        expect(tag, `${file}: <img> should be lazy`).toMatch(/loading="lazy"/);
        const hasDims = /width=|height=|aspect-/.test(tag);
        const wrappedInAspect = /aspect-[a-z0-9/\\[\]]+/.test(src);
        expect(hasDims || wrappedInAspect, `${file}: <img> needs dims or aspect-ratio`).toBe(true);
      }
    }
  });

  it('no hardcoded hex colors anywhere in the homepage tree', () => {
    for (const src of allHomeSources) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('no demo / fake / placeholder data leaks into the homepage tree', () => {
    for (const src of allHomeSources) {
      expect(src).not.toMatch(/\bis_demo\b|\bisDemo\b|\bfakeData\b|\blorem\b/i);
    }
  });

  it('no TypeScript / ESLint suppressions in the homepage tree', () => {
    for (const src of allHomeSources) {
      expect(src).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
      expect(src).not.toMatch(/\bas\s+any\b|:\s*any\b/);
    }
  });

  it('homepage sets SEO metadata via usePageMeta exactly once', () => {
    const calls = indexSrc.match(/usePageMeta\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(indexSrc).toMatch(/canonical:\s*'https:\/\/qitaat\.com\/'/);
  });

  it('JSON-LD includes WebSite, BreadcrumbList and conditional FAQPage', () => {
    expect(indexSrc).toMatch(/'@type':\s*'WebSite'/);
    expect(indexSrc).toMatch(/'@type':\s*'BreadcrumbList'/);
    expect(indexSrc).toMatch(/'@type':\s*'FAQPage'/);
  });

  it('homepage tree contains no admin / dashboard / onboarding links', () => {
    for (const src of allHomeSources) {
      expect(src).not.toMatch(/to=["']\/dashboard/);
      expect(src).not.toMatch(/to=["']\/admin/);
      expect(src).not.toMatch(/to=["']\/onboarding/);
    }
  });

  it('homepage section files are limited to the active set (no dead sections)', () => {
    const names = sectionFiles.map((f) => f.split('/').pop()!).sort();
    expect(names).toEqual([
      'FAQSection.tsx',
      'HomeAudienceSplit.tsx',
      'HomeCategoryRow.tsx',
      'HomeCategoryRows.tsx',
      'HomeSectorGrid.tsx',
      '_shared.tsx',
    ].sort());
  });
});

/**
 * Public-page invariants — extend the home-page contract to the rest of
 * the high-traffic public routes (search, category index, business
 * profile, project detail). Same checks: single H1, single <main>, SEO
 * meta wired, RUM tracking attached so /admin/performance can break
 * them out per page.
 */
describe('Public page performance + SEO invariants', () => {
  const pages: Array<{
    label: string;
    files: string[];
    routeKey: string;
  }> = [
    {
      label: 'Search',
      files: ['src/pages/SearchV3.tsx'],
      routeKey: 'search',
    },
    {
      label: 'Categories',
      files: ['src/pages/Categories.tsx'],
      routeKey: 'categories',
    },
    {
      label: 'BusinessProfile',
      files: [
        'src/pages/BusinessProfile.tsx',
        'src/components/business-profile/BusinessProfileHeader.tsx',
      ],
      routeKey: 'business_profile',
    },
    {
      label: 'ProjectDetail',
      files: ['src/pages/ProjectDetail.tsx'],
      routeKey: 'project_detail',
    },
    {
      label: 'SectorsHub',
      files: ['src/pages/SectorsHub.tsx'],
      routeKey: 'sectors_hub',
    },
    {
      label: 'SectorLanding',
      files: ['src/pages/SectorLanding.tsx'],
      routeKey: 'sector_landing',
    },
    {
      label: 'SectorSeoLanding',
      files: ['src/pages/SectorSeoLanding.tsx'],
      routeKey: 'sector_seo_landing',
    },
  ];

  for (const page of pages) {
    describe(page.label, () => {
      const sources = page.files.map((p) => readFileSync(join(process.cwd(), p), 'utf8'));
      const merged = sources.join('\n');

      it('uses page-level SEO meta (usePageMeta or useSeoPage)', () => {
        expect(merged).toMatch(/usePageMeta\(|useSeoPage\(/);
      });

      it('exposes RUM tracking under the expected route_key', () => {
        const re = new RegExp(`useImagePerfTracking\\(['"]${page.routeKey}['"]\\)`);
        expect(merged).toMatch(re);
      });

      it('renders a <main> landmark', () => {
        expect(merged).toMatch(/<main(\s|>)/);
      });

      it('renders <h1> elements (one per route — conditional branches allowed)', () => {
        const opens = merged.match(/<h1(\s|>)/g) ?? [];
        expect(opens.length).toBeGreaterThanOrEqual(1);
        // Hard cap so a regression like duplicate sibling H1s gets caught.
        expect(opens.length).toBeLessThanOrEqual(3);
      });

      it('every <img> is lazy (or eager LCP with fetchpriority="high")', () => {
        const imgs = merged.match(/<img\b[^>]*>/g) ?? [];
        for (const tag of imgs) {
          const isLazy = /loading="lazy"/.test(tag);
          const isPriorityLcp = /loading=("eager"|\{[^}]*'eager'[^}]*\})/.test(tag)
            && /fetchpriority/.test(tag);
          expect(isLazy || isPriorityLcp, `${page.label}: <img> must be lazy or priority LCP — ${tag.slice(0, 120)}`).toBe(true);
        }
      });

      it('contains no admin / dashboard / onboarding navigation links', () => {
        expect(merged).not.toMatch(/to=["']\/admin/);
        expect(merged).not.toMatch(/to=["']\/onboarding/);
      });
    });
  }
});