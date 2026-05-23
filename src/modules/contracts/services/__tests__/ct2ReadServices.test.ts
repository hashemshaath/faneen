import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result<T> = { data: T | null; error: { message: string } | null; count?: number | null };

const builderState = {
  select: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
  not: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  _result: { data: [], error: null, count: 0 } as Result<unknown[]>,
};

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

function makeBuilder() {
  // Methods chain on the builder. Awaiting the builder resolves to _result.
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => resolve(builderState._result),
  };
  builder.select = builderState.select.mockReturnValue(builder);
  builder.eq = builderState.eq.mockReturnValue(builder);
  builder.or = builderState.or.mockReturnValue(builder);
  builder.not = builderState.not.mockReturnValue(builder);
  builder.gte = builderState.gte.mockReturnValue(builder);
  builder.lt = builderState.lt.mockReturnValue(builder);
  builder.order = builderState.order.mockReturnValue(builder);
  builder.limit = builderState.limit.mockReturnValue(builder);
  builder.maybeSingle = builderState.maybeSingle.mockImplementation(() => Promise.resolve(builderState._result));
  builder.single = builderState.single.mockImplementation(() => Promise.resolve(builderState._result));
  return builder;
}

beforeEach(() => {
  builderState.select.mockReset();
  builderState.eq.mockReset();
  builderState.or.mockReset();
  builderState.not.mockReset();
  builderState.gte.mockReset();
  builderState.lt.mockReset();
  builderState.order.mockReset();
  builderState.limit.mockReset();
  builderState.maybeSingle.mockReset();
  builderState.single.mockReset();
  builderState._result = { data: [], error: null, count: 0 };
  fromMock.mockReset();
  fromMock.mockImplementation(() => makeBuilder());
});

