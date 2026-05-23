import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = Record<string, ReturnType<typeof vi.fn>>;

const makeChain = (): Chain => {
  const chain = {} as Chain;
  for (const m of ['select', 'eq', 'maybeSingle', 'upsert']) {
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
  getUserNotificationPreferences,
  upsertUserNotificationPreferences,
  getBusinessNotificationPreferences,
  upsertBusinessNotificationPreferences,
} from '../../index';

beforeEach(() => {
  fromMock.mockClear();
  for (const k of ['select', 'eq', 'maybeSingle', 'upsert']) {
    chain[k] = vi.fn(() => chain);
  }
});

describe('N-5 notification preference services', () => {
  it('getUserNotificationPreferences: table notification_preferences, select *, eq user_id, maybeSingle', () => {
    getUserNotificationPreferences('u1');
    expect(fromMock).toHaveBeenCalledWith('notification_preferences');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('getBusinessNotificationPreferences: table business_notification_preferences, select *, eq business_id, maybeSingle', () => {
    getBusinessNotificationPreferences('b1');
    expect(fromMock).toHaveBeenCalledWith('business_notification_preferences');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('upsertUserNotificationPreferences: exact payload + onConflict user_id, no transformation', () => {
    const payload = { user_id: 'u1', email_enabled: true, inapp_system: true } as unknown as Parameters<typeof upsertUserNotificationPreferences>[0];
    upsertUserNotificationPreferences(payload);
    expect(fromMock).toHaveBeenCalledWith('notification_preferences');
    expect(chain.upsert).toHaveBeenCalledTimes(1);
    const [arg, opts] = chain.upsert.mock.calls[0];
    expect(arg).toBe(payload);
    expect(opts).toEqual({ onConflict: 'user_id' });
  });

  it('upsertBusinessNotificationPreferences: exact payload + onConflict business_id, no transformation', () => {
    const payload = { business_id: 'b1', email_enabled: false } as unknown as Parameters<typeof upsertBusinessNotificationPreferences>[0];
    upsertBusinessNotificationPreferences(payload);
    expect(fromMock).toHaveBeenCalledWith('business_notification_preferences');
    expect(chain.upsert).toHaveBeenCalledTimes(1);
    const [arg, opts] = chain.upsert.mock.calls[0];
    expect(arg).toBe(payload);
    expect(opts).toEqual({ onConflict: 'business_id' });
  });

  it('raw passthrough: get/upsert return the underlying chain (no result wrapping)', () => {
    expect(getUserNotificationPreferences('u')).toBe(chain);
    expect(getBusinessNotificationPreferences('b')).toBe(chain);
    expect(upsertUserNotificationPreferences({ user_id: 'u' } as unknown as Parameters<typeof upsertUserNotificationPreferences>[0])).toBe(chain);
    expect(upsertBusinessNotificationPreferences({ business_id: 'b' } as unknown as Parameters<typeof upsertBusinessNotificationPreferences>[0])).toBe(chain);
  });
});