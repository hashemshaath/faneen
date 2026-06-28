import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADMIN_OPS_QUOTE_SELECT,
  type AdminOpsQuoteRow,
} from '@/modules/quotes/services/listAdminOpsQuoteRequests';
import { resolveQuoteRequestTaxonomyDisplay } from '@/modules/taxonomy/resolveQuoteRequestTaxonomyDisplay';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('Phase 3E — admin quote ops FK-first read', () => {
  it('select fetches taxonomy_category_id and joined taxonomy_categories', () => {
    expect(ADMIN_OPS_QUOTE_SELECT).toContain('taxonomy_category_id');
    expect(ADMIN_OPS_QUOTE_SELECT).toContain('taxonomy_categories(slug,name_ar,name_en)');
  });

  it('preserves legacy sector column and core fields for back-compat', () => {
    for (const col of ['id', 'ref_id', 'sector', 'city', 'status', 'created_at']) {
      expect(ADMIN_OPS_QUOTE_SELECT).toContain(col);
    }
  });

  it('AdminOpsQuoteRow exposes typed FK + joined taxonomy shape', () => {
    const row: AdminOpsQuoteRow = {
      id: 'q1',
      ref_id: 'QTE-1',
      sector: 'aluminum',
      city: 'Riyadh',
      status: 'new',
      created_at: '2026-01-01T00:00:00Z',
      taxonomy_category_id: 'cat-1',
      taxonomy_category: { slug: 'aluminum-works', name_ar: 'ألمنيوم', name_en: 'Aluminum' },
    };
    expect(row.taxonomy_category_id).toBe('cat-1');
    expect(row.taxonomy_category?.slug).toBe('aluminum-works');
  });
});

describe('Phase 3E — admin display is FK-first with legacy fallback', () => {
  it('uses joined taxonomy label when FK is present', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({
      taxonomyCategoryId: 'cat-1',
      taxonomyCategorySlug: 'aluminum-works',
      taxonomyCategoryNameAr: 'ألمنيوم (DB)',
      sector: 'aluminum',
    });
    expect(out.status).toBe('canonical');
    expect(out.labelAr).toBe('ألمنيوم (DB)');
  });

  it('falls back to legacy sector mapping when FK is missing', () => {
    const out = resolveQuoteRequestTaxonomyDisplay({ sector: 'iron' });
    expect(out.status).toBe('legacy_resolved');
    expect(out.canonicalSlug).toBe('steel-metal-works');
  });

  it('returns unclassified safely for unknown/other', () => {
    expect(resolveQuoteRequestTaxonomyDisplay({ sector: 'other' }).status).toBe('unclassified');
    expect(resolveQuoteRequestTaxonomyDisplay({}).status).toBe('unclassified');
  });

  it('AdminQuoteOperations wires displayLabel into attention items via the helper', () => {
    const src = read('src/pages/admin/AdminQuoteOperations.tsx');
    expect(src).toContain('resolveQuoteRequestTaxonomyDisplay');
    expect(src).toMatch(/displayLabel:\s*labelFor\(q\)/);
  });

  it('AttentionSection prefers displayLabel and falls back to SECTOR_LABEL_AR', () => {
    const src = read('src/components/admin/procurement/operations/QuoteOperationsAttentionSection.tsx');
    expect(src).toMatch(/a\.displayLabel\s*\?\?\s*SECTOR_LABEL_AR/);
    expect(src).toMatch(/displayLabel\?:\s*string/);
  });
});

describe('Phase 3E — guards: no scope creep', () => {
  it('sector filter behavior unchanged in list service', () => {
    const src = read('src/modules/quotes/services/listAdminOpsQuoteRequests.ts');
    expect(src).toMatch(/\.eq\('sector',\s*sector\)/);
  });

  it('CSV follow-up export still emits legacy SECTOR_LABEL_AR via shared builder', () => {
    const src = read('src/modules/quotes/services/buildFollowUpCsv.ts');
    expect(src).toMatch(/SECTOR_LABEL_AR\[quote\.sector\]/);
  });

  it('aggregation/KPI grouping module unchanged in scope (no taxonomy import)', () => {
    const src = read('src/lib/quoteOperationsAggregation.ts');
    expect(src).not.toMatch(/resolveQuoteRequestTaxonomyDisplay/);
    expect(src).not.toMatch(/taxonomy_category_id/);
  });

  it('submit-quote-request edge function unchanged in scope', () => {
    const src = read('supabase/functions/submit-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });

  it('match-quote-request edge function unchanged in scope', () => {
    const src = read('supabase/functions/match-quote-request/index.ts');
    expect(src).toMatch(/taxonomy_category_id/);
    expect(src).toMatch(/sector/);
  });
});