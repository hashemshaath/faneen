import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = Record<string, ReturnType<typeof vi.fn>>;

const makeChain = (): Chain => {
  const chain = {} as Chain;
  for (const m of ['update', 'delete', 'eq']) {
    chain[m] = vi.fn(() => chain);
  }
  return chain;
};

const chain = makeChain();
const fromMock = vi.fn((_t: string) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../index';

beforeEach(() => {
  fromMock.mockClear();
  for (const k of ['update', 'delete', 'eq']) {
    chain[k] = vi.fn(() => chain);
  }
});

describe('N-3 notification mutation services', () => {
  it('markNotificationRead: update is_read=true filtered by id, raw passthrough', () => {
    const result = markNotificationRead('n1');
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.update).toHaveBeenCalledWith({ is_read: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
    // raw chain returned (no transformation)
    expect(result).toBe(chain);
  });

  it('markAllNotificationsRead: update is_read=true with user_id + is_read=false filters', () => {
    const result = markAllNotificationsRead('u1');
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.update).toHaveBeenCalledWith({ is_read: true });
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'u1');
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'is_read', false);
    expect(result).toBe(chain);
  });

  it('deleteNotification: delete filtered by id, raw passthrough', () => {
    const result = deleteNotification('n1');
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.delete).toHaveBeenCalledTimes(1);
    expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
    expect(result).toBe(chain);
  });

  it('no payload transformation: update payload is exactly { is_read: true }', () => {
    markNotificationRead('x');
    const call = chain.update.mock.calls[0][0];
    expect(call).toEqual({ is_read: true });
    expect(Object.keys(call)).toEqual(['is_read']);
  });
});