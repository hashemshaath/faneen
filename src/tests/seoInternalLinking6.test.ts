import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SEO-6 — internal linking & hub/spoke depth audit.
 * Verifies that hub pages (sectors, brands) and detail pages
 * cross-link to sibling SEO hubs via real, crawlable <Link to="...">
 * elements, and that those links never target private/session routes.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const PUBLIC_HUBS = ['/sectors', '/services', '/brands'];

// Truly private/session routes that must never be linked as crawlable
// internal links from SEO sections. Public conversion CTAs (/auth signup,
// /quote, /contact) are allowed.
const PRIVATE_PREFIXES = [
  '/admin',
  '/onboarding',
  '/settings',
  '/notifications',
];

/** Extract every `to="..."` href literal from a TSX source. */
function extractLinkTargets(src: string): string[] {
  const out: string[] = [];
  const re = /to=(?:"([^"]+)"|\{`([^`$]+)`\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push(m[1] ?? m[2]);
  }
  return out;
}

describe('SEO-6 internal linking — hub cross-links', () => {
  it.each([
    ['src/pages/SectorsHub.tsx', PUBLIC_HUBS],
    ['src/pages/SectorLanding.tsx', PUBLIC_HUBS],
    ['src/pages/BrandsCatalog.tsx', ['/sectors', '/services']],
    ['src/pages/BrandDetail.tsx', PUBLIC_HUBS],
  ])('%s links to required public hubs %j', (file, required) => {
    const targets = extractLinkTargets(read(file));
    for (const hub of required) {
      expect(targets, `${file} missing link to ${hub}`).toContain(hub);
    }
  });

  it('SectorLanding still links to related sectors and city variants', () => {
    const src = read('src/pages/SectorLanding.tsx');
    expect(src).toMatch(/to=\{`\/sectors\/\$\{rs\.slug\}`\}/);
  });

  it('ServiceDetail keeps sector + services-hub + related-services links', () => {
    const targets = extractLinkTargets(read('src/pages/ServiceDetail.tsx'));
    expect(targets).toContain('/services');
    expect(targets.some((t) => t.startsWith('/sectors/'))).toBe(true);
    expect(targets.some((t) => t.startsWith('/services/'))).toBe(true);
  });

  it('SectorCity keeps parent-sector + sibling-city + service links', () => {
    const targets = extractLinkTargets(read('src/pages/SectorCity.tsx'));
    expect(targets.some((t) => t.startsWith('/sectors/'))).toBe(true);
    expect(targets.some((t) => t.startsWith('/services/'))).toBe(true);
  });
});

describe('SEO-6 internal linking — safety', () => {
  const files = [
    'src/pages/SectorsHub.tsx',
    'src/pages/SectorLanding.tsx',
    'src/pages/SectorCity.tsx',
    'src/pages/ServiceDetail.tsx',
    'src/pages/BrandsCatalog.tsx',
    'src/pages/BrandDetail.tsx',
  ];

  it.each(files)('%s does not link to private/session routes from SEO sections', (file) => {
    const src = read(file);
    const targets = extractLinkTargets(src);
    for (const t of targets) {
      for (const prefix of PRIVATE_PREFIXES) {
        expect(
          t.startsWith(prefix),
          `${file} links to private route ${t}`,
        ).toBe(false);
      }
      // /dashboard/* links must be explicitly rel="nofollow" (verified
      // separately for BrandDetail). Other SEO pages must not link there.
      if (file !== 'src/pages/BrandDetail.tsx') {
        expect(
          t.startsWith('/dashboard'),
          `${file} links to private dashboard route ${t}`,
        ).toBe(false);
      }
      // Never expose search-query or compare-ids urls as crawlable internal links
      expect(t.startsWith('/search?q=')).toBe(false);
      expect(t.startsWith('/compare?ids=')).toBe(false);
    }
  });

  it('BrandDetail tags its private dashboard correction link with rel="nofollow"', () => {
    const src = read('src/pages/BrandDetail.tsx');
    expect(src).toMatch(/to="\/dashboard\/brands"[^>]*rel="nofollow"/);
  });
});