describe('CT-2 read services — exact query shape', () => {
  it('getContractById defaults to maybeSingle with select=*', async () => {
    const { getContractById } = await import('../reads/getContractById');
    builderState._result = { data: { id: 'c1' }, error: null, count: null };
    const res = await getContractById({ id: 'c1' });
    expect(fromMock).toHaveBeenCalledWith('contracts');
    expect(builderState.select).toHaveBeenCalledWith('*');
    expect(builderState.eq).toHaveBeenCalledWith('id', 'c1');
    expect(builderState.maybeSingle).toHaveBeenCalledTimes(1);
    expect(builderState.single).not.toHaveBeenCalled();
    expect(res).toEqual({ data: { id: 'c1' }, error: null, count: null });
  });

  it('getContractById respects terminal=single + custom select', async () => {
    const { getContractById } = await import('../reads/getContractById');
    await getContractById({ id: 'c2', select: 'id, total_amount', terminal: 'single' });
    expect(builderState.select).toHaveBeenCalledWith('id, total_amount');
    expect(builderState.single).toHaveBeenCalledTimes(1);
  });

  it('listContractsForOwner applies eq(provider_id) and forwards count/order/limit', async () => {
    const { listContractsForOwner } = await import('../reads/listContractsForOwner');
    await listContractsForOwner({
      providerId: 'u1',
      select: 'id, status',
      count: { mode: 'exact' },
      orderBy: { column: 'created_at', ascending: false },
      limit: 5,
    });
    expect(builderState.select).toHaveBeenCalledWith('id, status', { count: 'exact', head: undefined });
    expect(builderState.eq).toHaveBeenCalledWith('provider_id', 'u1');
    expect(builderState.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builderState.limit).toHaveBeenCalledWith(5);
  });

  it('listContractsForOwner invokes customize() between eq and order', async () => {
    const { listContractsForOwner } = await import('../reads/listContractsForOwner');
    const customize = vi.fn((q: { eq: (a: string, b: string) => unknown }) => q.eq('client_id', 'X'));
    await listContractsForOwner({
      providerId: 'u9',
      select: 'id',
      orderBy: { column: 'created_at', ascending: false },
      limit: 5,
      customize: customize as never,
    });
    expect(customize).toHaveBeenCalledTimes(1);
    // first eq() = provider filter, second eq() = customize callback
    expect(builderState.eq).toHaveBeenNthCalledWith(1, 'provider_id', 'u9');
    expect(builderState.eq).toHaveBeenNthCalledWith(2, 'client_id', 'X');
  });

  it('listContractsForCustomer applies eq(client_id) + order + limit', async () => {
    const { listContractsForCustomer } = await import('../reads/listContractsForCustomer');
    await listContractsForCustomer({ clientId: 'u2', select: '*', orderBy: { column: 'created_at', ascending: false } });
    expect(builderState.eq).toHaveBeenCalledWith('client_id', 'u2');
    expect(builderState.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('listContractsForUserParticipant applies OR + gteCreatedAt + count', async () => {
    const { listContractsForUserParticipant } = await import('../reads/listContractsForUserParticipant');
    await listContractsForUserParticipant({
      userId: 'u3',
      select: 'id',
      count: { mode: 'exact', head: true },
      gteCreatedAt: '2024-01-01',
    });
    expect(builderState.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builderState.or).toHaveBeenCalledWith('client_id.eq.u3,provider_id.eq.u3');
    expect(builderState.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
  });

  it('listContractsForProviderOrBusiness combines provider/business OR + gteCreatedAt', async () => {
    const { listContractsForProviderOrBusiness } = await import('../reads/listContractsForProviderOrBusiness');
    await listContractsForProviderOrBusiness({
      userId: 'u4',
      businessId: 'b1',
      select: 'id, status, total_amount, created_at, currency_code',
      gteCreatedAt: '2024-06-01',
    });
    expect(builderState.select).toHaveBeenCalledWith('id, status, total_amount, created_at, currency_code');
    expect(builderState.or).toHaveBeenCalledWith('provider_id.eq.u4,business_id.eq.b1');
    expect(builderState.gte).toHaveBeenCalledWith('created_at', '2024-06-01');
  });

  it('listContractCreatedAtSeries selects created_at, applies or + gte + limit', async () => {
    const { listContractCreatedAtSeries } = await import('../reads/listContractCreatedAtSeries');
    await listContractCreatedAtSeries({ userId: 'u5', since: '2024-01-01' });
    expect(builderState.select).toHaveBeenCalledWith('created_at');
    expect(builderState.or).toHaveBeenCalledWith('client_id.eq.u5,provider_id.eq.u5');
    expect(builderState.gte).toHaveBeenCalledWith('created_at', '2024-01-01');
    expect(builderState.limit).toHaveBeenCalledWith(500);
  });

  it('listEndingSoonContractsForUser applies status/end_date/lt/or/limit', async () => {
    const { listEndingSoonContractsForUser } = await import('../reads/listEndingSoonContractsForUser');
    await listEndingSoonContractsForUser({ userId: 'u6', cutoffDate: '2024-12-31', limit: 10 });
    expect(builderState.select).toHaveBeenCalledWith('id');
    expect(builderState.eq).toHaveBeenCalledWith('status', 'active');
    expect(builderState.not).toHaveBeenCalledWith('end_date', 'is', null);
    expect(builderState.lt).toHaveBeenCalledWith('end_date', '2024-12-31');
    expect(builderState.or).toHaveBeenCalledWith('client_id.eq.u6,provider_id.eq.u6');
    expect(builderState.limit).toHaveBeenCalledWith(10);
  });

  it('listDistinctContractBusinessIds selects business_id with not-null', async () => {
    const { listDistinctContractBusinessIds } = await import('../reads/listDistinctContractBusinessIds');
    await listDistinctContractBusinessIds();
    expect(builderState.select).toHaveBeenCalledWith('business_id');
    expect(builderState.not).toHaveBeenCalledWith('business_id', 'is', null);
  });

  it('listActiveContractTemplates: default active=true ordered ascending', async () => {
    const { listActiveContractTemplates } = await import('../reads/listActiveContractTemplates');
    await listActiveContractTemplates({ select: '*', orderBy: { column: 'sort_order' } });
    expect(fromMock).toHaveBeenCalledWith('contract_templates');
    expect(builderState.select).toHaveBeenCalledWith('*');
    expect(builderState.eq).toHaveBeenCalledWith('is_active', true);
    expect(builderState.order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('listActiveContractTemplates: activeOnly=false skips eq filter (admin variant)', async () => {
    const { listActiveContractTemplates } = await import('../reads/listActiveContractTemplates');
    await listActiveContractTemplates({
      select: 'id,slug',
      activeOnly: false,
      orderBy: { column: 'updated_at', ascending: false },
    });
    expect(builderState.eq).not.toHaveBeenCalled();
    expect(builderState.order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('listAllContracts admin variant: eqStatus + count head', async () => {
    const { listAllContracts } = await import('../reads/listAllContracts');
    await listAllContracts({ select: 'id', count: { mode: 'exact', head: true }, eqStatus: 'pending_approval' });
    expect(fromMock).toHaveBeenCalledWith('contracts');
    expect(builderState.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(builderState.eq).toHaveBeenCalledWith('status', 'pending_approval');
  });

  it('listAllContracts admin variant: gteCreatedAt today counter', async () => {
    const { listAllContracts } = await import('../reads/listAllContracts');
    await listAllContracts({ select: 'id', count: { mode: 'exact', head: true }, gteCreatedAt: '2024-06-01' });
    expect(builderState.gte).toHaveBeenCalledWith('created_at', '2024-06-01');
  });
});