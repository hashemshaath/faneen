import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  _result: { data: unknown; error: unknown };
};

const calls: { table: string; builder: Builder }[] = [];

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Builder = {
    _result: result,
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    in: vi.fn(() => Promise.resolve(b._result)),
    order: vi.fn(() => b),
    limit: vi.fn(() => Promise.resolve(b._result)),
  };
  return b;
}

let nextResult: { data: unknown; error: unknown } = { data: [], error: null };
const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder(nextResult);
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  listProviderLeads,
  listAdminQuoteRequests,
  countQuoteRequestFiles,
  listMyLeadRequests,
  listMyQuoteRequests,
} from '../list';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: [], error: null };
});

describe('leads list service', () => {
  it('listProviderLeads queries quote_request_leads with nested select, desc order, limit 100', async () => {
    nextResult = { data: [{ id: 'l1' }], error: null };
    const rows = await listProviderLeads();
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.select).toHaveBeenCalledWith(expect.stringContaining('quote_request:quote_requests('));
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(calls[0].builder.limit).toHaveBeenCalledWith(100);
    expect(rows).toEqual([{ id: 'l1' }]);
  });

  it('listAdminQuoteRequests uses quote_requests and limit 500', async () => {
    nextResult = { data: [{ id: 'q1' }], error: null };
    await listAdminQuoteRequests();
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith(
      'id, customer_name, customer_phone, customer_type, sector, city, status, created_at',
    );
    expect(calls[0].builder.limit).toHaveBeenCalledWith(500);
  });

  it('countQuoteRequestFiles returns empty Map without querying when ids empty', async () => {
    const m = await countQuoteRequestFiles([]);
    expect(m.size).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('countQuoteRequestFiles aggregates counts correctly', async () => {
    nextResult = {
      data: [
        { quote_request_id: 'a' },
        { quote_request_id: 'a' },
        { quote_request_id: 'b' },
      ],
      error: null,
    };
    const m = await countQuoteRequestFiles(['a', 'b']);
    expect(calls[0].table).toBe('quote_request_files');
    expect(calls[0].builder.in).toHaveBeenCalledWith('quote_request_id', ['a', 'b']);
    expect(m.get('a')).toBe(2);
    expect(m.get('b')).toBe(1);
  });

  it('listMyLeadRequests filters by user_id and limit 200', async () => {
    await listMyLeadRequests('user-1');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(calls[0].builder.limit).toHaveBeenCalledWith(200);
  });

  it('listMyQuoteRequests filters by user_id and limit 100', async () => {
    await listMyQuoteRequests('user-2');
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('user_id', 'user-2');
    expect(calls[0].builder.limit).toHaveBeenCalledWith(100);
  });

  it('wrappers throw on query error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listProviderLeads()).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listAdminQuoteRequests()).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(countQuoteRequestFiles(['x'])).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listMyLeadRequests('u')).rejects.toMatchObject({ message: 'boom' });
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(listMyQuoteRequests('u')).rejects.toMatchObject({ message: 'boom' });
  });
});