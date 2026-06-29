/**
 * Phase 4E — Work Order Taxonomy Pass-Through (static guards).
 * Verifies createWorkOrder accepts taxonomy_category_id and forwards it,
 * while wrappers do NOT populate it yet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const CREATE = read('src/modules/workOrders/services/createWorkOrder.ts');
const FROM_QUOTE = read('src/modules/workOrders/services/createWorkOrderFromQuote.ts');
const FROM_CONTRACT = read('src/modules/workOrders/services/createWorkOrderFromContract.ts');
const FROM_LEAD = read('src/modules/workOrders/services/createWorkOrderFromLead.ts');
const FROM_BOOKING = read('src/modules/workOrders/services/createWorkOrderFromBooking.ts');

describe('Phase 4E — createWorkOrder taxonomy pass-through', () => {
  it('1. CreateWorkOrderInput declares optional taxonomy_category_id', () => {
    expect(CREATE).toMatch(/taxonomy_category_id\?:\s*string\s*\|\s*null/);
  });

  it('2. insert payload forwards taxonomy_category_id (nullable)', () => {
    expect(CREATE).toMatch(/taxonomy_category_id:\s*input\.taxonomy_category_id\s*\?\?\s*null/);
  });

  it('3. source_type / source_id / source_ref_id remain unchanged', () => {
    expect(CREATE).toMatch(/source_type:\s*input\.source_type\s*\?\?\s*["']manual["']/);
    expect(CREATE).toMatch(/source_id:\s*input\.source_id\s*\?\?\s*null/);
    expect(CREATE).toMatch(/source_ref_id:\s*safeSourceRef\(input\.source_ref_id\)/);
  });

  it('4. status default remains "draft"', () => {
    expect(CREATE).toMatch(/status:\s*["']draft["']/);
  });
});

describe('Phase 4E — wrappers do NOT auto-populate taxonomy yet', () => {
  it('5. createWorkOrderFromQuote does not pass taxonomy_category_id', () => {
    expect(FROM_QUOTE).not.toMatch(/taxonomy_category_id/);
  });
  it('6. createWorkOrderFromContract does not pass taxonomy_category_id', () => {
    expect(FROM_CONTRACT).not.toMatch(/taxonomy_category_id/);
  });
  it('7. createWorkOrderFromLead does not pass taxonomy_category_id', () => {
    expect(FROM_LEAD).not.toMatch(/taxonomy_category_id/);
  });
  it('8. createWorkOrderFromBooking does not pass taxonomy_category_id', () => {
    expect(FROM_BOOKING).not.toMatch(/taxonomy_category_id/);
  });
});

describe('Phase 4E — scope guards: no DB / lifecycle / BOQ / RLS changes', () => {
  it('9. createWorkOrder does not touch BOQ/measurements/lifecycle modules', () => {
    expect(CREATE).not.toMatch(/work_order_boq/);
    expect(CREATE).not.toMatch(/work_order_measurements/);
    expect(CREATE).not.toMatch(/lifecycle/i);
  });
  it('10. createWorkOrder does not call RPC or edge functions', () => {
    expect(CREATE).not.toMatch(/\.rpc\(/);
    expect(CREATE).not.toMatch(/supabase\.functions/);
  });
});