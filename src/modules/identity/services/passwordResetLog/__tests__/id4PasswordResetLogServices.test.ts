import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { createPasswordResetLog, listPasswordResetLogs } from '../index';

interface Builder {
  insert: Mock;
  select: Mock;
  order: Mock;
  limit: Mock;
  gte: Mock;
}

function makeBuilder(): Builder {
  const b = {} as Builder;
  const track = () => vi.fn(() => b);
  b.insert = track();
  b.select = track();
  b.order = track();
  b.limit = track();
  b.gte = track();
  return b;
}

const fromMock = supabase.from as unknown as Mock;
beforeEach(() => fromMock.mockReset());

describe('createPasswordResetLog', () => {
  it('inserts payload with sanitized metadata into password_reset_log', () => {
    const b = makeBuilder();
    fromMock.mockReturnValue(b);
    const payload = { email: 'a@b.com', status: 'requested', user_id: 'u', request_id: 'r', user_agent: 'ua' };
    createPasswordResetLog(payload);
    expect(fromMock).toHaveBeenCalledWith('password_reset_log');
    // PRA-2: wrapper always forces `metadata` through the sanitizer so
    // forbidden keys/oversized blobs can never reach the table, even when
    // the caller omits metadata. The remaining payload is preserved verbatim.
    expect(b.insert).toHaveBeenCalledWith({ ...payload, metadata: {} });
    const inserted = b.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted).toEqual({ ...payload, metadata: {} });
    // Safety: no other transformation, no extra props beyond the sanitized metadata.
    expect(Object.keys(inserted).sort()).toEqual(
      [...Object.keys(payload), 'metadata'].sort(),
    );
  });
});

describe('listPasswordResetLogs', () => {
  it('select * order desc limit 200 by default', () => {
    const b = makeBuilder();
    fromMock.mockReturnValue(b);
    listPasswordResetLogs();
    expect(fromMock).toHaveBeenCalledWith('password_reset_log');
    expect(b.select).toHaveBeenCalledWith('*');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(b.limit).toHaveBeenCalledWith(200);
    expect(b.gte).not.toHaveBeenCalled();
  });

  it('applies gte(created_at, sinceIso) and custom limit', () => {
    const b = makeBuilder();
    fromMock.mockReturnValue(b);
    listPasswordResetLogs({ sinceIso: '2025-01-01T00:00:00Z', limit: 500 });
    expect(b.limit).toHaveBeenCalledWith(500);
    expect(b.gte).toHaveBeenCalledWith('created_at', '2025-01-01T00:00:00Z');
  });
});