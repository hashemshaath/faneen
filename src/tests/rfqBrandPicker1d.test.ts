/**
 * RFQ-BRAND-PICKER-1D — Procurement RFQ item requested-brand support.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const TYPES = read('src/modules/procurement/types.ts');
const ITEMS = read('src/modules/procurement/services/rfqItems.ts');
const FROM_BOQ = read('src/modules/procurement/services/createRfqFromBoq.ts');
const UI = read('src/pages/dashboard/DashboardProcurementDetail.tsx');

describe('RFQ-BRAND-PICKER-1D — Procurement RFQ item services', () => {
  it('ProcurementRfqItemRow includes requested_brand_id and brand_lock', () => {
    expect(TYPES).toMatch(/requested_brand_id: string \| null/);
    expect(TYPES).toMatch(/brand_lock: 'exact' \| 'preferred' \| 'flexible' \| null/);
  });

  it('rfqItems SELECT clause exposes brand fields', () => {
    expect(ITEMS).toMatch(/requested_brand_id/);
    expect(ITEMS).toMatch(/brand_lock/);
  });

  it('createRfqItem accepts requested_brand_id + brand_lock with validation', () => {
    expect(ITEMS).toMatch(/requested_brand_id\?: string \| null/);
    expect(ITEMS).toMatch(/brand_lock\?: BrandLock \| null/);
    expect(ITEMS).toMatch(/isValidBrandLock/);
    // Clearing brand should null the lock at insert-time too
    expect(ITEMS).toMatch(/requested_brand_id \? \(input\.brand_lock \?\? null\) : null/);
  });

  it('updateRfqItem clears brand_lock when requested_brand_id is cleared', () => {
    expect(ITEMS).toMatch(/patch\.requested_brand_id === null/);
    expect(ITEMS).toMatch(/writePatch\.brand_lock = null/);
  });
});

describe('RFQ-BRAND-PICKER-1D — BOQ → RFQ copy', () => {
  it('copies brand_id → requested_brand_id and brand_lock', () => {
    expect(FROM_BOQ).toMatch(/requested_brand_id: it\.brand_id \?\? null/);
    expect(FROM_BOQ).toMatch(/brand_lock: it\.brand_id \? \(it\.brand_lock \?\? null\) : null/);
  });

  it('does not mutate BOQ when copying brand fields (no boq update calls)', () => {
    expect(FROM_BOQ).not.toMatch(/work_order_boq_items[^)]*\)\s*\.update/);
    expect(FROM_BOQ).not.toMatch(/updateBoqItemPricing/);
  });
});

describe('RFQ-BRAND-PICKER-1D — DashboardProcurementDetail UI', () => {
  it('imports ApprovedBrandPicker and listApprovedBrandsByIds', () => {
    expect(UI).toMatch(/from ['"]@\/components\/brands\/ApprovedBrandPicker['"]/);
    expect(UI).toMatch(/listApprovedBrandsByIds/);
  });

  it('uses describeBrandLock for lock descriptions (no raw enum)', () => {
    expect(UI).toMatch(/describeBrandLock/);
  });

  it('renders the three brand-lock chips on item rows', () => {
    expect(UI).toMatch(/\['exact', 'preferred', 'flexible'\]/);
    expect(UI).toMatch(/data-testid="proc-rfq-item-brand-lock"/);
  });

  it('only enables the picker for draft RFQs (read-only otherwise)', () => {
    expect(UI).toMatch(/activeRfq\?\.status === 'draft'/);
    // Patch handler refuses to call updateRfqItem when not draft.
    expect(UI).toMatch(/activeRfq\.status !== 'draft'/);
  });

  it('defaults a newly picked brand lock to "preferred"', () => {
    expect(UI).toMatch(/brand_lock: ri\.brand_lock \?\? 'preferred'/);
  });

  it('clearing the requested brand also clears the lock in the same patch', () => {
    expect(UI).toMatch(/requested_brand_id: null,\s*brand_lock: null/);
  });

  it('does not render raw UUIDs for brand labels', () => {
    expect(UI).not.toMatch(/\{ri\.requested_brand_id\}/);
    expect(UI).toMatch(/brandUnavailable/);
    expect(UI).toMatch(/العلامة غير متاحة/);
    expect(UI).toMatch(/Brand unavailable/);
  });

  it('no direct supabase.from in DashboardProcurementDetail', () => {
    expect(UI).not.toMatch(/supabase\.from\(/);
  });
});

describe('RFQ-BRAND-PICKER-1D — Award / PO safety (no schema expansion)', () => {
  it('purchaseOrders module does not yet reference proposed/requested brand columns', () => {
    const po = read('src/modules/procurement/services/purchaseOrders.ts');
    expect(po).not.toMatch(/proposed_brand_id/);
    // PO schema is not expanded — requested_brand_id is read-only on item rows.
    expect(po).not.toMatch(/INSERT[^;]*requested_brand_id/i);
  });

  it('awardEligibility / awardHandoff do not reference brand columns', () => {
    const elig = read('src/modules/procurement/services/awardEligibility.ts');
    const hand = read('src/modules/procurement/services/awardHandoff.ts');
    for (const src of [elig, hand]) {
      expect(src).not.toMatch(/proposed_brand_id/);
      expect(src).not.toMatch(/requested_brand_id/);
    }
  });
});

describe('RFQ-BRAND-PICKER-1D — Scope discipline (downstream not wired)', () => {
  function rgInDir(dir: string, re: RegExp): string[] {
    const out: string[] = [];
    function walk(d: string) {
      let entries: import('node:fs').Dirent[] = [];
      try {
        entries = readdirSync(repo(d), { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const rel = `${d}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) {
          try {
            const src = readFileSync(repo(rel), 'utf-8');
            if (re.test(src)) out.push(rel);
          } catch {
            /* ignore */
          }
        }
      }
    }
    walk(dir);
    return out;
  }

  it('supplier proposed_brand_id is not referenced in UI or services', () => {
    // RFQ-BRAND-PICKER-1E ships the supplier proposed brand wiring. Allowlist
    // only the deliberately-wired surfaces and the pure helper/index.
    const offenders = rgInDir('src', /proposed_brand_id/).filter(
      (m) =>
        !m.includes('/tests/') &&
        !m.includes('/__tests__/') &&
        m !== 'src/integrations/supabase/types.ts' &&
        m !== 'src/modules/procurement/services/supplierQuoteItems.ts' &&
        m !== 'src/modules/procurement/services/brandEquivalence.ts' &&
        m !== 'src/modules/procurement/services/quoteComparisonLineItems.ts' &&
        m !== 'src/modules/procurement/index.ts' &&
        m !== 'src/modules/procurement/types.ts' &&
        m !== 'src/pages/dashboard/DashboardProcurementDetail.tsx',
    );
    expect(offenders).toEqual([]);
  });

  it('supplierQuoteItems service stays clear of unrelated brand wiring', () => {
    const sqi = read('src/modules/procurement/services/supplierQuoteItems.ts');
    // 1E only adds proposed brand + review fields; legacy `is_equivalent`
    // column from 1A schema stays unused at the service layer.
    expect(sqi).not.toMatch(/is_equivalent/);
  });

  it('no inventory/accounting/supplier-portal/supplier-payment modules added', () => {
    for (const p of [
      'src/modules/inventory',
      'src/modules/accounting',
      'src/modules/supplierPortal',
      'src/modules/supplierPayments',
    ]) {
      const exists = existsSync(repo(p)) && statSync(repo(p)).isDirectory();
      expect(exists).toBe(false);
    }
  });
});
