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
    expect(hero).toMatch(/import\s+heroSlide1\s+from\s+['"]@\/assets\/home\/hero-slide-1\.webp['"]/);
    // First slide must render eagerly; subsequent slides must lazy-load.
    expect(hero).toMatch(/loading=\{i === 0 \? ['"]eager['"] : ['"]lazy['"]\}/);
  });

  it('bundles the hero image as a hashed asset (long-cache via /assets/*)', () => {
    expect(() => readFileSync(join(root, 'src/assets/home/hero-slide-1.webp'))).not.toThrow();
  });

  it('lazy-loads SearchMap (leaflet) in the search results component', () => {
    const src = readFileSync(
      join(root, 'src/components/search/SearchResults.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/^import\s+\{\s*SearchMap\s*\}/m);
    // Accept both React.lazy and the project-wide lazyRetry wrapper
    // (asset-stability pattern that retries on stale chunk loads).
    expect(src).toMatch(/(?:lazy|lazyRetry)\(\(\)\s*=>\s*import\(['"]\.\/SearchMap['"]\)/);
    expect(src).toMatch(/<Suspense[\s\S]*?<SearchMap/);
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
