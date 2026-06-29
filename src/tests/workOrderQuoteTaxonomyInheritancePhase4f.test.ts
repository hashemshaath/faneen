/**
 * Phase 4F — Work Order inherits taxonomy from Quote (static guards).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const FROM_QUOTE = read('src/modules/workOrders/services/createWorkOrderFromQuote.ts');
const FROM_CONTRACT = read('src/modules/workOrders/services/createWorkOrderFromContract.ts');
const FROM_LEAD = read('src/modules/workOrders/services/createWorkOrderFromLead.ts');
const FROM_BOOKING = read('src/modules/workOrders/services/createWorkOrderFromBooking.ts');
const CREATE = read('src/modules/workOrders/services/createWorkOrder.ts');

describe('Phase 4F — createWorkOrderFromQuote inherits taxonomy_category_id', () => {
  it('1. selects taxonomy_category_id from quote_requests', () => {
    expect(FROM_QUOTE).toMatch(/quote_request:quote_requests\([^)]*taxonomy_category_id[^)]*\)/);
  });

  it('2. types qr with taxonomy_category_id', () => {
    expect(FROM_QUOTE).toMatch(/taxonomy_category_id:\s*string\s*\|\s*null/);
  });

  it('3. forwards taxonomy_category_id to createWorkOrder (nullable)', () => {
    expect(FROM_QUOTE).toMatch(/taxonomy_category_id:\s*qr\.taxonomy_category_id\s*\?\?\s*null/);
  });

  it('4. source_type/source_id/source_ref_id remain unchanged', () => {
    expect(FROM_QUOTE).toMatch(/source_type:\s*["']quote["']/);
    expect(FROM_QUOTE).toMatch(/source_id:\s*qr\.id/);
    expect(FROM_QUOTE).toMatch(/source_ref_id:\s*sourceRefId/);
  });

  it('5. no sector mutation', () => {
    expect(FROM_QUOTE).not.toMatch(/sector\s*=/);
  });

  it('6. no lifecycle/status/pipeline/BOQ/notification/RLS/RPC/edge changes', () => {
    expect(FROM_QUOTE).not.toMatch(/work_order_boq/);
    expect(FROM_QUOTE).not.toMatch(/work_order_measurements/);
    expect(FROM_QUOTE).not.toMatch(/work_order_pipeline_events/);
    expect(FROM_QUOTE).not.toMatch(/\.rpc\(/);
    expect(FROM_QUOTE).not.toMatch(/supabase\.functions/);
    expect(FROM_QUOTE).not.toMatch(/notifications\//);
  });
});

describe('Phase 4F — other wrappers untouched', () => {
  it('7. createWorkOrderFromContract still does not pass taxonomy', () => {
    expect(FROM_CONTRACT).not.toMatch(/taxonomy_category_id/);
  });
  it('8. createWorkOrderFromLead still does not pass taxonomy', () => {
    expect(FROM_LEAD).not.toMatch(/taxonomy_category_id/);
  });
  it('9. createWorkOrderFromBooking still does not pass taxonomy', () => {
    expect(FROM_BOOKING).not.toMatch(/taxonomy_category_id/);
  });
  it('10. createWorkOrder pass-through unchanged', () => {
    expect(CREATE).toMatch(/taxonomy_category_id:\s*input\.taxonomy_category_id\s*\?\?\s*null/);
  });
});