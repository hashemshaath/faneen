import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  _result: { data: unknown; count?: number | null; error: unknown };
};

const calls: Array<{ table: string; builder: Builder }> = [];

function makeBuilder(result: Builder['_result']): Builder {
  const b = { _result: result } as Builder;
  // Terminal returns the awaited result; chain methods return self.
  // For count/head requests the chain ends at .gte / .eq.
  const term = () => Promise.resolve(b._result);
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => Object.assign(b, { then: (r: (v: unknown) => void) => term().then(r) }));
  b.gte = vi.fn(() => Object.assign(b, { then: (r: (v: unknown) => void) => term().then(r) }));
  b.order = vi.fn(() => b);
  b.limit = vi.fn(() => term());
  return b;
}

let nextResult: Builder['_result'] = { data: [], count: 0, error: null };
const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder(nextResult);
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { countLeadsByDateRange } from '../countLeadsByDateRange';
import { countLeadsByStatus } from '../countLeadsByStatus';
import { countLeadsForBusiness } from '../countLeadsForBusiness';
import {
  listLeadAnalyticsForBusiness,
  LEAD_ANALYTICS_SELECT,
} from '../listLeadAnalyticsForBusiness';
import {
  listRecentLeadsForBusiness,
  RECENT_LEAD_SELECT,
} from '../listRecentLeadsForBusiness';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: [], count: 0, error: null };
});

describe('L-2 lead read services', () => {
  it('countLeadsByDateRange queries lead_requests with count/head + gte', async () => {
    nextResult = { data: null, count: 7, error: null };
    const res = await countLeadsByDateRange('2026-01-01T00:00:00.000Z');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(calls[0].builder.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00.000Z');
    expect(res).toEqual({ count: 7, error: null });
  });

  it('countLeadsByStatus filters by status', async () => {
    nextResult = { data: null, count: 3, error: null };
    const res = await countLeadsByStatus('new');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(calls[0].builder.eq).toHaveBeenCalledWith('status', 'new');
    expect(res.count).toBe(3);
  });

  it('countLeadsForBusiness filters by business_id', async () => {
    nextResult = { data: null, count: 12, error: null };
    const res = await countLeadsForBusiness('biz-1');
    expect(calls[0].builder.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(res.count).toBe(12);
  });

  it('listLeadAnalyticsForBusiness preserves exact select + filters', async () => {
    const rows = [{ id: 'l1' }];
    nextResult = { data: rows, error: null };
    const out = await listLeadAnalyticsForBusiness('biz-2', '2026-02-01T00:00:00.000Z');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.select).toHaveBeenCalledWith(LEAD_ANALYTICS_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('business_id', 'biz-2');
    expect(calls[0].builder.gte).toHaveBeenCalledWith('created_at', '2026-02-01T00:00:00.000Z');
    expect(out).toEqual(rows);
  });

  it('listLeadAnalyticsForBusiness throws on error so caller can rewrap', async () => {
    nextResult = { data: null, error: new Error('boom') };
    await expect(listLeadAnalyticsForBusiness('biz-3', 'iso')).rejects.toThrow('boom');
  });

  it('listRecentLeadsForBusiness uses order + limit 20', async () => {
    nextResult = { data: [], error: null };
    await listRecentLeadsForBusiness('biz-4');
    expect(calls[0].builder.select).toHaveBeenCalledWith(RECENT_LEAD_SELECT);
    expect(calls[0].builder.eq).toHaveBeenCalledWith('business_id', 'biz-4');
    expect(calls[0].builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(calls[0].builder.limit).toHaveBeenCalledWith(20);
  });
});