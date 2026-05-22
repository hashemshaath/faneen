import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn((..._args: unknown[]) => ({ insert: insertMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  createQuoteRequestFileRecord,
  type CreateQuoteRequestFileRecordPayload,
} from '../createQuoteRequestFileRecord';

const payload: CreateQuoteRequestFileRecordPayload = {
  quote_request_id: 'qr-1',
  user_id: null,
  file_name: 'doc.pdf',
  file_path: 'qr-1/123-0-doc.pdf',
  file_size: 1234,
  file_type: 'application/pdf',
};

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
});

describe('createQuoteRequestFileRecord', () => {
  it('inserts into "quote_request_files" with the exact payload', async () => {
    insertMock.mockResolvedValue({ error: null });
    await createQuoteRequestFileRecord(payload);
    expect(fromMock).toHaveBeenCalledWith('quote_request_files');
    expect(insertMock).toHaveBeenCalledWith(payload);
  });

  it('does not call .select() after insert (mirrors prior Quote.tsx behavior)', async () => {
    insertMock.mockResolvedValue({ error: null });
    await createQuoteRequestFileRecord(payload);
    const ret = fromMock.mock.results[0]?.value as { insert: unknown; select?: unknown };
    expect(ret.select).toBeUndefined();
  });

  it('throws on insert error', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rls denied' } });
    await expect(createQuoteRequestFileRecord(payload)).rejects.toMatchObject({
      message: 'rls denied',
    });
  });
});