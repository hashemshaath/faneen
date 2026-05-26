import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn((..._args: unknown[]) => ({ insert: insertMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { insertLeadRequest, type InsertLeadRequestPayload } from '../submit';

const payload: InsertLeadRequestPayload = {
  id: 'lead-1',
  business_id: 'biz-1',
  user_id: null,
  name: 'Test',
  email: 't@example.com',
  phone: null,
  phone_country_code: null,
  phone_national: null,
  subject: null,
  message: 'hello world long enough',
  budget_range: null,
  contact_preference: 'any',
  source: 'business-profile',
};

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
});

describe('insertLeadRequest', () => {
  it('inserts into lead_requests with the exact payload and returns id', async () => {
    insertMock.mockResolvedValue({ error: null });
    const result = await insertLeadRequest(payload);
    expect(fromMock).toHaveBeenCalledWith('lead_requests');
    expect(insertMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 'lead-1' });
  });

  it('throws when the insert returns an error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'RLS denied' } });
    await expect(insertLeadRequest(payload)).rejects.toMatchObject({ message: 'RLS denied' });
  });

  it('does not call .select() after insert (avoids RLS read on write)', async () => {
    insertMock.mockResolvedValue({ error: null });
    await insertLeadRequest(payload);
    const returned = fromMock.mock.results[0]?.value as { insert: typeof insertMock; select?: unknown };
    expect(returned.select).toBeUndefined();
  });
});