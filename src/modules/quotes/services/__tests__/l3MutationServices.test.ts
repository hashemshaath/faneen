import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  _result: { data: unknown; error: unknown };
};

const calls: Array<{ table: string; builder: Builder }> = [];
let nextResult: Builder['_result'] = { data: null, error: null };

function makeBuilder(result: Builder['_result']): Builder {
  const b = { _result: result } as Builder;
  const term = () => Promise.resolve(b._result);
  b.update = vi.fn(() => b);
  b.insert = vi.fn(() => term());
  b.eq = vi.fn(() => term());
  b.select = vi.fn(() => b);
  (b as unknown as { then: (r: (v: unknown) => void) => Promise<void> }).then = (r) => term().then(r);
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

import { updateQuoteRequestById } from '../updateQuoteRequestById';
import { insertQuoteRequestEvent } from '../insertQuoteRequestEvent';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: null, error: null };
});

describe('updateQuoteRequestById', () => {
  it('hits quote_requests, update(values), eq(id)', async () => {
    nextResult = { data: null, error: null };
    const values = { status: 'contacted', metadata: { a: 1 } };
    const res = await updateQuoteRequestById({ id: 'q1', values });
    expect(fromMock).toHaveBeenCalledWith('quote_requests');
    const c = calls[0];
    expect(c.table).toBe('quote_requests');
    expect(c.builder.update).toHaveBeenCalledTimes(1);
    // No payload transformation
    expect(c.builder.update.mock.calls[0][0]).toBe(values);
    expect(c.builder.eq).toHaveBeenCalledWith('id', 'q1');
    expect(c.builder.select).not.toHaveBeenCalled();
    expect(res).toEqual({ data: null, error: null });
  });

  it('passes through { data, error } raw', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    const res = await updateQuoteRequestById({ id: 'q2', values: { status: 'new' } });
    expect(res.error).toEqual({ message: 'boom' });
  });
});

describe('insertQuoteRequestEvent', () => {
  it('hits quote_request_events, insert(payload) raw, no .select()', async () => {
    nextResult = { data: null, error: null };
    const payload = {
      quote_request_id: 'q1',
      event_type: 'quote_status_changed',
      actor_user_id: 'u1',
      metadata: { previous_status: 'new', new_status: 'contacted', has_admin_notes: false },
    };
    const res = await insertQuoteRequestEvent(payload);
    expect(fromMock).toHaveBeenCalledWith('quote_request_events');
    const c = calls[0];
    expect(c.builder.insert).toHaveBeenCalledTimes(1);
    expect(c.builder.insert.mock.calls[0][0]).toBe(payload);
    expect(c.builder.select).not.toHaveBeenCalled();
    expect(res).toEqual({ data: null, error: null });
  });

  it('passes through { data, error } raw', async () => {
    nextResult = { data: null, error: { message: 'x' } };
    const res = await insertQuoteRequestEvent({
      quote_request_id: 'q', event_type: 't',
    });
    expect(res.error).toEqual({ message: 'x' });
  });
});