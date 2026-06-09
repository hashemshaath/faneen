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
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HOME_CATEGORY_ROWS } from '@/components/home/v2/data/categoryRows';

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
]);

const SECTOR_GRID_PATH = resolve(
  process.cwd(),
  'src/components/home/v2/sections/HomeSectorGrid.tsx',
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
  });
});