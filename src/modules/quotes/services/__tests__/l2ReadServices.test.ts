import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  _result: { data: unknown; error: unknown };
};

const calls: Array<{ table: string; builder: Builder }> = [];

function makeBuilder(result: Builder['_result']): Builder {
  const b = { _result: result } as Builder;
  const term = () => Promise.resolve(b._result);
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.gte = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.order = vi.fn(() => b);
  b.limit = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => term());
  // Builder is thenable, so any chain that ends without an explicit terminal
  // (or after .order / .limit / .in / .gte / .eq) still awaits to _result.
  (b as unknown as { then: (r: (v: unknown) => void) => Promise<void> }).then = (r) => term().then(r);
  return b;
}

let nextResult: Builder['_result'] = { data: [], error: null };
const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder(nextResult);
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getAdminQuoteRequestById } from '../getAdminQuoteRequestById';
import {
  listAdminQuoteRequestFiles, ADMIN_QUOTE_FILE_SELECT,
} from '../listAdminQuoteRequestFiles';
import {
  listAdminQuoteRequestLeads, ADMIN_QUOTE_LEAD_SELECT,
} from '../listAdminQuoteRequestLeads';
import {
  listAdminQuoteRequestEvents, ADMIN_QUOTE_EVENT_SELECT,
} from '../listAdminQuoteRequestEvents';
import {
  listAdminQuoteRequestLeadEvents, ADMIN_QUOTE_LEAD_EVENT_DETAIL_SELECT,
} from '../listAdminQuoteRequestLeadEvents';
import {
  listAdminOpsQuoteRequests, ADMIN_OPS_QUOTE_SELECT,
} from '../listAdminOpsQuoteRequests';
import {
  listAdminOpsQuoteRequestLeads, ADMIN_OPS_QUOTE_LEAD_SELECT,
} from '../listAdminOpsQuoteRequestLeads';
import {
  listAdminOpsQuoteRequestEvents, ADMIN_OPS_QUOTE_EVENT_SELECT,
} from '../listAdminOpsQuoteRequestEvents';
import {
  listAdminOpsQuoteRequestLeadEvents, ADMIN_OPS_QUOTE_LEAD_EVENT_SELECT,
} from '../listAdminOpsQuoteRequestLeadEvents';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: [], error: null };
});

describe('L-2 quote read services', () => {
  it('getAdminQuoteRequestById uses select * + maybeSingle', async () => {
    nextResult = { data: { id: 'q1' }, error: null };
    const r = await getAdminQuoteRequestById<{ id: string }>('q1');
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith('*');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'q1');
    expect(calls[0].builder.maybeSingle).toHaveBeenCalled();
    expect(r).toEqual({ id: 'q1' });
  });

  it('listAdminQuoteRequestFiles preserves select + order desc', async () => {
    await listAdminQuoteRequestFiles('q2');
    expect(calls[0].table).toBe('quote_request_files');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_QUOTE_FILE_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('quote_request_id', 'q2');
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('listAdminQuoteRequestLeads preserves join select + match_score order', async () => {
    await listAdminQuoteRequestLeads('q3');
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_QUOTE_LEAD_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('quote_request_id', 'q3');
    expect(calls[0].builder.order).toHaveBeenCalledWith('match_score', { ascending: false });
  });

  it('listAdminQuoteRequestEvents returns raw {data,error}', async () => {
    nextResult = { data: [{ id: 'e1' }], error: null };
    const r = await listAdminQuoteRequestEvents('q4');
    expect(calls[0].table).toBe('quote_request_events');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_QUOTE_EVENT_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('quote_request_id', 'q4');
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(r.data).toEqual([{ id: 'e1' }]);
    expect(r.error).toBeNull();
  });

  it('listAdminQuoteRequestLeadEvents preserves nested join select', async () => {
    const r = await listAdminQuoteRequestLeadEvents('q5');
    expect(calls[0].table).toBe('quote_request_lead_events');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_QUOTE_LEAD_EVENT_DETAIL_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('quote_request_id', 'q5');
    expect(r.error).toBeNull();
  });

  it('listAdminOpsQuoteRequests applies fromDateIso + sector filters and limit 1000', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: '2026-01-01', sector: 'aluminum' });
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_OPS_QUOTE_SELECT);
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(calls[0].builder.limit).toHaveBeenCalledWith(1000);
    expect(calls[0].builder.gte).toHaveBeenCalledWith('created_at', '2026-01-01');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('sector', 'aluminum');
  });

  it('listAdminOpsQuoteRequests skips filters when null/all', async () => {
    await listAdminOpsQuoteRequests({ fromDateIso: null, sector: 'all' });
    expect(calls[0].builder.gte).not.toHaveBeenCalled();
    expect(calls[0].builder.eq).not.toHaveBeenCalled();
  });

  it('listAdminOpsQuoteRequestLeads short-circuits empty quoteIds', async () => {
    const r = await listAdminOpsQuoteRequestLeads([]);
    expect(r).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('listAdminOpsQuoteRequestLeads uses .in + limit 5000 + join select', async () => {
    await listAdminOpsQuoteRequestLeads(['q1', 'q2']);
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_OPS_QUOTE_LEAD_SELECT);
    expect(calls[0].builder.in).toHaveBeenCalledWith('quote_request_id', ['q1', 'q2']);
    expect(calls[0].builder.limit).toHaveBeenCalledWith(5000);
  });

  it('listAdminOpsQuoteRequestEvents short-circuits empty quoteIds', async () => {
    const r = await listAdminOpsQuoteRequestEvents([]);
    expect(r).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('listAdminOpsQuoteRequestEvents uses .in + limit 5000', async () => {
    await listAdminOpsQuoteRequestEvents(['q1']);
    expect(calls[0].table).toBe('quote_request_events');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_OPS_QUOTE_EVENT_SELECT);
    expect(calls[0].builder.in).toHaveBeenCalledWith('quote_request_id', ['q1']);
    expect(calls[0].builder.limit).toHaveBeenCalledWith(5000);
  });

  it('listAdminOpsQuoteRequestLeadEvents uses .in + limit 10000', async () => {
    await listAdminOpsQuoteRequestLeadEvents(['q1', 'q2']);
    expect(calls[0].table).toBe('quote_request_lead_events');
    expect(calls[0].builder.select).toHaveBeenCalledWith(ADMIN_OPS_QUOTE_LEAD_EVENT_SELECT);
    expect(calls[0].builder.in).toHaveBeenCalledWith('quote_request_id', ['q1', 'q2']);
    expect(calls[0].builder.limit).toHaveBeenCalledWith(10000);
  });

  it('listAdminOpsQuoteRequestLeadEvents short-circuits empty quoteIds', async () => {
    const r = await listAdminOpsQuoteRequestLeadEvents([]);
    expect(r).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});