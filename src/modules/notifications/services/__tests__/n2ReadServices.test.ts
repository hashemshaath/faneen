import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = Record<string, ReturnType<typeof vi.fn>> & {
  _result?: unknown;
};

const makeChain = (): Chain => {
  const chain = {} as Chain;
  for (const m of ['select', 'eq', 'gte', 'order', 'limit', 'returns']) {
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
  listNotificationsForUser,
  listRecentNotificationsForUser,
  countUnreadNotificationsForUser,
  countNotificationsForUserSince,
  listNotificationCreatedAtSeries,
  listLiveActivityNotifications,
} from '../../index';

beforeEach(() => {
  fromMock.mockClear();
  for (const k of Object.keys(chain)) (chain[k] as ReturnType<typeof vi.fn>).mockClear?.();
  for (const k of ['select', 'eq', 'gte', 'order', 'limit', 'returns']) {
    chain[k] = vi.fn(() => chain);
  }
});

describe('N-2 notification read/list/count services', () => {
  it('listNotificationsForUser: table, default select, eq user_id, order desc, no limit', () => {
    listNotificationsForUser({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).not.toHaveBeenCalled();
  });

  it('listNotificationsForUser: passes through select and limit', () => {
    listNotificationsForUser({ userId: 'u1', select: 'id, title_ar', limit: 50 });
    expect(chain.select).toHaveBeenCalledWith('id, title_ar');
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('listRecentNotificationsForUser: exact select/order/limit + user_id filter', () => {
    const sel = 'id, title_ar, title_en, body_ar, body_en, notification_type, is_read, created_at, action_url';
    listRecentNotificationsForUser({ userId: 'u2', select: sel, limit: 5 });
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.select).toHaveBeenCalledWith(sel);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u2');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('countUnreadNotificationsForUser: head+count with user_id and is_read=false filters', () => {
    countUnreadNotificationsForUser({ userId: 'u3' });
    expect(fromMock).toHaveBeenCalledWith('notifications');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'u3');
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'is_read', false);
  });

  it('countNotificationsForUserSince: head+count with user_id and gte created_at', () => {
    countNotificationsForUserSince({ userId: 'u4', sinceIso: '2026-01-01T00:00:00Z' });
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u4');
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z');
  });

  it('listNotificationCreatedAtSeries: select created_at, user filter, gte, limit (default 500)', () => {
    listNotificationCreatedAtSeries({ userId: 'u5', sinceIso: 'S' });
    expect(chain.select).toHaveBeenCalledWith('created_at');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u5');
    expect(chain.gte).toHaveBeenCalledWith('created_at', 'S');
    expect(chain.limit).toHaveBeenCalledWith(500);
  });

  it('listLiveActivityNotifications: exact preview select, order desc, limit (default 15)', () => {
    listLiveActivityNotifications({ userId: 'u6' });
    expect(chain.select).toHaveBeenCalledWith(
      'id, title_ar, title_en, body_ar, body_en, action_url, is_read, created_at',
    );
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u6');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(15);
  });
});