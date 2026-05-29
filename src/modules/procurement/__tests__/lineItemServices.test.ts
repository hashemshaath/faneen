import { describe, expect, it, vi, beforeEach } from 'vitest';

// Minimal Supabase client mock — captures the last builder chain.
const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
function makeBuilder(table: string) {
  const builder: Record<string, (..._a: unknown[]) => unknown> = {};
  const result = { data: null, error: null };
  const chain: Record<string, (..._a: unknown[]) => unknown> = {};
  ['select', 'eq', 'in', 'order', 'maybeSingle'].forEach((m) => {
    chain[m] = vi.fn(() => (m === 'maybeSingle' ? Promise.resolve(result) : chain));
  });
  for (const op of ['insert', 'upsert', 'update', 'delete']) {
    builder[op] = vi.fn((payload?: unknown) => {
      calls.push({ table, op, payload });
      return chain;
    });
  }
  builder.select = chain.select as never;
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: vi.fn(),
  },
}));

import {
  createRfqItem,
  updateRfqItem,
  deleteRfqItem,
  submitQuoteItems,
  calculateLineTotal,
} from '@/modules/procurement';

beforeEach(() => {
  calls.length = 0;
});

describe('rfqItems service contracts', () => {
  it('rejects empty name', async () => {
    const { error } = await createRfqItem({
      business_id: 'b',
      rfq_id: 'r',
      name: '   ',
      quantity: 1,
    });
    expect((error as Error).message).toBe('name_required');
  });

  it('rejects non-positive quantity', async () => {
    const { error } = await createRfqItem({
      business_id: 'b',
      rfq_id: 'r',
      name: 'ok',
      quantity: 0,
    });
    expect((error as Error).message).toBe('quantity_invalid');
  });

  it('rejects negative target_price', async () => {
    const { error } = await createRfqItem({
      business_id: 'b',
      rfq_id: 'r',
      name: 'ok',
      quantity: 1,
      target_price: -5,
    });
    expect((error as Error).message).toBe('target_price_invalid');
  });

  it('issues an insert against procurement_rfq_items', async () => {
    await createRfqItem({ business_id: 'b', rfq_id: 'r', name: 'X', quantity: 2 });
    expect(calls.some((c) => c.table === 'procurement_rfq_items' && c.op === 'insert')).toBe(true);
  });

  it('issues an update against procurement_rfq_items', async () => {
    await updateRfqItem('id1', { quantity: 3 });
    expect(calls.some((c) => c.table === 'procurement_rfq_items' && c.op === 'update')).toBe(true);
  });

  it('issues a delete against procurement_rfq_items', async () => {
    await deleteRfqItem('id1');
    expect(calls.some((c) => c.table === 'procurement_rfq_items' && c.op === 'delete')).toBe(true);
  });
});

describe('supplierQuoteItems service contracts', () => {
  it('calculateLineTotal multiplies safely', () => {
    expect(calculateLineTotal(10, 2)).toBe(20);
    expect(calculateLineTotal(null, 2)).toBeNull();
    expect(calculateLineTotal(10.005, 3)).toBe(30.02);
  });

  it('submitQuoteItems no-ops on empty input', async () => {
    const { data, error } = await submitQuoteItems([]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('submitQuoteItems rejects invalid quantity', async () => {
    const { error } = await submitQuoteItems([
      { business_id: 'b', quote_id: 'q', rfq_item_id: 'i', quantity: 0 },
    ]);
    expect((error as Error).message).toBe('quantity_invalid');
  });

  it('submitQuoteItems upserts against procurement_supplier_quote_items', async () => {
    await submitQuoteItems([
      { business_id: 'b', quote_id: 'q', rfq_item_id: 'i', quantity: 1, unit_price: 5 },
    ]);
    expect(
      calls.some(
        (c) =>
          c.table === 'procurement_supplier_quote_items' && c.op === 'upsert',
      ),
    ).toBe(true);
  });
});