/**
 * Phase 4B — Work Order Taxonomy Helper tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveWorkOrderTaxonomy,
} from '@/modules/taxonomy/resolveWorkOrderTaxonomy';
import { CANONICAL_PRIMARY_SLUGS } from '@/modules/taxonomy/canonical-primaries';

const CANONICAL_SET = new Set<string>(CANONICAL_PRIMARY_SLUGS);

describe('Phase 4B — resolveWorkOrderTaxonomy priority', () => {
  it('1. contract taxonomy wins over all other sources', () => {
    const out = resolveWorkOrderTaxonomy({
      contractTaxonomySlug: 'aluminum-works',
      contractTemplateTaxonomySlug: 'wood-carpentry',
      quoteTaxonomySlug: 'kitchens-works',
      projectTaxonomySlug: 'facades-cladding',
      workTypeKey: 'iron_doors_windows',
      legacySector: 'glass',
    });
    expect(out.status).toBe('resolved');
    expect(out.source).toBe('contract_taxonomy');
    expect(out.taxonomySlug).toBe('aluminum-works');
  });

  it('2. contract template fallback when contract taxonomy missing', () => {
    const out = resolveWorkOrderTaxonomy({
      contractTemplateTaxonomySlug: 'wood-carpentry',
      quoteTaxonomySlug: 'kitchens-works',
      workTypeKey: 'general',
    });
    expect(out.source).toBe('contract_template');
    expect(out.taxonomySlug).toBe('wood-carpentry');
  });

  it('3. quote taxonomy fallback (FK slug)', () => {
    const out = resolveWorkOrderTaxonomy({
      quoteTaxonomySlug: 'kitchens-works',
      projectTaxonomySlug: 'facades-cladding',
    });
    expect(out.source).toBe('quote_taxonomy');
    expect(out.taxonomySlug).toBe('kitchens-works');
  });

  it('3b. quote legacy sector resolves via legacy mapping', () => {
    const out = resolveWorkOrderTaxonomy({ quoteLegacySector: 'iron' });
    expect(out.source).toBe('quote_taxonomy');
    expect(out.taxonomySlug).toBe('steel-metal-works');
  });

  it('4. project taxonomy fallback', () => {
    const out = resolveWorkOrderTaxonomy({
      projectTaxonomySlug: 'facades-cladding',
      workTypeKey: 'general',
    });
    expect(out.source).toBe('project_taxonomy');
    expect(out.taxonomySlug).toBe('facades-cladding');
  });

  it('5. work type taxonomy fallback', () => {
    const out = resolveWorkOrderTaxonomy({ workTypeKey: 'kitchens' });
    expect(out.source).toBe('work_type');
    expect(out.taxonomySlug).toBe('kitchens-works');
  });

  it('6. legacy sector fallback', () => {
    const out = resolveWorkOrderTaxonomy({ legacySector: 'glass' });
    expect(out.status).toBe('fallback');
    expect(out.source).toBe('legacy_sector');
    expect(out.taxonomySlug).toBe('glass-securit-works');
  });

  it('7. manual / unknown / empty returns unclassified', () => {
    expect(resolveWorkOrderTaxonomy({}).status).toBe('unclassified');
    expect(resolveWorkOrderTaxonomy({ legacySector: 'other' }).status).toBe('unclassified');
    expect(resolveWorkOrderTaxonomy({ legacySector: 'totally-unknown' }).status).toBe('unclassified');
    expect(resolveWorkOrderTaxonomy({ workTypeKey: 'not-a-work-type' }).status).toBe('unclassified');
    const u = resolveWorkOrderTaxonomy({});
    expect(u.source).toBe('none');
    expect(u.taxonomySlug).toBeNull();
  });

  it('8. all outputs are canonical primary slugs', () => {
    const cases = [
      { contractTaxonomySlug: 'aluminum-works' },
      { contractTemplateTaxonomySlug: 'wood-carpentry' },
      { quoteTaxonomySlug: 'kitchens-works' },
      { quoteLegacySector: 'iron' },
      { projectTaxonomySlug: 'facades-cladding' },
      { workTypeKey: 'iron_doors_windows' },
      { legacySector: 'aluminum-glass-facades' },
    ];
    for (const input of cases) {
      const slug = resolveWorkOrderTaxonomy(input).taxonomySlug;
      expect(slug).not.toBeNull();
      expect(CANONICAL_SET.has(slug as string)).toBe(true);
    }
  });

  it('9. legacy/forbidden slug passed as contract taxonomy is rejected (falls through)', () => {
    const out = resolveWorkOrderTaxonomy({
      contractTaxonomySlug: 'aluminum-glass-facades', // legacy primary, forbidden
      legacySector: 'wood',
    });
    // Helper requires canonical slugs from caller; falls through to legacy fallback.
    expect(out.taxonomySlug).toBe('wood-carpentry');
    expect(out.source).toBe('legacy_sector');
  });

  it('10. invalid legacy sector does not throw', () => {
    expect(() => resolveWorkOrderTaxonomy({ legacySector: '???' })).not.toThrow();
    expect(resolveWorkOrderTaxonomy({ legacySector: '???' }).status).toBe('unclassified');
  });
});

describe('Phase 4B — guards: helper is pure, no scope creep', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
  const src = read('src/modules/taxonomy/resolveWorkOrderTaxonomy.ts');

  it('11. helper does not import supabase client', () => {
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/supabase-js/);
    expect(src).not.toMatch(/service_role/i);
  });

  it('12. helper performs no migration / RLS / RPC / edge work', () => {
    expect(src).not.toMatch(/CREATE TABLE/i);
    expect(src).not.toMatch(/ALTER TABLE/i);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/supabase\.functions/);
  });

  it('13. helper does not reference work-order lifecycle / BOQ / createWorkOrder', () => {
    expect(src).not.toMatch(/createWorkOrder/);
    expect(src).not.toMatch(/work_order_boq/);
    expect(src).not.toMatch(/lifecycle/i);
  });
});