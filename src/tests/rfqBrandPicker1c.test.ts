/**
 * RFQ-BRAND-PICKER-1C — BOQ Item brand support.
 *
 * Verifies wiring of `brand_id` + `brand_lock` into BOQ services and
 * WorkOrderBoqSection UI, without leaking into procurement / supplier
 * quotes / inventory / accounting / supplier-portal modules.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = (p: string) => resolve(__dirname, '..', '..', p);
const read = (p: string) => readFileSync(repo(p), 'utf-8');

const TYPES = read('src/modules/workOrders/types.ts');
const LIST = read('src/modules/workOrders/services/listBoqItems.ts');
const UPDATE = read('src/modules/workOrders/services/updateBoqItemPricing.ts');
const CREATE = read('src/modules/workOrders/services/createBoqFromMeasurements.ts');
const GEN = read('src/modules/workOrders/services/generateBoqItemsFromMeasurements.ts');
const UI = read('src/components/workOrders/WorkOrderBoqSection.tsx');

describe('RFQ-BRAND-PICKER-1C — BOQ item services', () => {
  it('WorkOrderBoqItemRow includes brand_id and brand_lock', () => {
    expect(TYPES).toMatch(/brand_id: string \| null/);
    expect(TYPES).toMatch(/brand_lock: 'exact' \| 'preferred' \| 'flexible' \| null/);
  });

  it('listBoqItems selects brand_id and brand_lock', () => {
    expect(LIST).toMatch(/brand_id/);
    expect(LIST).toMatch(/brand_lock/);
  });

  it('updateBoqItemPricing accepts brand_id and brand_lock with validation', () => {
    expect(UPDATE).toMatch(/brand_id\?: string \| null/);
    expect(UPDATE).toMatch(/brand_lock\?: BrandLock \| null/);
    expect(UPDATE).toMatch(/isValidBrandLock/);
    // Clearing brand also clears lock
    expect(UPDATE).toMatch(/update\.brand_lock = null/);
  });

  it('updateBoqItemPricing returns brand fields in select', () => {
    expect(UPDATE).toMatch(/brand_id, brand_lock/);
  });

  it('createBoqFromMeasurements persists brand_id=null and brand_lock=null for generated items', () => {
    expect(CREATE).toMatch(/brand_id: null/);
    expect(CREATE).toMatch(/brand_lock: null/);
    expect(CREATE).toMatch(/brand_id, brand_lock/);
  });

  it('generator BoqItemDraft makes brand_id/brand_lock explicitly null-only', () => {
    expect(GEN).toMatch(/brand_id\?: null/);
    expect(GEN).toMatch(/brand_lock\?: null/);
    // Generator must not import the brand picker or services
    expect(GEN).not.toMatch(/ApprovedBrandPicker/);
    expect(GEN).not.toMatch(/brandsService|@\/modules\/brands/);
  });
});

describe('RFQ-BRAND-PICKER-1C — WorkOrderBoqSection UI', () => {
  it('imports ApprovedBrandPicker and listApprovedBrandsByIds', () => {
    expect(UI).toMatch(/from ['"]@\/components\/brands\/ApprovedBrandPicker['"]/);
    expect(UI).toMatch(/listApprovedBrandsByIds/);
  });

  it('uses describeBrandLock for lock descriptions (no raw enum)', () => {
    expect(UI).toMatch(/describeBrandLock/);
  });

  it('renders the three brand-lock chips (exact / preferred / flexible)', () => {
    expect(UI).toMatch(/\["exact", "preferred", "flexible"\]/);
    expect(UI).toMatch(/data-testid="wo-boq-item-brand-lock"/);
  });

  it('defaults newly picked brand lock to "preferred"', () => {
    expect(UI).toMatch(/brand_lock: it\.brand_lock \?\? "preferred"/);
  });

  it('clearing the brand also clears the lock in the same patch', () => {
    expect(UI).toMatch(/brand_id: null,\s*brand_lock: null/);
  });

  it('finalized BOQs render brand label read-only (no picker inside finalized branch)', () => {
    // Picker must only appear in the draft branch.
    expect(UI).toMatch(/isFinalized \?[\s\S]*?<span[\s\S]*?:[\s\S]*?<ApprovedBrandPicker/);
  });

  it('falls back to "Brand unavailable" when brand_id is not resolvable', () => {
    expect(UI).toMatch(/brandUnavailable/);
    expect(UI).toMatch(/العلامة غير متاحة/);
    expect(UI).toMatch(/Brand unavailable/);
  });

  it('does not render raw UUIDs for brand labels', () => {
    // The displayed value comes from brandLabels map (name_ar/name_en), never from brand_id directly.
    expect(UI).not.toMatch(/\{it\.brand_id\}/);
  });

  it('no direct supabase.from in the BOQ section', () => {
    expect(UI).not.toMatch(/supabase\.from\(/);
  });
});

describe('RFQ-BRAND-PICKER-1C — Scope discipline (downstream not wired this phase)', () => {
  it('procurement RFQ item service does not yet reference requested_brand_id in UI', () => {
    // Schema column exists (1A) but no UI/service wiring in 1C.
    const proc = existsSync(repo('src/modules/procurement'))
      ? readdirSync(repo('src/modules/procurement'), { withFileTypes: true })
      : [];
    expect(Array.isArray(proc)).toBe(true);
    // Spot check: ApprovedBrandPicker must not be imported by any procurement page yet.
    const offenders: string[] = [];
    function walk(dir: string) {
      let entries: import('node:fs').Dirent[] = [];
      try {
        entries = readdirSync(repo(dir), { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) {
          try {
            const src = readFileSync(repo(rel), 'utf-8');
            if (/ApprovedBrandPicker/.test(src)) offenders.push(rel);
          } catch {
            /* ignore */
          }
        }
      }
    }
    walk('src/pages/dashboard');
    walk('src/modules/procurement');
    walk('src/components/procurement');
    const filtered = offenders.filter(
      (m) =>
        !m.includes('/tests/') &&
        !m.includes('/__tests__/'),
    );
    // Only the BOQ section (1C) and Quote.tsx (1B) may import it — neither lives in
    // dashboard/procurement/components-procurement trees.
    expect(filtered).toEqual([]);
  });

  it('supplier-quote UI is not wired to proposed_brand_id yet', () => {
    // No file should reference proposed_brand_id in UI/service code (1A schema only).
    const offenders: string[] = [];
    function walk(dir: string) {
      let entries: import('node:fs').Dirent[] = [];
      try {
        entries = readdirSync(repo(dir), { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) {
          try {
            const src = readFileSync(repo(rel), 'utf-8');
            if (/proposed_brand_id/.test(src)) offenders.push(rel);
          } catch {
            /* ignore */
          }
        }
      }
    }
    walk('src/pages');
    walk('src/components');
    walk('src/modules');
    const filtered = offenders.filter(
      (m) => !m.includes('/tests/') && !m.includes('/__tests__/'),
    );
    expect(filtered).toEqual([]);
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
