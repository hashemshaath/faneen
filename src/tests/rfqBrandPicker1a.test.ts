/**
 * RFQ-BRAND-PICKER-1A — guards for the additive brand foundation.
 *
 * Verifies migration shape, picker isolation, pure rule helpers, and that
 * no live RFQ/supplier UI was wired in this phase.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isValidBrandPreferenceMode,
  isValidBrandLock,
  canSupplierProposeEquivalent,
  describeBrandLock,
  describeBrandPreference,
} from '@/modules/brands/lib/brandSelectionRules';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

function findMigration(pattern: RegExp): string | null {
  const dir = repo('supabase/migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const sql = readFileSync(resolve(dir, f), 'utf-8');
    if (pattern.test(sql)) return sql;
  }
  return null;
}

describe('RFQ-BRAND-PICKER-1A — additive migration', () => {
  const sql =
    findMigration(/RFQ-BRAND-PICKER-1A/i) ||
    findMigration(/preferred_brand_ids[\s\S]+brand_preference_mode/);

  it('migration file exists', () => {
    expect(sql).not.toBeNull();
  });

  it('adds quote_requests brand columns', () => {
    expect(sql).toMatch(/ALTER TABLE public\.quote_requests[\s\S]+preferred_brand_ids uuid\[\]/);
    expect(sql).toMatch(/brand_preference_mode text/);
    expect(sql).toMatch(/brand_notes text/);
  });

  it('adds work_order_boq_items brand columns with FK to brand_catalog', () => {
    expect(sql).toMatch(/ALTER TABLE public\.work_order_boq_items[\s\S]+brand_id uuid REFERENCES public\.brand_catalog/);
    expect(sql).toMatch(/brand_lock text/);
  });

  it('adds procurement_rfq_items requested_brand_id + lock', () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.procurement_rfq_items[\s\S]+requested_brand_id uuid REFERENCES public\.brand_catalog/,
    );
  });

  it('adds supplier proposed_brand_id + is_equivalent + notes', () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.procurement_supplier_quote_items[\s\S]+proposed_brand_id uuid REFERENCES public\.brand_catalog/,
    );
    expect(sql).toMatch(/is_equivalent boolean NOT NULL DEFAULT false/);
    expect(sql).toMatch(/equivalence_notes text/);
  });

  it('restricts brand_lock / preference_mode to exact|preferred|flexible', () => {
    expect(sql).toMatch(/brand_preference_mode IN \('exact','preferred','flexible'\)/);
    expect(sql).toMatch(/brand_lock IN \('exact','preferred','flexible'\)/);
  });

  it('adds approved-brand validation function + triggers', () => {
    expect(sql).toMatch(/validate_brand_id_approved/);
    expect(sql).toMatch(/trg_quote_requests_validate_brands/);
    expect(sql).toMatch(/trg_boq_items_validate_brand/);
    expect(sql).toMatch(/trg_proc_rfq_items_validate_brand/);
    expect(sql).toMatch(/trg_proc_supplier_quote_items_validate_brand/);
    expect(sql).toMatch(/status = 'approved'/);
  });

  it('does NOT alter RLS or drop any existing policy', () => {
    expect(sql).not.toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).not.toMatch(/DROP POLICY/i);
    expect(sql).not.toMatch(/ALTER POLICY/i);
  });
});

describe('RFQ-BRAND-PICKER-1A — ApprovedBrandPicker component', () => {
  const path = 'src/components/brands/ApprovedBrandPicker.tsx';

  it('exists', () => {
    expect(existsSync(repo(path))).toBe(true);
  });

  const src = read(path);

  it('uses brandsService — no raw supabase client', () => {
    expect(src).toMatch(/from ['"]@\/modules\/brands['"]/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/supabase\.from\(/);
  });

  it('uses searchApprovedBrandsForPicker only (no pending/rejected access)', () => {
    expect(src).toMatch(/searchApprovedBrandsForPicker/);
    expect(src).not.toMatch(/brand_catalog/);
    expect(src).not.toMatch(/brand_addition_requests/);
  });

  it('supports single and multi modes', () => {
    expect(src).toMatch(/mode: 'single'/);
    expect(src).toMatch(/mode: 'multi'/);
  });

  it('links to dashboard brands request flow in empty state', () => {
    expect(src).toMatch(/\/dashboard\/brands/);
  });

  it('renders ref_id (not raw uuid) for the secondary label', () => {
    expect(src).toMatch(/b\.ref_id/);
  });
});

describe('RFQ-BRAND-PICKER-1A — service wrapper exists and is approved-only', () => {
  const svc = read('src/modules/brands/services/brandsService.ts');

  it('searchApprovedBrandsForPicker exists and reads brands_public', () => {
    expect(svc).toMatch(/export async function searchApprovedBrandsForPicker/);
    expect(svc).toMatch(/searchApprovedBrandsForPicker[\s\S]{0,400}brands_public/);
  });
});

describe('RFQ-BRAND-PICKER-1A — brand selection rules', () => {
  it('isValidBrandPreferenceMode accepts the three values', () => {
    for (const v of ['exact', 'preferred', 'flexible']) {
      expect(isValidBrandPreferenceMode(v)).toBe(true);
    }
    for (const v of ['', 'required', 'any_of', null, undefined, 42]) {
      expect(isValidBrandPreferenceMode(v)).toBe(false);
    }
  });

  it('isValidBrandLock matches preference modes', () => {
    for (const v of ['exact', 'preferred', 'flexible']) expect(isValidBrandLock(v)).toBe(true);
    expect(isValidBrandLock('locked')).toBe(false);
  });

  it('canSupplierProposeEquivalent: false only when lock = exact', () => {
    expect(canSupplierProposeEquivalent('exact')).toBe(false);
    expect(canSupplierProposeEquivalent('preferred')).toBe(true);
    expect(canSupplierProposeEquivalent('flexible')).toBe(true);
    expect(canSupplierProposeEquivalent(null)).toBe(true);
    expect(canSupplierProposeEquivalent(undefined)).toBe(true);
  });

  it('describe* helpers return AR/EN strings', () => {
    expect(describeBrandLock('exact', 'ar')).toMatch(/مطابق/);
    expect(describeBrandLock('exact', 'en')).toMatch(/Exact/);
    expect(describeBrandPreference('flexible', 'ar')).toMatch(/أي/);
    expect(describeBrandPreference(null, 'en')).toMatch(/No preference/);
  });
});

describe('RFQ-BRAND-PICKER-1A — scope discipline (no live wiring this phase)', () => {
  function rgInDir(dir: string, re: RegExp): string[] {
    const out: string[] = [];
    function walk(d: string) {
      let entries: ReturnType<typeof readdirSync>;
      try { entries = readdirSync(repo(d), { withFileTypes: true }); }
      catch { return; }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const rel = `${d}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          try {
            const src = readFileSync(repo(rel), 'utf-8');
            if (re.test(src)) out.push(rel);
          } catch { /* ignore unreadable entries */ }
        }
      }
    }
    walk(dir);
    return out;
  }

  it('ApprovedBrandPicker not imported by any RFQ / quote-request / supplier page yet', () => {
    const matches = rgInDir('src', /ApprovedBrandPicker/);
    // Only the component file itself + the test file may reference it.
    const offenders = matches.filter(
      (m) =>
        !m.endsWith('ApprovedBrandPicker.tsx') &&
        !m.includes('/tests/') &&
        !m.includes('/__tests__/'),
    );
    expect(offenders).toEqual([]);
  });

  it('no inventory/accounting/supplier-portal/supplier-payment modules added', () => {
    for (const p of [
      'src/modules/inventory',
      'src/modules/accounting',
      'src/modules/supplierPortal',
      'src/modules/supplierPayments',
    ]) {
      expect(existsSync(repo(p))).toBe(false);
    }
  });
});