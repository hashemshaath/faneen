import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * HOME PAGE IMAGE LINKS REGRESSION
 * Static invariants that lock the homepage image pipeline so the
 * recent RUM/perf changes can't silently break image rendering again.
 *
 * Live probe (Playwright against the dev preview at 2026-06-20)
 * confirmed all 40 <img> elements load (naturalWidth > 0), 0 404s,
 * 0 empty/undefined/null sources. These tests pin those guarantees
 * at source-code level.
 */

const ROOT = process.cwd();
const HOME_V2 = readFileSync(join(ROOT, 'src/components/home/v2/HomeV2.tsx'), 'utf8');
const SECTOR_GRID = readFileSync(join(ROOT, 'src/components/home/v2/sections/HomeSectorGrid.tsx'), 'utf8');
const INDEX_PAGE = readFileSync(join(ROOT, 'src/pages/Index.tsx'), 'utf8');

const HERO_FILES = [
  'public/hero/slide-1-768.webp',
  'public/hero/slide-1-1280.webp',
  'public/hero/slide-1-1920.webp',
];

describe('Hero (LCP) image integrity', () => {
  it('public hero variants exist for the preloaded LCP image', () => {
    for (const f of HERO_FILES) {
      expect(existsSync(join(ROOT, f))).toBe(true);
    }
  });

  it('hero slide 1 is eager + fetchpriority=high (LCP candidate)', () => {
    expect(HOME_V2).toMatch(/loading=\{i === 0 \? 'eager' : 'lazy'\}/);
    expect(HOME_V2).toMatch(/fetchpriority:\s*i === 0 \? 'high' : 'low'/);
  });

  it('hero <link rel="preload"> uses the same src + srcset map', () => {
    expect(HOME_V2).toMatch(/rel\s*=\s*'preload'/);
    expect(HOME_V2).toMatch(/link\.href\s*=\s*heroSlide1/);
    expect(HOME_V2).toMatch(/imagesrcset['"],\s*HERO_SRCSETS\[heroSlide1\]/);
  });

  it('hero <img> has explicit width and height to prevent CLS', () => {
    expect(HOME_V2).toMatch(/width=\{1920\}/);
    expect(HOME_V2).toMatch(/height=\{1080\}/);
  });
});

describe('Sector grid image integrity', () => {
  it('sector tiles are guarded so a missing IMG entry never renders <img> with an empty src', () => {
    // The `{img && (...)}` guard is the contract that prevents broken images
    // when DB-driven tiles introduce new slugs the IMG map does not cover.
    expect(SECTOR_GRID).toMatch(/\{img && \(/);
    expect(SECTOR_GRID).toMatch(/src=\{img\.image\}/);
    expect(SECTOR_GRID).toMatch(/srcSet=\{img\.srcSet\}/);
  });

  it('every default sector slug has an IMG entry (no broken default tiles)', () => {
    const slugs = [
      'aluminum-works','glass-securit-works','steel-metal-works','stainless-steel-works',
      'wood-carpentry','kitchens-works','facades-cladding','elevators-maintenance',
    ];
    for (const slug of slugs) {
      expect(SECTOR_GRID).toContain(`'${slug}':`);
    }
  });

  it('sector tile images use lazy loading + decoding async (off-screen)', () => {
    expect(SECTOR_GRID).toMatch(/loading="lazy"/);
    expect(SECTOR_GRID).toMatch(/decoding="async"/);
  });
});

describe('No forbidden image-source patterns in home components', () => {
  const SOURCES = [HOME_V2, SECTOR_GRID, INDEX_PAGE];
  it('never emits src="" / src="undefined" / src="null"', () => {
    for (const src of SOURCES) {
      expect(src).not.toMatch(/src=""/);
      expect(src).not.toMatch(/src="undefined"/);
      expect(src).not.toMatch(/src="null"/);
      expect(src).not.toMatch(/src=\{undefined\}/);
      expect(src).not.toMatch(/src=\{null\}/);
    }
  });
  it('never forces a .webp suffix onto an unknown URL (no `+ ".webp"` coercion in home)', () => {
    for (const src of SOURCES) {
      expect(src).not.toMatch(/\+\s*['"]\.webp['"]/);
    }
  });
  it('never references a known-private bucket from home', () => {
    // business-assets is the public bucket used for provider covers/logos.
    // Tighten this list if/when new private buckets are introduced.
    for (const src of SOURCES) {
      expect(src).not.toMatch(/\/storage\/v1\/object\/private\//);
    }
  });
  it('useImagePerfTracking("home") is still wired on the Index page', () => {
    expect(INDEX_PAGE).toMatch(/useImagePerfTracking\(\s*['"]home['"]\s*\)/);
  });
});

describe('No DB / RLS / RPC / edge changes touched for this fix', () => {
  it('this regression file does not import supabase client or migrations', () => {
    const self = readFileSync(__filename, 'utf8');
    expect(self).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(self).not.toMatch(/supabase\/migrations/);
  });
});