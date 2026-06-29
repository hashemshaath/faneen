/**
 * Phase 4H — Work Order inherits taxonomy from Contract.
 * Unit tests for the pure resolver + static guards on the wrapper.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveContractWorkOrderTaxonomy,
} from '@/modules/workOrders/services/resolveContractWorkOrderTaxonomy';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const FROM_CONTRACT = read('src/modules/workOrders/services/createWorkOrderFromContract.ts');
const FROM_QUOTE = read('src/modules/workOrders/services/createWorkOrderFromQuote.ts');
const FROM_LEAD = read('src/modules/workOrders/services/createWorkOrderFromLead.ts');
const FROM_BOOKING = read('src/modules/workOrders/services/createWorkOrderFromBooking.ts');

describe('Phase 4H — resolveContractWorkOrderTaxonomy', () => {
  it('1. primary junction wins', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [
        { category_id: 'a', is_primary: false },
        { category_id: 'b', is_primary: true },
      ],
      serviceCategoryId: 'svc',
    });
    expect(r).toEqual({ taxonomy_category_id: 'b', reason: 'junction_primary' });
  });

  it('2. single junction without primary is used', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [{ category_id: 'a', is_primary: false }],
    });
    expect(r).toEqual({ taxonomy_category_id: 'a', reason: 'junction_single' });
  });

  it('3. multiple junction rows without primary → null (ambiguous)', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [
        { category_id: 'a', is_primary: false },
        { category_id: 'b', is_primary: null },
      ],
      serviceCategoryId: 'svc',
    });
    expect(r.taxonomy_category_id).toBeNull();
    expect(r.reason).toBe('junction_ambiguous_multiple');
  });

  it('4. service_category_id fallback when no junction rows', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [],
      serviceCategoryId: 'svc-1',
    });
    expect(r).toEqual({ taxonomy_category_id: 'svc-1', reason: 'service_category_fallback' });
  });

  it('5. nothing available → null with reason "none"', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: null,
      serviceCategoryId: null,
    });
    expect(r).toEqual({ taxonomy_category_id: null, reason: 'none' });
  });

  it('6. multiple primaries are treated as ambiguous', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [
        { category_id: 'a', is_primary: true },
        { category_id: 'b', is_primary: true },
      ],
    });
    expect(r.taxonomy_category_id).toBeNull();
    expect(r.reason).toBe('junction_ambiguous_multiple');
  });

  it('7. ignores rows with missing category_id', () => {
    const r = resolveContractWorkOrderTaxonomy({
      junctionRows: [
        { category_id: null, is_primary: true },
        { category_id: 'a', is_primary: false },
      ],
    });
    expect(r).toEqual({ taxonomy_category_id: 'a', reason: 'junction_single' });
  });
});

describe('Phase 4H — createWorkOrderFromContract static guards', () => {
  it('8. reads contract_taxonomy_categories junction', () => {
    expect(FROM_CONTRACT).toMatch(/from\(["']contract_taxonomy_categories["']\)/);
    expect(FROM_CONTRACT).toMatch(/category_id,\s*is_primary/);
  });

  it('9. selects service_category_id from contracts', () => {
    expect(FROM_CONTRACT).toMatch(/service_category_id/);
  });

  it('10. delegates to resolver and forwards taxonomy_category_id', () => {
    expect(FROM_CONTRACT).toMatch(/resolveContractWorkOrderTaxonomy\(/);
    expect(FROM_CONTRACT).toMatch(/taxonomy_category_id:\s*resolvedTaxonomyId\s*\?\?\s*null/);
  });

  it('11. source_type/source_id/source_ref_id unchanged', () => {
    expect(FROM_CONTRACT).toMatch(/source_type:\s*["']contract["']/);
    expect(FROM_CONTRACT).toMatch(/source_id:\s*contract\.id/);
    expect(FROM_CONTRACT).toMatch(/source_ref_id:\s*sourceRefId/);
  });

  it('12. no lifecycle/BOQ/measurements/notifications/pipeline/RPC/edge changes', () => {
    expect(FROM_CONTRACT).not.toMatch(/work_order_boq/);
    expect(FROM_CONTRACT).not.toMatch(/work_order_measurements/);
    expect(FROM_CONTRACT).not.toMatch(/work_order_pipeline_events/);
    expect(FROM_CONTRACT).not.toMatch(/\.rpc\(/);
    expect(FROM_CONTRACT).not.toMatch(/supabase\.functions/);
    expect(FROM_CONTRACT).not.toMatch(/notifications\//);
  });

  it('13. other wrappers untouched by Phase 4H', () => {
    expect(FROM_QUOTE).toMatch(/taxonomy_category_id/); // 4F
    expect(FROM_LEAD).not.toMatch(/taxonomy_category_id/);
    expect(FROM_BOOKING).not.toMatch(/taxonomy_category_id/);
  });
});
