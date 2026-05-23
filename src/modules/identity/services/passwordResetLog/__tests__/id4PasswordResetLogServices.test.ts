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
  it('inserts payload verbatim into password_reset_log', () => {
    const b = makeBuilder();
    fromMock.mockReturnValue(b);
    const payload = { email: 'a@b.com', status: 'requested', user_id: 'u', request_id: 'r', user_agent: 'ua' };
    createPasswordResetLog(payload);
    expect(fromMock).toHaveBeenCalledWith('password_reset_log');
    expect(b.insert).toHaveBeenCalledWith(payload);
    // Safety: no transformation, no extra props.
    expect(b.insert.mock.calls[0][0]).toEqual(payload);
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