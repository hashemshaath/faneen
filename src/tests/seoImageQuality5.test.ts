import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SEO-5 — public route image quality audit.
 * Verifies that <img> usages on key public pages either:
 *   - carry an alt expression, or
 *   - are explicitly decorative (alt="" + aria-hidden="true").
 * Also verifies above-the-fold/key images declare explicit dimensions
 * (width/height) to minimise CLS.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const PAGES = [
  'src/pages/BrandDetail.tsx',
  'src/pages/BrandsCatalog.tsx',
  'src/pages/Showcase.tsx',
  'src/pages/BlogPost.tsx',
  'src/pages/SectorLanding.tsx',
  'src/pages/SectorCity.tsx',
  'src/pages/ForProviders.tsx',
];

describe('SEO-5 image quality on public pages', () => {
  it.each(PAGES)('%s: every <img> declares alt= (meaningful or empty decorative)', (p) => {
    const src = read(p);
    const imgTags = src.match(/<img\b[^>]*>/g) ?? [];
    expect(imgTags.length).toBeGreaterThan(0);
    for (const tag of imgTags) {
      expect(tag).toMatch(/\balt=/);
      // Decorative imgs (alt="") must be hidden from AT
      if (/\balt=""/.test(tag) || /\balt=\{""\}/.test(tag)) {
        expect(tag).toMatch(/aria-hidden=("true"|\{true\})/);
      }
    }
  });

  it('BrandsCatalog logo has explicit width/height (CLS-safe)', () => {
    const src = read('src/pages/BrandsCatalog.tsx');
    expect(src).toMatch(/width=\{?56\}?[\s\S]{0,80}height=\{?56\}?/);
  });

  it('BrandDetail logo has explicit width/height (CLS-safe)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/width=\{?80\}?[\s\S]{0,80}height=\{?80\}?/);
  });

  it('BlogPost cover image has dimensions + fetchpriority high (LCP)', () => {
    const src = read('src/pages/BlogPost.tsx');
    expect(src).toMatch(/fetchpriority:\s*'high'/);
    expect(src).toMatch(/width=\{?1600\}?/);
  });
});
