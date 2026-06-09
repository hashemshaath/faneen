/**
 * Home Taxonomy Link Guard
 *
 * Locks the homepage to the single source of truth in
 * `src/components/home/v2/data/homeTaxonomy.ts`.
 *
 * Hard guarantees enforced here (any regression FAILS the build):
 *   1. No homepage file (Hero, SectorGrid, CategoryRows data,
 *      CategoryRow component, Featured, Index JSON-LD) may contain
 *      a forbidden legacy slug as a `/search?category=<slug>` link
 *      or `cat: '<slug>'` value.
 *   2. Every `/search?category=<slug>` href produced anywhere in
 *      homepage source files must resolve to a slug in
 *      HOME_ALLOWED_SLUGS.
 *   3. Every business-card link in homepage components uses
 *      `/${username ?? id}` — never `/q/${...}` (that's the barcode
 *      dispatcher and breaks for usernames).
 *   4. TRENDING, SectorGrid, CategoryRows, JSON-LD all reference
 *      the single homeTaxonomy module.
 *   5. The aluminum/glass row binds to `aluminum-glass-facades` and
 *      the loader returns the three providers expected for it.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HOME_TAXONOMY,
  HOME_ALLOWED_SLUGS,
  HOME_FORBIDDEN_SLUGS,
  HOME_TRENDING,
  HOME_SECTOR_GRID_SLUGS,
  HOME_ROW_BINDINGS,
  HOME_JSONLD_SLUGS,
  homeCategoryHref,
  getHomeTaxonomyEntry,
} from '@/components/home/v2/data/homeTaxonomy';
import { HOME_CATEGORY_ROWS, getCategoryRowTaxonomySlugs } from '@/components/home/v2/data/categoryRows';
import { listPublicBusinessesByTaxonomySlugs } from '@/modules/taxonomy/search-integration';
import { pickCardImageSource } from '@/components/home/v2/sections/HomeCategoryRow';

// ─────────────────────────── Supabase mock ───────────────────────────
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
          { id: 'cat-tech', slug: 'technology-systems', parent_id: null },
          { id: 'cat-rental', slug: 'heavy-equipment-rental', parent_id: null },
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
        { id: 'biz-1', username: 'alu-1', name_ar: 'شركة ١', name_en: 'Co 1', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 5, rating_count: 3, is_verified: true, cities: { name_ar: 'الرياض', name_en: 'Riyadh' } },
        { id: 'biz-2', username: 'alu-2', name_ar: 'شركة ٢', name_en: 'Co 2', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 2, is_verified: true, cities: null },
        { id: 'biz-3', username: 'alu-3', name_ar: 'شركة ٣', name_en: 'Co 3', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 3, rating_count: 1, is_verified: false, cities: null },
        { id: 'biz-4', username: 'steel-1', name_ar: 'حديد', name_en: 'Steel', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 1, is_verified: true, cities: null },
        { id: 'biz-5', username: 'wood-1', name_ar: 'خشب', name_en: 'Wood', logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null, rating_avg: 4, rating_count: 1, is_verified: false, cities: null },
      ],
      error: null,
    });
  });
  return { fromMock: mock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

// ─────────────────────────── Source files ───────────────────────────
const SRC = (p: string) => resolve(process.cwd(), p);
const FILES = {
  hero:        SRC('src/components/home/v2/HomeV2.tsx'),
  sectorGrid:  SRC('src/components/home/v2/sections/HomeSectorGrid.tsx'),
  categoryRow: SRC('src/components/home/v2/sections/HomeCategoryRow.tsx'),
  featured:    SRC('src/components/home/v2/sections/HomeFeaturedShowcase.tsx'),
  rowsData:    SRC('src/components/home/v2/data/categoryRows.ts'),
  index:       SRC('src/pages/Index.tsx'),
  taxonomy:    SRC('src/components/home/v2/data/homeTaxonomy.ts'),
};

const readAll = () => {
  const out: Record<keyof typeof FILES, string> = {} as never;
  (Object.keys(FILES) as (keyof typeof FILES)[]).forEach((k) => {
    out[k] = readFileSync(FILES[k], 'utf8');
  });
  return out;
};

// Extract every `/search?category=<slug>` substring from a source file.
// Matches both raw string literals and template strings (`category=${...}`
// is excluded — those go through homeCategoryHref()).
const extractCategoryHrefs = (source: string): string[] => {
  const out: string[] = [];
  for (const m of source.matchAll(/\/search\?category=([a-z0-9-]+)/g)) {
    out.push(m[1]);
  }
  return out;
};

// ─────────────────────────── Tests ───────────────────────────
describe('Home Taxonomy Link Guard', () => {
  const files = readAll();

  describe('homeTaxonomy.ts (single source of truth)', () => {
    it('every entry has a real-looking slug (not legacy shorthand)', () => {
      const leaked = HOME_TAXONOMY.filter((e) => HOME_FORBIDDEN_SLUGS.has(e.slug));
      expect(leaked.map((e) => e.slug)).toEqual([]);
    });

    it('exposes derived lists for every consumer', () => {
      expect(HOME_SECTOR_GRID_SLUGS.length).toBe(6);
      expect(HOME_ROW_BINDINGS.length).toBe(7);
      expect(HOME_JSONLD_SLUGS.length).toBe(7);
      expect(HOME_TRENDING.length).toBeGreaterThan(0);
    });

    it('homeCategoryHref returns canonical /search?category= URLs', () => {
      expect(homeCategoryHref('aluminum-glass-facades')).toBe('/search?category=aluminum-glass-facades');
    });
  });

  describe('Hero TRENDING (derived from homeTaxonomy)', () => {
    it('every trending cat is in HOME_ALLOWED_SLUGS', () => {
      const bad = HOME_TRENDING.filter((t) => !HOME_ALLOWED_SLUGS.has(t.cat));
      expect(bad.map((t) => `${t.ar} -> ${t.cat}`)).toEqual([]);
    });

    it('no trending cat is a forbidden legacy slug', () => {
      const bad = HOME_TRENDING.filter((t) => HOME_FORBIDDEN_SLUGS.has(t.cat));
      expect(bad).toEqual([]);
    });

    it('HomeV2.tsx imports TRENDING from homeTaxonomy and contains no inline `cat: \'<slug>\'`', () => {
      expect(files.hero).toMatch(/from\s+['"]@\/components\/home\/v2\/data\/homeTaxonomy['"]/);
      // No inline TRENDING list with hardcoded `cat: '...'` should remain.
      const inlineCats = Array.from(files.hero.matchAll(/cat:\s*'([^']+)'/g)).map((m) => m[1]);
      expect(inlineCats, `Hero file still has hardcoded cat slugs: ${inlineCats.join(', ')}`).toEqual([]);
    });
  });

  describe('HomeSectorGrid sector tiles', () => {
    it('imports homeCategoryHref + HOME_ALLOWED_SLUGS from homeTaxonomy', () => {
      expect(files.sectorGrid).toMatch(/from\s+['"]@\/components\/home\/v2\/data\/homeTaxonomy['"]/);
      expect(files.sectorGrid).toMatch(/homeCategoryHref/);
    });

    it('every slug in the SECTORS list is allowed', () => {
      const slugs = Array.from(files.sectorGrid.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);
      expect(slugs.length).toBeGreaterThan(0);
      const bad = slugs.filter((s) => !HOME_ALLOWED_SLUGS.has(s));
      expect(bad, `Unknown sector slugs: ${bad.join(', ')}`).toEqual([]);
      const legacy = slugs.filter((s) => HOME_FORBIDDEN_SLUGS.has(s));
      expect(legacy, `Forbidden sector slugs: ${legacy.join(', ')}`).toEqual([]);
    });

    it('aluminum tile binds to `aluminum-glass-facades`', () => {
      expect(files.sectorGrid).toMatch(/slug:\s*'aluminum-glass-facades'[\s\S]+titleAr:\s*'ألمنيوم'/);
    });
  });

  describe('categoryRows data (derived from HOME_ROW_BINDINGS)', () => {
    it('rowsData imports HOME_ROW_BINDINGS + homeCategoryHref', () => {
      expect(files.rowsData).toMatch(/HOME_ROW_BINDINGS/);
      expect(files.rowsData).toMatch(/homeCategoryHref/);
    });

    it('all rows produce only allowed slugs (no legacy shorthand)', () => {
      const offenders: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        for (const slug of getCategoryRowTaxonomySlugs(row)) {
          if (HOME_FORBIDDEN_SLUGS.has(slug)) offenders.push(`${row.id} -> ${slug} (forbidden)`);
          else if (!HOME_ALLOWED_SLUGS.has(slug)) offenders.push(`${row.id} -> ${slug} (unknown)`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('every chip has exactly one of slug | query', () => {
      const bad: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        for (const item of row.items) {
          const hasSlug = typeof item.slug === 'string' && item.slug.length > 0;
          const hasQuery = typeof item.query === 'string' && item.query.length > 0;
          if (hasSlug === hasQuery) bad.push(`${row.id} -> ${item.ar}`);
        }
      }
      expect(bad).toEqual([]);
    });

    it('every row allHref starts with /search?category= and uses an allowed slug', () => {
      const bad: string[] = [];
      for (const row of HOME_CATEGORY_ROWS) {
        if (!row.allHref.startsWith('/search?category=')) {
          bad.push(`${row.id} -> ${row.allHref}`);
          continue;
        }
        const slug = row.allHref.replace('/search?category=', '');
        if (!HOME_ALLOWED_SLUGS.has(slug)) bad.push(`${row.id} allHref slug "${slug}" not allowed`);
      }
      expect(bad).toEqual([]);
    });

    it('the seven approved rows exist; no energy or elevators row leaked in', () => {
      const ids = HOME_CATEGORY_ROWS.map((r) => r.id);
      expect(ids).toEqual([
        'iron-stainless',
        'aluminum-glass',
        'facades-cladding',
        'kitchens-wood',
        'fabrication',
        'technology-systems',
        'equipment-rental',
      ]);
      expect(ids).not.toContain('energy-sustainability');
      expect(ids).not.toContain('elevators-escalators');
    });

    it('aluminum/glass row binds to `aluminum-glass-facades`', () => {
      const row = HOME_CATEGORY_ROWS.find((r) => r.id === 'aluminum-glass')!;
      expect(getCategoryRowTaxonomySlugs(row)).toContain('aluminum-glass-facades');
    });

    it('renders an empty-state branch in HomeCategoryRow', () => {
      expect(files.categoryRow).toContain('لا توجد شركات مرتبطة بهذا القطاع حاليًا');
      expect(files.categoryRow).toMatch(/providers\.length\s*>\s*0/);
    });
  });

  describe('JSON-LD ItemList (Index.tsx)', () => {
    it('imports HOME_JSONLD_SLUGS + getHomeTaxonomyEntry from homeTaxonomy', () => {
      expect(files.index).toMatch(/HOME_JSONLD_SLUGS/);
      expect(files.index).toMatch(/getHomeTaxonomyEntry/);
    });

    it('every HOME_JSONLD_SLUGS entry resolves to a real taxonomy entry', () => {
      for (const slug of HOME_JSONLD_SLUGS) {
        const e = getHomeTaxonomyEntry(slug);
        expect(e, `Missing homeTaxonomy entry for "${slug}"`).toBeTruthy();
      }
    });

    it('no inline JSON-LD slug strings remain in Index.tsx', () => {
      // After the refactor, slugs come from HOME_JSONLD_SLUGS — there must
      // be no `slug: '<real-slug>'` literal in the ItemList block anymore.
      const itemListBlock = files.index.split('قطاعات الصناعات الخفيفة')[1] ?? '';
      const inlineSlugs = Array.from(itemListBlock.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);
      expect(inlineSlugs, `Inline JSON-LD slugs leaked: ${inlineSlugs.join(', ')}`).toEqual([]);
    });
  });

  describe('Cross-file scan — no forbidden slugs anywhere on the homepage', () => {
    it('no /search?category=<legacy> in any homepage file', () => {
      const bad: string[] = [];
      for (const [key, src] of Object.entries(files) as [keyof typeof files, string][]) {
        if (key === 'taxonomy') continue; // the source file may mention them as forbidden examples
        for (const slug of extractCategoryHrefs(src)) {
          if (HOME_FORBIDDEN_SLUGS.has(slug)) bad.push(`${key}: ${slug}`);
        }
      }
      expect(bad, `Forbidden category= hrefs found: ${bad.join('; ')}`).toEqual([]);
    });

    it('every literal /search?category=<slug> in homepage files uses an allowed slug', () => {
      const bad: string[] = [];
      for (const [key, src] of Object.entries(files) as [keyof typeof files, string][]) {
        if (key === 'taxonomy') continue;
        for (const slug of extractCategoryHrefs(src)) {
          if (!HOME_ALLOWED_SLUGS.has(slug)) bad.push(`${key}: ${slug}`);
        }
      }
      expect(bad, `Unknown category= hrefs: ${bad.join('; ')}`).toEqual([]);
    });
  });

  describe('Business-card links — never use /q/ on homepage', () => {
    it('HomeCategoryRow business cards link to /${username ?? id}, not /q/', () => {
      expect(files.categoryRow).not.toMatch(/to=\{`\/q\//);
      expect(files.categoryRow).not.toMatch(/href\s*=\s*`\/q\//);
    });

    it('HomeFeaturedShowcase business cards link to /${username ?? id}, not /q/', () => {
      // Only allow `/q/` to appear inside a comment, not inside a template/string used as href.
      expect(files.featured).not.toMatch(/href\s*=\s*[`'"]\/q\//);
      expect(files.featured).not.toMatch(/to=\{`\/q\//);
    });
  });

  describe('Provider loader — aluminum/glass yields three businesses', () => {
    it('returns the three providers via the shared taxonomy binding', async () => {
      const data = await listPublicBusinessesByTaxonomySlugs(['aluminum-glass-facades'], 6);
      expect(data['aluminum-glass-facades']).toHaveLength(3);
      expect(data['aluminum-glass-facades'].map((b) => b.id)).toEqual(['biz-1', 'biz-2', 'biz-3']);
      expect(fromMock).toHaveBeenCalledWith('businesses_public');
      expect(fromMock).not.toHaveBeenCalledWith('businesses');
    });
  });

  describe('Card image fallback chain (unchanged)', () => {
    const base = { logo_url: null, logo_image_variants: null, cover_url: null, cover_image_variants: null };
    const variants = { thumbnail: 'https://cdn/t.webp', card: 'https://cdn/c.webp', medium: 'https://cdn/m.webp', hero: 'https://cdn/h.webp' };
    it('prefers cover_image_variants', () => {
      expect(pickCardImageSource({ ...base, cover_image_variants: variants, cover_url: 'x', logo_url: 'y' }).kind).toBe('cover');
    });
    it('falls back to cover_url', () => {
      const s = pickCardImageSource({ ...base, cover_url: 'https://cdn/c.jpg', logo_url: 'https://cdn/l.jpg' });
      expect(s.kind).toBe('cover');
    });
    it('falls back to logo_image_variants', () => {
      expect(pickCardImageSource({ ...base, logo_image_variants: variants }).kind).toBe('logo');
    });
    it('falls back to logo_url', () => {
      expect(pickCardImageSource({ ...base, logo_url: 'https://cdn/l.jpg' }).kind).toBe('logo');
    });
    it('returns placeholder when nothing is available', () => {
      expect(pickCardImageSource(base).kind).toBe('placeholder');
    });
  });
});
