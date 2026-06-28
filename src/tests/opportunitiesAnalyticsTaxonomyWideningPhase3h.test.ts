/**
 * Phase 3H — opportunities analytics taxonomy widening.
 *
 * Additive widening only: services + export now surface taxonomy FK and
 * canonical labels alongside the legacy `sector` column. Aggregation,
 * KPIs, filters, matching, and edge functions remain untouched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildOpportunityReportCsv,
  OPPORTUNITY_EXPORT_COLUMNS,
} from '@/modules/opportunities/analytics';
import type { OpportunityOpsRow } from '@/modules/opportunities/analytics';

const ROOT = resolve(__dirname, '..', '..');
const SVC_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/services.ts'),
  'utf8',
);
const EXPORT_SRC = readFileSync(
  resolve(ROOT, 'src/modules/opportunities/analytics/export.ts'),
  'utf8',
);

function row(overrides: Partial<OpportunityOpsRow> = {}): OpportunityOpsRow {
  return {
    id: 'opp-1',
    ref_id: 'OPP-1',
    customer_name: 'Acme',
    city: 'Riyadh',
    district: null,
    sector: 'aluminum',
    taxonomy_category_id: null,
    taxonomy_category_slug: null,
    taxonomy_category_name_ar: null,
    taxonomy_category_name_en: null,
    status: 'under_review',
    award_status: null,
    awarded_bid_id: null,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    assigned_count: 0,
    bid_count: 0,
    contract_id: null,
    contract_status: null,
    flag: 'needs_matching',
    first_assigned_at: null,
    first_bid_at: null,
    awarded_at: null,
    contract_created_at: null,
    ...overrides,
  };
}

function csvRowCells(csv: string, idx: number): string[] {
  const lines = csv.replace(/^\uFEFF/, '').split('\n');
  return lines[idx].split(',');
}

describe('Phase 3H — analytics service select widening (static check)', () => {
  it('1. service select still includes legacy `sector`', () => {
    expect(SVC_SRC).toMatch(/\bsector\b/);
  });
  it('2. service select now requests taxonomy_category_id', () => {
    expect(SVC_SRC).toMatch(/taxonomy_category_id/);
  });
  it('3. service select embeds taxonomy_categories relation labels', () => {
    expect(SVC_SRC).toMatch(/taxonomy_category:taxonomy_categories\(slug,name_ar,name_en\)/);
  });
});

describe('Phase 3H — analytics export widening', () => {
  it('4. CSV header retains `sector`', () => {
    expect(OPPORTUNITY_EXPORT_COLUMNS).toContain('sector');
  });
  it('5. CSV header adds taxonomy columns', () => {
    expect(OPPORTUNITY_EXPORT_COLUMNS).toContain('taxonomy_slug');
    expect(OPPORTUNITY_EXPORT_COLUMNS).toContain('taxonomy_label_ar');
    expect(OPPORTUNITY_EXPORT_COLUMNS).toContain('taxonomy_label_en');
    expect(OPPORTUNITY_EXPORT_COLUMNS).toContain('taxonomy_status');
  });

  it('6. FK-present rows render canonical taxonomy', () => {
    const csv = buildOpportunityReportCsv([
      row({
        sector: 'aluminum',
        taxonomy_category_id: 'fk-1',
        taxonomy_category_slug: 'aluminum-works',
        taxonomy_category_name_ar: 'أعمال الألمنيوم',
        taxonomy_category_name_en: 'Aluminum works',
      }),
    ]);
    const header = csvRowCells(csv, 0);
    const data = csvRowCells(csv, 1);
    const get = (k: string) => data[header.indexOf(k)];
    expect(get('taxonomy_status')).toBe('canonical');
    expect(get('taxonomy_slug')).toBe('aluminum-works');
    expect(get('taxonomy_label_ar')).toContain('الألمنيوم');
    expect(get('taxonomy_label_en')).toBe('Aluminum works');
    expect(get('sector')).toBe('aluminum');
  });

  it('7. FK-missing rows fall back to legacy sector mapping', () => {
    const csv = buildOpportunityReportCsv([row({ sector: 'iron' })]);
    const header = csvRowCells(csv, 0);
    const data = csvRowCells(csv, 1);
    const get = (k: string) => data[header.indexOf(k)];
    expect(get('taxonomy_status')).toBe('legacy_resolved');
    expect(get('taxonomy_slug').length).toBeGreaterThan(0);
    expect(get('sector')).toBe('iron');
  });

  it('8. unknown / other render as unclassified with empty slug', () => {
    const csv = buildOpportunityReportCsv([row({ sector: 'other' })]);
    const header = csvRowCells(csv, 0);
    const data = csvRowCells(csv, 1);
    const get = (k: string) => data[header.indexOf(k)];
    expect(get('taxonomy_status')).toBe('unclassified');
    expect(get('taxonomy_slug')).toBe('');
  });
});

describe('Phase 3H — guards: no scope creep', () => {
  it('9. service does not change matching/submit/award/contract mutation helpers', () => {
    expect(SVC_SRC).not.toMatch(/awardOpportunityBid|submitOpportunityBid|match_opportunity/i);
  });
  it('10. service has no writes (insert/update/delete/upsert)', () => {
    expect(SVC_SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  });
  it('11. export module still has no writes/RPC/service_role', () => {
    expect(EXPORT_SRC).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(EXPORT_SRC).not.toMatch(/supabase\.rpc\(/);
    expect(EXPORT_SRC).not.toMatch(/service_role/i);
  });
  it('12. no any/suppressions in export', () => {
    expect(EXPORT_SRC).not.toMatch(/:\s*any\b/);
    expect(EXPORT_SRC).not.toMatch(/\bas\s+any\b/);
    expect(EXPORT_SRC).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
  });
});