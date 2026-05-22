import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  _result: { data: unknown; error: unknown };
};

const calls: { table: string; builder: Builder }[] = [];
let nextResult: { data: unknown; error: unknown } = { data: [], error: null };

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Builder = {
    _result: result,
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    in: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => Promise.resolve(b._result)),
    maybeSingle: vi.fn(() => Promise.resolve(b._result)),
  };
  return b;
}

const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder(nextResult);
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  getProviderLeadDetail,
  getMyQuoteRequestDetail,
  listQuoteRequestFiles,
  listProviderLeadRequests,
  listAdminLeadRequests,
} from '../detail';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: [], error: null };
});

describe('leads detail service', () => {
  it('getProviderLeadDetail queries quote_request_leads with eq(id) + maybeSingle', async () => {
    nextResult = { data: { id: 'l1' }, error: null };
    const row = await getProviderLeadDetail('l1');
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.select).toHaveBeenCalledWith(
      expect.stringContaining('quote_request:quote_requests('),
    );
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'l1');
    expect(calls[0].builder.maybeSingle).toHaveBeenCalled();
    expect(row).toEqual({ id: 'l1' });
  });

  it('getProviderLeadDetail throws on error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(getProviderLeadDetail('x')).rejects.toMatchObject({ message: 'boom' });
  });

  it('getMyQuoteRequestDetail uses quote_requests, select(*), eq id+user_id, maybeSingle', async () => {
    nextResult = { data: { id: 'q1' }, error: null };
    await getMyQuoteRequestDetail('q1', 'u1');
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith('*');
    expect(calls[0].builder.eq).toHaveBeenNthCalledWith(1, 'id', 'q1');
    expect(calls[0].builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'u1');
    expect(calls[0].builder.maybeSingle).toHaveBeenCalled();
  });

  it('listQuoteRequestFiles uses quote_request_files, exact select, order desc', async () => {
    await listQuoteRequestFiles('q1');
    expect(calls[0].table).toBe('quote_request_files');
    expect(calls[0].builder.select).toHaveBeenCalledWith(
      'id, file_name, file_path, file_size, file_type, created_at',
    );
    expect(calls[0].builder.eq).toHaveBeenCalledWith('quote_request_id', 'q1');
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('listProviderLeadRequests short-circuits when businessIds is empty', async () => {
    const rows = await listProviderLeadRequests([], 'all');
    expect(rows).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('listProviderLeadRequests applies .in(business_id) and .eq(status) when filter !== all', async () => {
    nextResult = { data: [{ id: 'l1' }], error: null };
    await listProviderLeadRequests(['b1', 'b2'], 'new');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith('*');
    expect(calls[0].builder.in).toHaveBeenCalledWith('business_id', ['b1', 'b2']);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('status', 'new');
    expect(calls[0].builder.limit).toHaveBeenCalledWith(200);
  });

  it('listProviderLeadRequests omits .eq(status) when filter === all', async () => {
    await listProviderLeadRequests(['b1'], 'all');
    expect(calls[0].builder.eq).not.toHaveBeenCalled();
  });

  it('listAdminLeadRequests handles all/legacy/specific status filters', async () => {
    await listAdminLeadRequests('all');
    expect(calls[0].builder.eq).not.toHaveBeenCalled();
    expect(calls[0].builder.in).not.toHaveBeenCalled();

    calls.length = 0;
    await listAdminLeadRequests('legacy', ['contacted', 'qualified', 'spam']);
    expect(calls[0].builder.in).toHaveBeenCalledWith('status', ['contacted', 'qualified', 'spam']);

    calls.length = 0;
    await listAdminLeadRequests('new');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('status', 'new');
  });

  it('list wrappers throw on query error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listQuoteRequestFiles('x')).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listProviderLeadRequests(['b'], 'all')).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listAdminLeadRequests('all')).rejects.toMatchObject({ message: 'boom' });
  });
});