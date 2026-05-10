import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Core Web Vitals optimizations for public routes', () => {
  it('preloads the hero LCP image from the HeroSection module', () => {
    const hero = readFileSync(
      join(root, 'src/components/home/HeroSection.tsx'),
      'utf8',
    );
    expect(hero).toMatch(/rel\s*=\s*["']preload["']/);
    expect(hero).toMatch(/import\s+heroBg1\s+from\s+["']@\/assets\/hero-bg\.webp["']/);
    expect(hero).toMatch(/fetchpriority/i);
  });

  it('bundles the hero image as a hashed asset (long-cache via /assets/*)', () => {
    expect(() => readFileSync(join(root, 'src/assets/hero-bg.webp'))).not.toThrow();
  });

  it('lazy-loads SearchMap (leaflet) in the search results component', () => {
    const src = readFileSync(
      join(root, 'src/components/search/SearchResults.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/^import\s+\{\s*SearchMap\s*\}/m);
    expect(src).toMatch(/lazy\(\(\)\s*=>\s*import\(['"]\.\/SearchMap['"]\)/);
    expect(src).toMatch(/<Suspense[\s\S]*?<SearchMap/);
  });

  it('respects prefers-reduced-motion in the hero parallax + typing', () => {
    const hero = readFileSync(
      join(root, 'src/components/home/HeroSection.tsx'),
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
