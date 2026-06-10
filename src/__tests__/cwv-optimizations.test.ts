import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Core Web Vitals optimizations for public routes', () => {
  it('preloads the hero LCP image from the active HomeV2 hero', () => {
    const hero = readFileSync(
      join(root, 'src/components/home/v2/HomeV2.tsx'),
      'utf8',
    );
    // HomeV2 dynamically injects a <link rel="preload" as="image" fetchpriority="high">
    // for the first hero slide on mount (LCP candidate).
    expect(hero).toMatch(/link\.rel\s*=\s*['"]preload['"]/);
    expect(hero).toMatch(/link\.as\s*=\s*['"]image['"]/);
    expect(hero).toMatch(/fetchpriority/i);
    // Slide 1 (LCP) is served from /public/hero/* so the URL is stable and
    // matches the static <img> inlined in index.html (Phase 3). The asset
    // is still bundled (see the next test) but the LCP variant comes from
    // /public so the pre-React hero shares the same cached decode.
    expect(hero).toMatch(/heroSlide1\s*=\s*['"]\/hero\/slide-1-1920\.webp['"]/);
    // First slide must render eagerly; subsequent slides must lazy-load.
    expect(hero).toMatch(/loading=\{i === 0 \? ['"]eager['"] : ['"]lazy['"]\}/);
  });

  it('bundles the hero image as a hashed asset (long-cache via /assets/*)', () => {
    expect(() => readFileSync(join(root, 'src/assets/home/hero-slide-1.webp'))).not.toThrow();
  });

  it('Search V3 ships no heavy map/chart libs in the initial bundle', () => {
    // The legacy SearchMap (leaflet ~150KB gz) was removed with Search V3.
    // We now guard the inverse: V3's page + results component must NOT
    // import leaflet/react-leaflet/recharts statically, so they never end
    // up in the initial /search chunk.
    const page = readFileSync(join(root, 'src/pages/SearchV3.tsx'), 'utf8');
    const results = readFileSync(
      join(root, 'src/components/search/v3/SearchResultsV3.tsx'),
      'utf8',
    );
    for (const src of [page, results]) {
      expect(src).not.toMatch(/from\s+['"]leaflet['"]/);
      expect(src).not.toMatch(/from\s+['"]react-leaflet['"]/);
      expect(src).not.toMatch(/from\s+['"]recharts['"]/);
    }
  });

  it('respects prefers-reduced-motion in the hero parallax + typing', () => {
    const hero = readFileSync(
      join(root, 'src/components/home/v2/HomeV2.tsx'),
      'utf8',
    );
    expect(hero).toContain('prefers-reduced-motion: reduce');

    const typing = readFileSync(
      join(root, 'src/hooks/useTypingAnimation.ts'),
      'utf8',
    );
    expect(typing).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps the home page below-the-fold sections behind content-visibility', () => {
    const css = readFileSync(join(root, 'src/index.css'), 'utf8');
    expect(css).toMatch(/\.cv-auto\s*\{[^}]*content-visibility:\s*auto/);
  });
});
