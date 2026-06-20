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
      'faqItems.ts',
    ].filter((n) => n.endsWith('.tsx')).sort());
  });
});