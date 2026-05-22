import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>;
};

const calls: { table: string; builder: Builder }[] = [];
let nextResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeBuilder(): Builder {
  const b = {} as Builder;
  b.update = vi.fn(() => b);
  b.insert = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.then = (resolve) => Promise.resolve(nextResult).then(resolve);
  return b;
}

const fromMock = vi.fn((table: string) => {
  const builder = makeBuilder();
  calls.push({ table, builder });
  return builder;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  updateLeadRequestStatus,
  updateMyQuoteRequest,
  markProviderLeadViewed,
  updateProviderLeadResponse,
  insertProviderLeadEvent,
} from '../mutations';

beforeEach(() => {
  calls.length = 0;
  fromMock.mockClear();
  nextResult = { data: null, error: null };
});

describe('leads mutation service', () => {
  it('updateLeadRequestStatus updates lead_requests with status only', async () => {
    await updateLeadRequestStatus('l1', 'accepted');
    expect(calls[0].table).toBe('lead_requests');
    expect(calls[0].builder.update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'l1');
  });

  it('updateLeadRequestStatus merges quote extra fields exactly', async () => {
    await updateLeadRequestStatus('l1', 'quoted', {
      quote_amount: 1234,
      quote_currency: 'SAR',
      quote_note: 'note',
      quote_valid_until: '2026-01-01',
    });
    expect(calls[0].builder.update).toHaveBeenCalledWith({
      status: 'quoted',
      quote_amount: 1234,
      quote_currency: 'SAR',
      quote_note: 'note',
      quote_valid_until: '2026-01-01',
    });
  });

  it('updateLeadRequestStatus throws on error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(updateLeadRequestStatus('l1', 'accepted')).rejects.toMatchObject({ message: 'boom' });
  });

  it('updateMyQuoteRequest updates quote_requests with eq id + user_id', async () => {
    const patch = { project_description: 'desc' };
    await updateMyQuoteRequest('q1', 'u1', patch);
    expect(calls[0].table).toBe('quote_requests');
    expect(calls[0].builder.update).toHaveBeenCalledWith(patch);
    expect(calls[0].builder.eq).toHaveBeenNthCalledWith(1, 'id', 'q1');
    expect(calls[0].builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'u1');
  });

  it('updateMyQuoteRequest throws on error', async () => {
    nextResult = { data: null, error: { message: 'denied' } };
    await expect(updateMyQuoteRequest('q1', 'u1', {})).rejects.toMatchObject({ message: 'denied' });
  });

  it('markProviderLeadViewed updates viewed status and returns {ok:true}', async () => {
    const res = await markProviderLeadViewed('p1');
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.update).toHaveBeenCalledWith({
      status: 'viewed',
      viewed_at: expect.any(String),
    });
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'p1');
    expect(res).toEqual({ ok: true });
  });

  it('markProviderLeadViewed swallows errors and returns {ok:false}', async () => {
    nextResult = { data: null, error: { message: 'rls' } };
    const res = await markProviderLeadViewed('p1');
    expect(res).toEqual({ ok: false });
  });

  it('updateProviderLeadResponse updates status + responded_at and throws on error', async () => {
    await updateProviderLeadResponse('p1', 'interested');
    expect(calls[0].table).toBe('quote_request_leads');
    expect(calls[0].builder.update).toHaveBeenCalledWith({
      status: 'interested',
      responded_at: expect.any(String),
    });
    expect(calls[0].builder.eq).toHaveBeenCalledWith('id', 'p1');

    calls.length = 0;
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(updateProviderLeadResponse('p1', 'not_interested')).rejects.toMatchObject({ message: 'boom' });
  });

  it('insertProviderLeadEvent inserts exact payload', async () => {
    const payload = {
      lead_id: 'l1',
      quote_request_id: 'q1',
      event_type: 'lead_viewed' as const,
      actor_user_id: 'u1',
      metadata: { previous_status: 'new', new_status: 'viewed' },
    };
    const res = await insertProviderLeadEvent(payload);
    expect(calls[0].table).toBe('quote_request_lead_events');
    expect(calls[0].builder.insert).toHaveBeenCalledWith(payload);
    expect(res).toEqual({ ok: true });
  });

  it('insertProviderLeadEvent throws on error', async () => {
    nextResult = { data: null, error: { message: 'boom' } };
    await expect(
      insertProviderLeadEvent({
        lead_id: 'l1', quote_request_id: null, event_type: 'lead_viewed',
        actor_user_id: null, metadata: {},
      }),
    ).rejects.toMatchObject({ message: 'boom' });
  });
});