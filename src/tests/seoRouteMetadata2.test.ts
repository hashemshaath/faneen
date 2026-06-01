import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('SEO-2 — per-route Helmet metadata patterns', () => {
  it('sector landing uses concise Saudi-market title + canonical and noindex unknowns', () => {
    const src = read('src/pages/SectorLanding.tsx');
    expect(src).toMatch(/في السعودية \| قِطاعات/);
    expect(src).toMatch(/in Saudi Arabia \| Qitaat/);
    expect(src).toMatch(/noindex: !meta/);
    expect(src).toMatch(/https:\/\/qitaat\.com\/sectors\/\$\{sectorSlug\}/);
    expect(src).not.toMatch(/2026/);
  });

  it('sector-city page includes city in title/description and canonicalises clean URL', () => {
    const src = read('src/pages/SectorCity.tsx');
    expect(src).toMatch(/\$\{meta!\.name\} في \$\{city\.nameAr\} \| قِطاعات/);
    expect(src).toMatch(/في \$\{city\.nameAr\}/);
    expect(src).toMatch(/SITE_URL\}\/sectors\/\$\{sectorSlug\}\/\$\{cityParam\}/);
    expect(src).toMatch(/noindex: !sector \|\| !city/);
    expect(src).not.toMatch(/2026/);
  });

  it('service detail uses construction-providers title pattern and noindex on missing service', () => {
    const src = read('src/pages/ServiceDetail.tsx');
    expect(src).toMatch(/مزودو خدمات البناء والتشييد \| قِطاعات/);
    expect(src).toMatch(/استعرض مزودي خدمة \$\{name\}/);
    expect(src).toMatch(/noindex: !service/);
    expect(src).not.toMatch(/2026/);
  });

  it('brand detail uses approved-brand title pattern and noindex on unknown brand', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/\| العلامات التجارية في قِطاعات/);
    expect(src).toMatch(/استعرض الجهات المرتبطة بعلامة/);
    expect(src).toMatch(/noindex: !isLoading && !brand/);
  });

  it('brand detail reads only from approved brand source (brands_public via getBrandBySlug)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/getBrandBySlug/);
    expect(src).not.toMatch(/from\(['"]brand_catalog['"]\)/);
  });

  it('search/compare routes remain noindex (SEO-1 policy preserved)', () => {
    const sitemap = read('supabase/functions/sitemap/index.ts');
    // search and compare are not enumerated in the businesses sitemap loop
    expect(sitemap).not.toMatch(/\/search\?q=/);
    expect(sitemap).not.toMatch(/\/compare\?/);
  });
});
