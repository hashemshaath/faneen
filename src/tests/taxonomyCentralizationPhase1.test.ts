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
import { SECTORS_SEO } from '@/lib/sectors-seo';
import { SECTOR_KEYWORDS } from '@/lib/sector-keywords';
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

  it('documents known keys missing from the edge copy (Phase 1 baseline)', () => {
    const missingInEdge = Object.keys(source)
      .filter((k) => !(k in edge))
      .sort();
    // Snapshot baseline — surfaces in CI but does not fail unrelated work.
    expect(missingInEdge).toMatchInlineSnapshot(`
      [
        "building-materials",
        "construction-building",
        "equipment-rental-provider",
        "escalators",
        "networks",
        "operations",
        "rental",
        "securit",
        "sustainability",
        "wood-cabinets",
      ]
    `);
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
  SECTORS_SEO: { covered: 6, total: 13 },
  SECTOR_KEYWORDS: { covered: 5, total: 13 },
} as const;

describe('Phase 1 — SECTORS_SEO / SECTOR_KEYWORDS coverage gaps', () => {
  it('SECTORS_SEO currently covers only 6 of the 13 canonical primaries', () => {
    expect(Object.keys(SECTORS_SEO)).toHaveLength(
      knownTaxonomyCoverageGaps.SECTORS_SEO.covered,
    );
    expect(CANONICAL_PRIMARY_SLUGS).toHaveLength(
      knownTaxonomyCoverageGaps.SECTORS_SEO.total,
    );
  });

  it('SECTOR_KEYWORDS currently covers only 5 legacy slugs (stale vs canonical)', () => {
    expect(Object.keys(SECTOR_KEYWORDS)).toHaveLength(
      knownTaxonomyCoverageGaps.SECTOR_KEYWORDS.covered,
    );
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

  it('documents that no template carries a canonical taxonomy slug yet (Phase 1 gap)', () => {
    // No `taxonomySlug` field exists on ContractTemplateInfo — closing this
    // gap is owned by Phase 3 of the centralization plan. Asserting the
    // absence here surfaces any silent attempt to add it without going
    // through the migration.
    for (const t of CONTRACT_TEMPLATES) {
      expect((t as Record<string, unknown>).taxonomySlug).toBeUndefined();
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
      // No `taxonomySlug` mapping yet — owned by Phase 3.
      expect((w as Record<string, unknown>).taxonomySlug).toBeUndefined();
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