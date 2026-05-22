import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result<T> = { data: T | null; error: { message: string } | null };

interface ChainCalls {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in_: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

const results = new Map<string, Result<unknown[]>>();
const calls = new Map<string, ChainCalls>();
const fromMock = vi.fn();
const storageFromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    storage: { from: (b: string) => storageFromMock(b) },
  },
}));

function setResult(table: string, r: Result<unknown[]>) {
  results.set(table, r);
}

function getCalls(table: string): ChainCalls {
  const c = calls.get(table);
  if (!c) throw new Error(`no calls recorded for ${table}`);
  return c;
}

function makeBuilder(table: string) {
  const orderCalls: Array<[string, unknown?]> = [];
  const chain: Record<string, unknown> = {};
  const select = vi.fn(() => chain);
  const eq = vi.fn(() => chain);
  const in_ = vi.fn(() => chain);
  const limit = vi.fn(() => Promise.resolve(results.get(table) ?? { data: [], error: null }));
  const order = vi.fn((col: string, opts?: unknown) => {
    orderCalls.push([col, opts]);
    return {
      ...chain,
      then: (resolve: (v: Result<unknown[]>) => unknown) =>
        Promise.resolve(results.get(table) ?? { data: [], error: null }).then(resolve),
      limit,
    };
  });
  Object.assign(chain, {
    select, eq, in: in_, order, limit,
    then: (resolve: (v: Result<unknown[]>) => unknown) =>
      Promise.resolve(results.get(table) ?? { data: [], error: null }).then(resolve),
  });
  calls.set(table, { select, eq, in_, order, limit });
  return chain;
}

beforeEach(() => {
  results.clear();
  calls.clear();
  fromMock.mockReset();
  storageFromMock.mockReset();
  fromMock.mockImplementation((table: string) => makeBuilder(table));
});

describe('aggregates — empty short-circuits (no supabase.from call)', () => {
  it.each([
    ['listMilestonesForContracts'],
    ['listNotesForContracts'],
    ['listAttachmentsForContracts'],
    ['listInstallmentPaymentsForContracts'],
    ['listMeasurementsForContracts'],
    ['listWarrantiesForContracts'],
    ['listMaintenanceRequestsForContracts'],
    ['listAmendmentsForContracts'],
    ['listLineItemsForContracts'],
  ])('%s returns [] without querying when ids empty', async (name) => {
    const mod = await import('../aggregates');
    const fn = (mod as unknown as Record<string, (ids: string[]) => Promise<unknown[]>>)[name];
    const out = await fn([]);
    expect(out).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('aggregates — query shapes', () => {
  it('milestones uses contract_milestones + select * + in contract_id + order sort_order', async () => {
    setResult('contract_milestones', { data: [{ id: 'm1' }], error: null });
    const { listMilestonesForContracts } = await import('../aggregates');
    const out = await listMilestonesForContracts(['c1']);
    expect(fromMock).toHaveBeenCalledWith('contract_milestones');
    const c = getCalls('contract_milestones');
    expect(c.select).toHaveBeenCalledWith('*');
    expect(c.in_).toHaveBeenCalledWith('contract_id', ['c1']);
    expect(c.order).toHaveBeenCalledWith('sort_order');
    expect(out).toEqual([{ id: 'm1' }]);
  });

  it('notes preserves created_at desc + limit(200)', async () => {
    setResult('contract_notes', { data: [], error: null });
    const { listNotesForContracts } = await import('../aggregates');
    await listNotesForContracts(['c1']);
    const c = getCalls('contract_notes');
    expect(c.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(c.limit).toHaveBeenCalledWith(200);
  });

  it('attachments does not call storage / signed URLs', async () => {
    const { listAttachmentsForContracts } = await import('../aggregates');
    await listAttachmentsForContracts(['c1']);
    expect(storageFromMock).not.toHaveBeenCalled();
    const c = getCalls('contract_attachments');
    expect(c.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('line_items orders by sort_order', async () => {
    const { listLineItemsForContracts } = await import('../aggregates');
    await listLineItemsForContracts(['c1']);
    expect(getCalls('contract_line_items').order).toHaveBeenCalledWith('sort_order');
  });

  it('maintenance + amendments order created_at desc', async () => {
    const mod = await import('../aggregates');
    await mod.listMaintenanceRequestsForContracts(['c1']);
    await mod.listAmendmentsForContracts(['c1']);
    expect(getCalls('maintenance_requests').order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(getCalls('contract_amendments').order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

describe('aggregates — installment two-step + synthetic contract_id', () => {
  it('runs plans then payments and enriches with contract_id', async () => {
    setResult('installment_plans', {
      data: [{ id: 'p1', contract_id: 'c1' }, { id: 'p2', contract_id: 'c2' }],
      error: null,
    });
    setResult('installment_payments', {
      data: [{ id: 'pay1', plan_id: 'p1' }, { id: 'pay2', plan_id: 'p2' }],
      error: null,
    });
    const { listInstallmentPaymentsForContracts } = await import('../aggregates');
    const out = await listInstallmentPaymentsForContracts(['c1', 'c2']);
    expect(fromMock).toHaveBeenCalledWith('installment_plans');
    expect(fromMock).toHaveBeenCalledWith('installment_payments');
    expect(getCalls('installment_plans').select).toHaveBeenCalledWith('id, contract_id');
    expect(getCalls('installment_payments').in_).toHaveBeenCalledWith('plan_id', ['p1', 'p2']);
    expect(out).toEqual([
      { id: 'pay1', plan_id: 'p1', contract_id: 'c1' },
      { id: 'pay2', plan_id: 'p2', contract_id: 'c2' },
    ]);
  });

  it('returns [] when no plans exist (does not call payments)', async () => {
    setResult('installment_plans', { data: [], error: null });
    const { listInstallmentPaymentsForContracts } = await import('../aggregates');
    const out = await listInstallmentPaymentsForContracts(['c1']);
    expect(out).toEqual([]);
    expect(fromMock).toHaveBeenCalledWith('installment_plans');
    expect(fromMock).not.toHaveBeenCalledWith('installment_payments');
  });
});

describe('aggregates — error swallowing (no throw, returns [])', () => {
  it('milestones returns [] on error', async () => {
    setResult('contract_milestones', { data: null, error: { message: 'rls' } });
    const { listMilestonesForContracts } = await import('../aggregates');
    await expect(listMilestonesForContracts(['c1'])).resolves.toEqual([]);
  });

  it('installment payments returns [] when plans query errors (no plans)', async () => {
    setResult('installment_plans', { data: null, error: { message: 'rls' } });
    const { listInstallmentPaymentsForContracts } = await import('../aggregates');
    await expect(listInstallmentPaymentsForContracts(['c1'])).resolves.toEqual([]);
  });
});