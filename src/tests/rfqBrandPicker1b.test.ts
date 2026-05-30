/**
 * RFQ-BRAND-PICKER-1B — Customer RFQ header brand preference wiring.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const QUOTE = read('src/pages/Quote.tsx');
const SUBMIT = read('src/modules/quotes/services/submitQuoteRequest.ts');
const EDGE = read('supabase/functions/submit-quote-request/index.ts');
const ADMIN = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
const SVC = read('src/modules/brands/services/brandsService.ts');

describe('RFQ-BRAND-PICKER-1B — Quote form wiring', () => {
  it('imports ApprovedBrandPicker', () => {
    expect(QUOTE).toMatch(/from ['"]@\/components\/brands\/ApprovedBrandPicker['"]/);
    expect(QUOTE).toMatch(/<ApprovedBrandPicker[\s\S]+mode=["']multi["']/);
  });

  it('form state includes brand fields', () => {
    expect(QUOTE).toMatch(/preferredBrandIds: string\[\]/);
    expect(QUOTE).toMatch(/brandPreferenceMode/);
    expect(QUOTE).toMatch(/brandNotes: string/);
  });

  it('draft empty form includes brand defaults (persists via existing draft mechanism)', () => {
    expect(QUOTE).toMatch(/preferredBrandIds: \[\]/);
    expect(QUOTE).toMatch(/brandPreferenceMode: ''/);
    expect(QUOTE).toMatch(/brandNotes: ''/);
    expect(QUOTE).toMatch(/saveDraft\(form\)/);
  });

  it('submit payload includes brand fields with safe null fallbacks', () => {
    expect(QUOTE).toMatch(/preferred_brand_ids: form\.preferredBrandIds\.length \? form\.preferredBrandIds : null/);
    expect(QUOTE).toMatch(/brand_preference_mode:/);
    expect(QUOTE).toMatch(/brand_notes:/);
  });

  it('submitQuoteRequest payload type accepts brand fields', () => {
    expect(SUBMIT).toMatch(/preferred_brand_ids\?: string\[\] \| null/);
    expect(SUBMIT).toMatch(/brand_preference_mode\?: 'exact' \| 'preferred' \| 'flexible' \| null/);
    expect(SUBMIT).toMatch(/brand_notes\?: string \| null/);
  });

  it('no direct supabase.from in Quote page', () => {
    expect(QUOTE).not.toMatch(/supabase\.from\(/);
  });
});

describe('RFQ-BRAND-PICKER-1B — edge function', () => {
  it('accepts and validates brand fields', () => {
    expect(EDGE).toMatch(/preferred_brand_ids\?: string\[\] \| null/);
    expect(EDGE).toMatch(/ALLOWED_BRAND_MODE/);
    expect(EDGE).toMatch(/'exact','preferred','flexible'/);
    expect(EDGE).toMatch(/UUID_RE/);
    expect(EDGE).toMatch(/preferred_brand_ids: preferredBrandIds/);
    expect(EDGE).toMatch(/brand_preference_mode: brandMode/);
    expect(EDGE).toMatch(/brand_notes: brandNotes/);
  });

  it('audit metadata stores brand_count + mode, not raw uuid array', () => {
    expect(EDGE).toMatch(/brand_count: preferredBrandIds\?\.length \?\? 0/);
    expect(EDGE).toMatch(/brand_preference_mode: brandMode/);
    // ensure audit event metadata block does NOT dump preferred_brand_ids itself
    const auditBlock = EDGE.match(/event_type: 'quote_created'[\s\S]+?\}\)/);
    expect(auditBlock).not.toBeNull();
    expect(auditBlock?.[0] ?? '').not.toMatch(/preferred_brand_ids/);
  });
});

describe('RFQ-BRAND-PICKER-1B — admin detail view', () => {
  it('extends row interface with brand fields', () => {
    expect(ADMIN).toMatch(/preferred_brand_ids: string\[\] \| null/);
    expect(ADMIN).toMatch(/brand_preference_mode: string \| null/);
    expect(ADMIN).toMatch(/brand_notes: string \| null/);
  });

  it('renders brand panel via approved-brand resolver (no raw uuid)', () => {
    expect(ADMIN).toMatch(/AdminQuoteBrandPreference/);
    expect(ADMIN).toMatch(/listApprovedBrandsByIds/);
    expect(ADMIN).toMatch(/describeBrandPreference/);
    // labels rendered as name + ref_id, not raw id
    expect(ADMIN).toMatch(/b\.name_ar \|\| b\.name_en/);
  });
});

describe('RFQ-BRAND-PICKER-1B — service wrapper', () => {
  it('listApprovedBrandsByIds exists and reads brands_public', () => {
    expect(SVC).toMatch(/export async function listApprovedBrandsByIds/);
    expect(SVC).toMatch(/listApprovedBrandsByIds[\s\S]{0,400}brands_public/);
  });
});

describe('RFQ-BRAND-PICKER-1B — scope discipline', () => {
  it('no BOQ/procurement/supplier brand wiring this phase', () => {
    for (const p of [
      'src/components/dashboard/BoqBrandField.tsx',
      'src/components/procurement/ProcurementBrandPicker.tsx',
      'src/components/procurement/SupplierBrandField.tsx',
    ]) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });

  it('no inventory/accounting/supplier-portal modules added', () => {
    for (const p of [
      'src/modules/inventory',
      'src/modules/accounting',
      'src/modules/supplierPortal',
    ]) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });
});