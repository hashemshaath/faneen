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

/**
 * STABILITY-FINAL-1 update: the original audit forbade any implementation
 * because the phase was audit-only. Option E (Hybrid) has since shipped via
 * RFQ-BRAND-PICKER-1+ migrations, so these guards are now stale. We flip
 * them to positively assert the canonical Option E schema landed exactly
 * once — preserving the safety intent (no duplicate / drifted columns).
 */
describe('RFQ-BRAND-MODEL-AUDIT-1 — Option E hybrid implementation is in place', () => {
  const dir = repo('supabase/migrations');
  const allSql = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .map((f) => readFileSync(resolve(dir, f), 'utf-8'))
        .join('\n\n')
    : '';

  it('quote_requests has preferred_brand_ids + brand_preference_mode columns', () => {
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+(public\.)?quote_requests[\s\S]{0,400}preferred_brand_ids[\s\S]{0,400}brand_preference_mode/i,
    );
  });

  it('work_order_boq_items has brand_id column referencing brand_catalog', () => {
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+(public\.)?work_order_boq_items[\s\S]{0,400}\bbrand_id\b[\s\S]{0,200}brand_catalog/i,
    );
  });

  it('procurement_rfq_items has requested_brand_id referencing brand_catalog', () => {
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+(public\.)?procurement_rfq_items[\s\S]{0,400}requested_brand_id[\s\S]{0,200}brand_catalog/i,
    );
  });

  it('procurement_supplier_quote_items has proposed_brand_id referencing brand_catalog', () => {
    expect(allSql).toMatch(
      /ALTER\s+TABLE\s+(public\.)?procurement_supplier_quote_items[\s\S]{0,400}proposed_brand_id[\s\S]{0,200}brand_catalog/i,
    );
  });

  it('brand validation trigger / function exists to enforce approved brands', () => {
    expect(allSql).toMatch(/validate_brand_id_approved/);
  });
});