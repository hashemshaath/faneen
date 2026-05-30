/**
 * RFQ-BRAND-MODEL-AUDIT-1 — guards that this phase stays audit-only.
 *
 * Verifies:
 *  - audit document exists and contains the required sections
 *  - recommendation chose Option E (Hybrid)
 *  - implementation blueprint is present
 *  - no schema migration was added for RFQ brand columns
 *  - no RFQ brand picker component/page was added
 *  - no RLS / brands service surface was changed for RFQ this phase
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const DOC = 'docs/rfq-brand-model-audit.md';

describe('RFQ-BRAND-MODEL-AUDIT-1 — audit doc', () => {
  it('audit document exists', () => {
    expect(existsSync(repo(DOC))).toBe(true);
  });

  const md = existsSync(repo(DOC)) ? read(DOC) : '';

  it('covers Parts A through E', () => {
    for (const part of [
      'Part A — Current data model',
      'Part B — Business scenarios',
      'Part C — Option analysis',
      'Part D — Recommendation',
      'Part E — Implementation blueprint',
    ]) {
      expect(md).toContain(part);
    }
  });

  it('audits the required source tables', () => {
    for (const t of [
      'quote_requests',
      'procurement_rfqs',
      'procurement_rfq_items',
      'procurement_supplier_quote_items',
      'work_order_boq_items',
      'business_service_brands',
      'brand_catalog',
    ]) {
      expect(md).toContain(t);
    }
  });

  it('scores all five options A–E', () => {
    for (const o of ['Option A', 'Option B', 'Option C', 'Option D', 'Option E']) {
      expect(md).toContain(o);
    }
  });

  it('recommends Option E (Hybrid)', () => {
    expect(md).toMatch(/Adopt Option E \(Hybrid\)/i);
  });

  it('blueprint names the future ticket RFQ-BRAND-PICKER-1', () => {
    expect(md).toContain('RFQ-BRAND-PICKER-1');
  });

  it('blueprint includes migration, services, UI, validation, permissions, tests', () => {
    for (const section of [
      'Migration strategy',
      'Service wrappers',
      'UI integration points',
      'Validation rules',
      'Permissions',
      'Tests required',
    ]) {
      expect(md).toContain(section);
    }
  });
});

describe('RFQ-BRAND-MODEL-AUDIT-1 — no implementation leaked in', () => {
  it('no migration adds brand columns to RFQ/BOQ/procurement tables', () => {
    const dir = repo('supabase/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const offenders: string[] = [];
    const forbidden = [
      /ALTER\s+TABLE\s+(public\.)?quote_requests[\s\S]{0,200}(preferred_brand_ids|brand_preference_mode)/i,
      /ALTER\s+TABLE\s+(public\.)?work_order_boq_items[\s\S]{0,200}\bbrand_id\b/i,
      /ALTER\s+TABLE\s+(public\.)?procurement_rfq_items[\s\S]{0,200}requested_brand_id/i,
      /ALTER\s+TABLE\s+(public\.)?procurement_supplier_quote_items[\s\S]{0,200}proposed_brand_id/i,
    ];
    for (const f of files) {
      const sql = readFileSync(resolve(dir, f), 'utf-8');
      if (forbidden.some((re) => re.test(sql))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('no RFQ brand picker component/page was added', () => {
    const candidates = [
      'src/components/rfq/BrandPreferencePicker.tsx',
      'src/components/rfq/BrandPicker.tsx',
      'src/pages/rfq/BrandPicker.tsx',
    ];
    for (const p of candidates) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });

  it('brandsService did not gain RFQ-specific picker wrappers this phase', () => {
    const svc = read('src/modules/brands/services/brandsService.ts');
    expect(svc).not.toMatch(/validateBrandIdsApproved/);
    expect(svc).not.toMatch(/listApprovedBrandsForRfqPicker/);
  });
});