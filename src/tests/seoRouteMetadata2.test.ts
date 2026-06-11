import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('SEO-2 — per-route Helmet metadata patterns', () => {
  // SEO title strings now live in the centralized `buildSeoTitle()` helper
  // (`src/modules/seo/seoTitleBuilder.ts`). Each page is expected to call
  // the helper with the right `kind`, and the helper itself owns the
  // Saudi-market suffix. We assert both halves so behavior is locked end-
  // to-end without depending on inline literal title strings.
  const titleBuilder = read('src/modules/seo/seoTitleBuilder.ts');

  it('sector landing uses concise Saudi-market title + canonical and noindex unknowns', () => {
    const src = read('src/pages/SectorLanding.tsx');
    // Page delegates to the helper with the `category` kind.
    expect(src).toMatch(/buildSeoTitle\(\{[\s\S]{0,200}kind:\s*['"]category['"]/);
    // Helper produces the Saudi-market category pattern in AR + EN.
    expect(titleBuilder).toMatch(/في \$\{COUNTRY_AR\} \| مزودون ومصانع وورش/);
    expect(titleBuilder).toMatch(/in \$\{COUNTRY_EN\} \| Suppliers, Factories & Workshops/);
    expect(titleBuilder).toMatch(/COUNTRY_AR\s*=\s*['"]السعودية['"]/);
    expect(titleBuilder).toMatch(/COUNTRY_EN\s*=\s*['"]Saudi Arabia['"]/);
    expect(src).toMatch(/noindex: !meta/);
    expect(src).toMatch(/https:\/\/qitaat\.com\/sectors\/\$\{sectorSlug\}/);
    expect(src).not.toMatch(/2026/);
  });

  it('sector-city page includes city in title/description and canonicalises clean URL', () => {
    const src = read('src/pages/SectorCity.tsx');
    // Title is built via the shared helper (sector + city) and the
    // localized description carries the city in both AR + EN.
    expect(src).toMatch(/buildSeoTitle\(\{/);
    expect(src).toMatch(/في \$\{city\.nameAr\}/);
    expect(src).toMatch(/in \$\{city\.nameEn\}/);
    expect(src).toMatch(/SITE_URL\}\/sectors\/\$\{sectorSlug\}\/\$\{cityParam\}/);
    expect(src).toMatch(/noindex: !sector \|\| !city/);
    expect(src).not.toMatch(/2026/);
  });

  it('service detail uses construction-providers title pattern and noindex on missing service', () => {
    const src = read('src/pages/ServiceDetail.tsx');
    // Page delegates to the helper with the `service` kind; helper emits
    // the trusted-providers suffix in AR + EN.
    expect(src).toMatch(/buildSeoTitle\(\{[\s\S]{0,200}kind:\s*['"]service['"]/);
    expect(titleBuilder).toMatch(/\| عروض ومزودون موثوقون/);
    expect(titleBuilder).toMatch(/\| Quotes & Trusted Providers/);
    expect(src).toMatch(/noindex: !service/);
    expect(src).not.toMatch(/2026/);
  });

  it('brand detail uses approved-brand title pattern and noindex on unknown brand', () => {
    const src = read('src/pages/BrandDetail.tsx');
    // Page delegates to the helper with the `brand` kind; helper emits the
    // approved-brand suffix in AR + EN.
    expect(src).toMatch(/buildSeoTitle\(\{[\s\S]{0,200}kind:\s*['"]brand['"]/);
    expect(titleBuilder).toMatch(/\| مزودون معتمدون وخدمات مرتبطة/);
    expect(titleBuilder).toMatch(/\| Verified Providers & Related Services/);
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
