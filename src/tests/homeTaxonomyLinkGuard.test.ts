/**
 * Home Taxonomy Link Guard
 *
 * Locks the homepage category links to the *real* taxonomy slugs that
 * exist in `taxonomy_categories`. Prevents regressions where legacy
 * shorthand slugs (`aluminum`, `iron`, `wood`, `glass`, `stainless`,
 * `fabrication`) silently leak back into `HomeSectorGrid` or
 * `categoryRows.ts` — those slugs either don't exist in the taxonomy
 * at all, or (in the case of `aluminum`) point to an empty node with
 * zero linked businesses, producing dead clicks.
 *
 * Scope: homepage v2 data only. Does not touch taxonomy DB, does not
 * forbid these strings elsewhere in the app.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HOME_CATEGORY_ROWS, getCategoryRowTaxonomySlugs } from '@/components/home/v2/data/categoryRows';
import { listPublicBusinessesByTaxonomySlugs } from '@/modules/taxonomy/search-integration';
import { pickCardImageSource } from '@/components/home/v2/sections/HomeCategoryRow';

const { fromMock } = vi.hoisted(() => {
  type QueryResult = { data: unknown; error: null };

  const createQueryChain = (result: QueryResult) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(() => chain),
      then: (resolvePromise: (value: QueryResult) => void) => Promise.resolve(resolvePromise(result)),
    };
    return chain;
  };

  const mock = vi.fn((table: string) => {
    if (table === 'taxonomy_categories') {
      return createQueryChain({
        data: [
          { id: 'cat-aluminum-glass', slug: 'aluminum-glass-facades', parent_id: null },
          { id: 'cat-steel', slug: 'steel-metal-works', parent_id: null },
          { id: 'cat-wood', slug: 'wood-carpentry', parent_id: null },
          { id: 'cat-stainless', slug: 'stainless-steel-fabrication', parent_id: null },
          { id: 'cat-contracting', slug: 'contracting-finishing', parent_id: null },
        ],
        error: null,
      });
    }
    if (table === 'business_taxonomy_categories') {
      return createQueryChain({
        data: [
          { category_id: 'cat-aluminum-glass', business_id: 'biz-1' },
          { category_id: 'cat-aluminum-glass', business_id: 'biz-2' },
          { category_id: 'cat-aluminum-glass', business_id: 'biz-3' },
          { category_id: 'cat-steel', business_id: 'biz-4' },
          { category_id: 'cat-wood', business_id: 'biz-5' },
        ],
        error: null,
      });
    }
    return createQueryChain({
      data: [
        { id: 'biz-1', username: 'alu-1', name_ar: 'شركة ألمنيوم ١', name_en: 'Aluminum 1', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 5, rating_count: 3, is_verified: true, cities: { name_ar: 'الرياض', name_en: 'Riyadh' } },
        { id: 'biz-2', username: 'alu-2', name_ar: 'شركة ألمنيوم ٢', name_en: 'Aluminum 2', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 2, is_verified: true, cities: null },
        { id: 'biz-3', username: 'alu-3', name_ar: 'شركة ألمنيوم ٣', name_en: 'Aluminum 3', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 3, rating_count: 1, is_verified: false, cities: null },
        { id: 'biz-4', username: 'steel-1', name_ar: 'شركة حديد', name_en: 'Steel', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 1, is_verified: true, cities: null },
        { id: 'biz-5', username: 'wood-1', name_ar: 'شركة خشب', name_en: 'Wood', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 1, is_verified: false, cities: null },
      ],
      error: null,
    });
  });

  return { fromMock: mock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

const FORBIDDEN_SLUGS = new Set([
  'aluminum',
  'iron',
  'wood',
  'glass',
  'stainless',
  'fabrication',
]);

const ALLOWED_SLUGS = new Set([
  'aluminum-glass-facades',
  'steel-metal-works',
  'wood-carpentry',
  'stainless-steel-fabrication',
  'contracting-finishing',
  // New specialty rows added to the homepage:
  'technology-systems',
  'heavy-equipment-rental',
  'lifting',
  'scaffolding',
  'equipment-rental-provider',
]);

const SECTOR_GRID_PATH = resolve(
  process.cwd(),
  'src/components/home/v2/sections/HomeSectorGrid.tsx',
);

const CATEGORY_ROW_PATH = resolve(
  process.cwd(),
  'src/components/home/v2/sections/HomeCategoryRow.tsx',
);

const INDEX_PAGE_PATH = resolve(
  process.cwd(),
  'src/pages/Index.tsx',
);

const HERO_PATH = resolve(
  process.cwd(),
  'src/components/home/v2/HomeV2.tsx',
);

describe('Home Taxonomy Link Guard', () => {
  describe('HomeSectorGrid sector tiles', () => {
    const source = readFileSync(SECTOR_GRID_PATH, 'utf8');
    const slugs = Array.from(source.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);

    it('extracts at least one slug from HomeSectorGrid', () => {
      expect(slugs.length).toBeGreaterThan(0);
    });

    it('contains no forbidden legacy shorthand slugs', () => {
      const leaked = slugs.filter((s) => FORBIDDEN_SLUGS.has(s));
      expect(leaked, `Forbidden slugs leaked into HomeSectorGrid: ${leaked.join(', ')}`).toEqual([]);
    });

    it('only uses allowed real taxonomy slugs', () => {
      const unknown = slugs.filter((s) => !ALLOWED_SLUGS.has(s));
      expect(unknown, `Unknown slugs in HomeSectorGrid: ${unknown.join(', ')}`).toEqual([]);
    });

    it('builds links under /search?category=', () => {
      expect(source).toMatch(/\/search\?category=\$\{s\.slug\}/);
    });
  });

  describe('categoryRows data', () => {
    it('all chip slugs (where present) are in the allowed set', () => {
      const offenders: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        for (const item of row.items) {
          if (item.slug == null) continue;
          if (FORBIDDEN_SLUGS.has(item.slug)) {
            offenders.push(`${row.id} -> ${item.slug} (forbidden)`);
          } else if (!ALLOWED_SLUGS.has(item.slug)) {
            offenders.push(`${row.id} -> ${item.slug} (unknown)`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it('every chip has exactly one of slug | query — never both, never neither', () => {
      const bad: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        for (const item of row.items) {
          const hasSlug = typeof item.slug === 'string' && item.slug.length > 0;
          const hasQuery = typeof item.query === 'string' && item.query.length > 0;
          if (hasSlug === hasQuery) {
            bad.push(`${row.id} -> ${item.ar} (slug=${item.slug ?? '∅'}, query=${item.query ?? '∅'})`);
          }
        }
      }
      expect(bad, `Chips must declare exactly one of slug/query: ${bad.join('; ')}`).toEqual([]);
    });

    it('allHref always starts with /search? and uses an allowed slug when ?category= is used', () => {
      const bad: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        if (!row.allHref.startsWith('/search?')) {
          bad.push(`${row.id} -> ${row.allHref} (must start with /search?)`);
          continue;
        }
        const m = row.allHref.match(/[?&]category=([^&]+)/);
        if (!m) continue; // ?q= fallback is allowed
        const slug = decodeURIComponent(m[1]);
        if (FORBIDDEN_SLUGS.has(slug)) bad.push(`${row.id} allHref uses forbidden slug "${slug}"`);
        else if (!ALLOWED_SLUGS.has(slug)) bad.push(`${row.id} allHref uses unknown slug "${slug}"`);
      }
      expect(bad).toEqual([]);
    });

    it('every query fallback is a non-empty Arabic search string (intentional, not a slug substitute)', () => {
      const bad: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        for (const item of row.items) {
          if (item.query == null) continue;
          if (item.query.trim().length === 0) bad.push(`${row.id} -> empty query`);
          // A query fallback shouldn't be a known slug pretending to be free-text.
          if (ALLOWED_SLUGS.has(item.query)) {
            bad.push(`${row.id} -> query "${item.query}" should be a slug, not a query`);
          }
        }
      }
      expect(bad).toEqual([]);
    });

    it('every row has at least one real taxonomy slug or an explicit providerSlugs fallback', () => {
      const bad = HOME_CATEGORY_ROWS
        .filter((row) => getCategoryRowTaxonomySlugs(row).length === 0)
        .map((row) => row.id);
      expect(bad).toEqual([]);
    });

    it('renders an empty state branch for rows with no linked businesses', () => {
      const source = readFileSync(CATEGORY_ROW_PATH, 'utf8');
      expect(source).toContain('لا توجد شركات مرتبطة بهذا القطاع حاليًا');
      expect(source).toMatch(/providers\.length\s*>\s*0/);
    });
  });

  describe('home row taxonomy business loader', () => {
    it('returns the three aluminum/glass providers through the shared taxonomy binding', async () => {
      const data = await listPublicBusinessesByTaxonomySlugs(['aluminum-glass-facades'], 6);
      expect(data['aluminum-glass-facades']).toHaveLength(3);
      expect(data['aluminum-glass-facades'].map((business) => business.id)).toEqual(['biz-1', 'biz-2', 'biz-3']);
      expect(fromMock).toHaveBeenCalledWith('business_taxonomy_categories');
      expect(fromMock).toHaveBeenCalledWith('businesses_public');
      expect(fromMock).not.toHaveBeenCalledWith('businesses');
    });
  });

  describe('card image fallback chain', () => {
    const base = { logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null };
    const variants = { thumbnail: 'https://cdn/t.webp', card: 'https://cdn/c.webp', medium: 'https://cdn/m.webp', hero: 'https://cdn/h.webp' };

    it('prefers cover_image_variants', () => {
      expect(pickCardImageSource({ ...base, cover_image_variants: variants, cover_url: 'x', logo_url: 'y' }).kind).toBe('cover');
    });
    it('falls back to cover_url when no cover variants', () => {
      const s = pickCardImageSource({ ...base, cover_url: 'https://cdn/c.jpg', logo_url: 'https://cdn/l.jpg' });
      expect(s.kind).toBe('cover');
      expect(s.kind === 'cover' && s.url).toBe('https://cdn/c.jpg');
    });
    it('falls back to logo_image_variants when no cover', () => {
      expect(pickCardImageSource({ ...base, logo_image_variants: variants }).kind).toBe('logo');
    });
    it('falls back to logo_url when no cover and no logo variants', () => {
      expect(pickCardImageSource({ ...base, logo_url: 'https://cdn/l.jpg' }).kind).toBe('logo');
    });
    it('returns placeholder when nothing is available', () => {
      expect(pickCardImageSource(base).kind).toBe('placeholder');
    });
  });

  describe('JSON-LD ItemList (Index.tsx) — taxonomy slugs', () => {
    const source = readFileSync(INDEX_PAGE_PATH, 'utf8');
    // Extract the ItemList block (between "ItemList" and the closing of itemListElement map)
    const block = source.split('قطاعات الصناعات الخفيفة')[1] ?? '';
    const slugs = Array.from(block.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);

    it('extracts slugs from the homepage JSON-LD ItemList', () => {
      expect(slugs.length).toBeGreaterThan(0);
    });

    it('contains no forbidden legacy slugs', () => {
      const leaked = slugs.filter((s) => FORBIDDEN_SLUGS.has(s));
      expect(leaked, `Forbidden slugs leaked into Index.tsx JSON-LD: ${leaked.join(', ')}`).toEqual([]);
    });

    it('all JSON-LD slugs are in the allowed set', () => {
      const unknown = slugs.filter((s) => !ALLOWED_SLUGS.has(s));
      expect(unknown, `Unknown slugs in Index.tsx JSON-LD: ${unknown.join(', ')}`).toEqual([]);
    });

    it('includes the new specialty slugs (technology-systems, heavy-equipment-rental)', () => {
      expect(slugs).toContain('technology-systems');
      expect(slugs).toContain('heavy-equipment-rental');
    });
  });

  describe('new homepage specialty rows', () => {
    const rowIds = HOME_CATEGORY_ROWS.map((row) => row.id);

    it('includes the technology / smart systems row', () => {
      expect(rowIds).toContain('technology-systems');
      const row = HOME_CATEGORY_ROWS.find((r) => r.id === 'technology-systems')!;
      expect(getCategoryRowTaxonomySlugs(row)).toContain('technology-systems');
    });

    it('includes the equipment rental row bound to real rental taxonomy', () => {
      expect(rowIds).toContain('equipment-rental');
      const row = HOME_CATEGORY_ROWS.find((r) => r.id === 'equipment-rental')!;
      const slugs = getCategoryRowTaxonomySlugs(row);
      expect(slugs).toContain('heavy-equipment-rental');
    });

    it('does NOT add fake/empty rows for energy or elevators (taxonomy gap — TODO only)', () => {
      // These categories have no corresponding taxonomy slug yet.
      // Spec rule: prefer a TODO over linking to fake/empty categories.
      expect(rowIds).not.toContain('energy-sustainability');
      expect(rowIds).not.toContain('elevators-escalators');
    });
  });

  describe('Hero TRENDING + slide copy (HomeV2.tsx)', () => {
    const source = readFileSync(HERO_PATH, 'utf8');
    const trendingCats = Array.from(source.matchAll(/cat:\s*'([^']+)'/g)).map((m) => m[1]);

    it('extracts trending categories', () => {
      expect(trendingCats.length).toBeGreaterThan(0);
    });

    it('TRENDING.cat values use only real taxonomy slugs (no legacy shorthand)', () => {
      const leaked = trendingCats.filter((s) => FORBIDDEN_SLUGS.has(s));
      expect(leaked, `Forbidden slugs leaked into hero TRENDING: ${leaked.join(', ')}`).toEqual([]);
      const unknown = trendingCats.filter((s) => !ALLOWED_SLUGS.has(s));
      expect(unknown, `Unknown slugs in hero TRENDING: ${unknown.join(', ')}`).toEqual([]);
    });

    it('slide 0 title no longer enumerates raw legacy category words', () => {
      // The old copy "مزودو الألمنيوم والحديد والخشب والزجاج" leaks legacy
      // sector names directly into the LCP element. Keep the headline generic.
      expect(source).not.toMatch(/مزودو الألمنيوم والحديد والخشب والزجاج/);
    });
  });
});