import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('SEO-3 — ItemList JSON-LD on listing pages', () => {
  it('BrandsCatalog emits an ItemList sourced from approved brands only', () => {
    const src = read('src/pages/BrandsCatalog.tsx');
    // ItemList block present and tied to the visible filtered list.
    expect(src).toMatch(/'@type':\s*'ItemList'/);
    expect(src).toMatch(/\.filter\(\(b\)\s*=>\s*!!b\.slug\)/);
    // Source is the public brand reader (brands_public), not raw brand_catalog.
    expect(src).toMatch(/listApprovedBrands/);
    expect(src).not.toMatch(/from\(['"]brand_catalog['"]\)/);
    // ListItems carry stable canonical URLs.
    expect(src).toMatch(/\/brands\/\$\{b\.slug\}/);
  });

  it('BrandDetail emits an ItemList for authorized providers only (verified + visible)', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/'@type':\s*'ItemList'/);
    // Restrict to providers whose business row is loaded AND has a username
    // (mirrors the visible cards) — never enumerate unapproved/missing rows.
    expect(src).toMatch(/providerLinks\s*\.map\(\(l\)\s*=>\s*bizMap\.get\(l\.business_id\)\)/);
    expect(src).toMatch(/!!b\.username/);
    // Provider source upstream is filtered to verified relationships.
    expect(src).toMatch(/listPublicProvidersForBrand/);
  });

  it('ServiceDetail emits an ItemList for related services with canonical URLs', () => {
    const src = read('src/pages/ServiceDetail.tsx');
    expect(src).toMatch(/'@type':\s*'ItemList'/);
    expect(src).toMatch(/\$\{SITE_URL\}\/services\/\$\{r\.slug\}/);
    // No fake aggregate ratings injected.
    expect(src).not.toMatch(/'@type':\s*'AggregateRating'/);
  });

  it('Existing ItemLists on sector / sectors-hub / services / sector-city are preserved', () => {
    expect(read('src/pages/SectorsHub.tsx')).toMatch(/'@type':\s*'ItemList'/);
    expect(read('src/pages/SectorLanding.tsx')).toMatch(/'@type':\s*'ItemList'/);
    expect(read('src/pages/SectorCity.tsx')).toMatch(/'@type':\s*'ItemList'/);
    expect(read('src/pages/Services.tsx')).toMatch(/'@type':\s*'ItemList'/);
  });

  it('Listing ItemLists never enumerate admin / dashboard / auth URLs', () => {
    const files = [
      'src/pages/BrandsCatalog.tsx',
      'src/pages/BrandDetail.tsx',
      'src/pages/ServiceDetail.tsx',
      'src/pages/SectorsHub.tsx',
      'src/pages/SectorLanding.tsx',
      'src/pages/SectorCity.tsx',
      'src/pages/Services.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      // None of the ItemList builders should ever inject these private paths.
      expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/admin\//);
      expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/dashboard\//);
      expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/auth\b/);
    }
  });

  it('SectorCity ItemList still uses listPublicBusinessesForSector (public-safe)', () => {
    const src = read('src/pages/SectorCity.tsx');
    expect(src).toMatch(/listPublicBusinessesForSector/);
  });
});
