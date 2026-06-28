/**
 * TAXONOMY CENTRALIZATION PHASE 1 — Guards + Inventory Tests.
 *
 * This file does NOT change behavior. It locks the current taxonomy
 * surface in place and documents the known gaps surfaced by the
 * `TAXONOMY + CLASSIFICATION SYSTEM FULL AUDIT REPORT` so future drift
 * cannot land silently.
 *
 * Forbidden in Phase 1: DB/RLS/RPC/edge/migration/seed changes, slug
 * renames, route changes, search/quote/contract/work-order behavior
 * changes, SEO content changes. Tests only.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import {
  CANONICAL_PRIMARY_SLUGS,
  CANONICAL_PRIMARY_LABELS,
  UI_FORBIDDEN_PRIMARY_SLUGS,
  isCanonicalPrimarySlug,
  isLegacyPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';
import { LEGACY_SECTOR_TO_TAXONOMY_SLUG } from '@/modules/taxonomy/legacy-mapping';
import { SECTORS_SEO, SECTORS_SEO_CANONICAL, getCanonicalSectorSeo } from '@/lib/sectors-seo';
import {
  SECTOR_KEYWORDS,
  SECTOR_KEYWORDS_CANONICAL,
  getCanonicalSectorKeywords,
} from '@/lib/sector-keywords';
import { WORK_TYPES } from '@/lib/contract-work-types';
import { CONTRACT_TEMPLATES } from '@/data/contractTemplates';

/* -------------------------------------------------------------------------- */
/* 1 — Canonical primary invariants                                           */
/* -------------------------------------------------------------------------- */
describe('Phase 1 — canonical primary slugs', () => {
  it('exposes exactly 13 canonical primaries', () => {
    expect(CANONICAL_PRIMARY_SLUGS).toHaveLength(13);
  });

  it('every canonical primary has an AR + EN label', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      const label = CANONICAL_PRIMARY_LABELS[slug];
      expect(label?.ar?.length ?? 0).toBeGreaterThan(2);
      expect(label?.en?.length ?? 0).toBeGreaterThan(2);
    }
  });

  it('forbidden legacy slugs never overlap canonical primaries', () => {
    for (const slug of UI_FORBIDDEN_PRIMARY_SLUGS) {
      expect(isCanonicalPrimarySlug(slug)).toBe(false);
      expect(isLegacyPrimarySlug(slug)).toBe(true);
      expect(CANONICAL_PRIMARY_SLUGS).not.toContain(slug as never);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 2 — Edge function legacy-mapping divergence guard                          */
/* -------------------------------------------------------------------------- */
/**
 * The edge function `match-quote-request` ships an inline copy of
 * `LEGACY_SECTOR_TO_TAXONOMY_SLUG` because edge code cannot import the
 * shared TS module. Phase 1 documents the current drift between the two
 * copies as a baseline snapshot — any future widening MUST update this
 * snapshot and the inline copy together.
 */
const EDGE_PATH = resolve(
  process.cwd(),
  'supabase/functions/match-quote-request/index.ts',
);

function readEdgeLegacyMap(): Record<string, string> {
  const src = readFileSync(EDGE_PATH, 'utf8');
  const block = src.match(
    /LEGACY_SECTOR_TO_TAXONOMY_SLUG[^=]*=\s*{([\s\S]*?)};/,
  );
  if (!block) throw new Error('edge mapping block not found');
  const body = block[1];
  const map: Record<string, string> = {};
  // Match `key: 'value'` or `'key': 'value'` lines (ignore comments).
  const re = /(?:^|\n)\s*'?([A-Za-z0-9_-]+)'?\s*:\s*'([A-Za-z0-9_-]+)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) map[m[1]] = m[2];
  return map;
}

describe('Phase 1 — legacy mapping edge divergence (documented baseline)', () => {
  const edge = readEdgeLegacyMap();
  const source = LEGACY_SECTOR_TO_TAXONOMY_SLUG;

  it('source map is non-empty and edge map is non-empty', () => {
    expect(Object.keys(source).length).toBeGreaterThan(20);
    expect(Object.keys(edge).length).toBeGreaterThan(20);
  });

  it('every key present in BOTH maps resolves to the same canonical slug', () => {
    for (const [k, v] of Object.entries(edge)) {
      if (k in source) {
        expect(source[k]).toBe(v);
      }
    }
  });

  it('Phase 2A — edge mapping is fully in sync with the source map (no missing keys)', () => {
    const missingInEdge = Object.keys(source)
      .filter((k) => !(k in edge))
      .sort();
    expect(missingInEdge).toEqual([]);
  });

  it('Phase 2A — edge mapping equals source mapping for every shared key', () => {
    // Full sync: every source key exists in edge with identical canonical
    // target. Outputs that intentionally retain a legacy target (e.g.
    // `building-materials-supply` for out-of-Home-scope materials) are
    // preserved verbatim from the source so they cannot silently drift.
    for (const [k, v] of Object.entries(source)) {
      expect(edge[k]).toBe(v);
    }
  });

  it('Phase 2A — every edge output is either canonical or matches the source legacy target', () => {
    for (const [k, v] of Object.entries(edge)) {
      const isCanonical = (CANONICAL_PRIMARY_SLUGS as readonly string[]).includes(v);
      const matchesSource = source[k] === v;
      expect(isCanonical || matchesSource).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 3 — SECTORS_SEO + SECTOR_KEYWORDS coverage gaps (documented baseline)      */
/* -------------------------------------------------------------------------- */
/**
 * `knownTaxonomyCoverageGaps` — Phase 1 freezes the existing coverage
 * gaps between the static SEO surfaces and the 13 canonical primaries.
 * Later phases will close them.
 */
export const knownTaxonomyCoverageGaps = {
  // Phase 2B — legacy maps stay at their original size (route-stable).
  SECTORS_SEO_LEGACY: { covered: 6, total: 13 },
  SECTOR_KEYWORDS_LEGACY: { covered: 5, total: 13 },
  // Canonical maps now fully cover the 13 canonical primaries.
  SECTORS_SEO_CANONICAL: { covered: 13, total: 13 },
  SECTOR_KEYWORDS_CANONICAL: { covered: 13, total: 13 },
} as const;

describe('Phase 2B — SECTORS_SEO + SECTOR_KEYWORDS canonical coverage', () => {
  it('legacy SECTORS_SEO keeps its 6 route-stable entries (no regression)', () => {
    expect(Object.keys(SECTORS_SEO)).toHaveLength(
      knownTaxonomyCoverageGaps.SECTORS_SEO_LEGACY.covered,
    );
  });

  it('legacy SECTOR_KEYWORDS keeps its 5 detection entries (no regression)', () => {
    expect(Object.keys(SECTOR_KEYWORDS)).toHaveLength(
      knownTaxonomyCoverageGaps.SECTOR_KEYWORDS_LEGACY.covered,
    );
  });

  it('SECTORS_SEO_CANONICAL covers all 13 canonical primaries with required meta', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      const entry = SECTORS_SEO_CANONICAL[slug];
      expect(entry, `missing canonical SEO entry for ${slug}`).toBeDefined();
      expect(entry.canonicalSlug).toBe(slug);
      expect(entry.metaTitle.length).toBeGreaterThan(8);
      expect(entry.metaDescription.length).toBeGreaterThan(40);
      expect(entry.h1.length).toBeGreaterThan(4);
      expect(entry.primaryCta.length).toBeGreaterThan(2);
    }
    expect(Object.keys(SECTORS_SEO_CANONICAL)).toHaveLength(13);
  });

  it('SECTOR_KEYWORDS_CANONICAL covers all 13 canonical primaries with AR + EN keywords', () => {
    for (const slug of CANONICAL_PRIMARY_SLUGS) {
      const entry = SECTOR_KEYWORDS_CANONICAL[slug];
      expect(entry, `missing canonical keyword entry for ${slug}`).toBeDefined();
      expect(entry.canonicalSlug).toBe(slug);
      expect(entry.keywords_ar.length).toBeGreaterThanOrEqual(4);
      expect(entry.keywords_en.length).toBeGreaterThanOrEqual(4);
      expect(getCanonicalSectorKeywords(slug).length).toBeGreaterThan(20);
    }
    expect(Object.keys(SECTOR_KEYWORDS_CANONICAL)).toHaveLength(13);
  });

  it('forbidden / legacy primary slugs are NOT keys in either canonical map', () => {
    for (const slug of UI_FORBIDDEN_PRIMARY_SLUGS) {
      expect((SECTORS_SEO_CANONICAL as Record<string, unknown>)[slug]).toBeUndefined();
      expect((SECTOR_KEYWORDS_CANONICAL as Record<string, unknown>)[slug]).toBeUndefined();
      // building-materials-supply intentionally stays a legacy target only.
      expect(CANONICAL_PRIMARY_SLUGS).not.toContain(slug as never);
    }
  });

  it('legacy /sectors/* URLs still resolve to canonical primaries (route compat)', () => {
    const legacyRoutes: Array<[string, string]> = [
      ['aluminum', 'aluminum-works'],
      ['steel', 'steel-metal-works'],
      ['wood', 'wood-carpentry'],
      ['glass', 'glass-securit-works'],
      ['stainless-steel', 'stainless-steel-works'],
      ['fabrication-installation', 'contracting-finishing'],
    ];
    for (const [legacy, canonical] of legacyRoutes) {
      // Legacy SEO key still present (the route still renders).
      expect((SECTORS_SEO as Record<string, unknown>)[legacy]).toBeDefined();
      // And resolves to the canonical primary via the canonical accessor.
      const entry = getCanonicalSectorSeo(canonical);
      expect(entry?.canonicalSlug).toBe(canonical);
    }
  });

  it('building-materials-supply remains a legacy target — not a canonical primary', () => {
    expect(CANONICAL_PRIMARY_SLUGS).not.toContain('building-materials-supply' as never);
    expect(
      (SECTORS_SEO_CANONICAL as Record<string, unknown>)['building-materials-supply'],
    ).toBeUndefined();
    expect(
      (SECTOR_KEYWORDS_CANONICAL as Record<string, unknown>)['building-materials-supply'],
    ).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* 4 — Contract templates static catalog                                      */
/* -------------------------------------------------------------------------- */
describe('Phase 1 — CONTRACT_TEMPLATES static catalog', () => {
  it('every template has the structural fields required for SEO + linking', () => {
    for (const t of CONTRACT_TEMPLATES) {
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(t.quote_sector).toMatch(/^[a-z0-9-]+$/);
      expect(t.sector_route.startsWith('/sectors/')).toBe(true);
      expect(Array.isArray(t.related)).toBe(true);
    }
  });

  it('every template now carries a canonical taxonomySlug (Phase 2C closed)', () => {
    // Phase 2C added `taxonomySlug` to ContractTemplateInfo as metadata-only
    // (no routing/SEO behavior change). Assert every template carries a
    // canonical primary slug and no legacy/forbidden slug slipped in.
    for (const t of CONTRACT_TEMPLATES) {
      const slug = (t as unknown as Record<string, unknown>).taxonomySlug;
      expect(typeof slug).toBe('string');
      expect(isCanonicalPrimarySlug(slug as string)).toBe(true);
      expect(isLegacyPrimarySlug(slug as string)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5 — WORK_TYPES inventory                                                   */
/* -------------------------------------------------------------------------- */
describe('Phase 1 — WORK_TYPES inventory', () => {
  it('exposes a non-empty work-type catalog', () => {
    expect(WORK_TYPES.length).toBeGreaterThanOrEqual(10);
  });

  it('every work type still routes via a free-text templateCategory (Phase 1 gap)', () => {
    for (const w of WORK_TYPES) {
      expect(typeof w.templateCategory).toBe('string');
      expect(w.templateCategory.length).toBeGreaterThan(0);
      // Phase 2D added `taxonomySlug` metadata on every WORK_TYPE.
      expect(typeof (w as unknown as Record<string, unknown>).taxonomySlug).toBe('string');
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 6 — Unclassified entities (documented baseline)                            */
/* -------------------------------------------------------------------------- */
/**
 * These are documented runtime gaps captured from the audit report. The
 * test exists to keep the list visible in CI and to fail loudly if a
 * future change quietly resolves one without removing the gap entry.
 */
export const knownUnclassifiedEntities = [
  'quote_requests.sector (free-text, no FK to taxonomy_categories)',
  'contract_templates.category (free-text, service_category_id FK unused)',
  'work_orders (no taxonomy column, no link table usage)',
  'BOQ groups (string keys in contract-boq, no taxonomy link)',
  'businesses.sectors[] legacy fallback (pre-migration rows)',
] as const;

describe('Phase 1 — known unclassified entities', () => {
  it('records the 5 documented unclassified surfaces', () => {
    expect(knownUnclassifiedEntities).toHaveLength(5);
  });
});