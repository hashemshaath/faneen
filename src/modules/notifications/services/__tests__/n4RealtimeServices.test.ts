import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  _onCalls: Array<{ topic: string; config: Record<string, unknown>; cb: (p: unknown) => void }>;
  _subscribeCb?: (status: string) => void;
};

const makeChain = (): Chain => {
  const chain: Chain = {
    on: vi.fn(),
    subscribe: vi.fn(),
    _onCalls: [],
  };
  chain.on.mockImplementation((topic: string, config: Record<string, unknown>, cb: (p: unknown) => void) => {
    chain._onCalls.push({ topic, config, cb });
    return chain;
  });
  chain.subscribe.mockImplementation((cb?: (status: string) => void) => {
    chain._subscribeCb = cb;
    return chain;
  });
  return chain;
};

let chain: Chain;
const channelMock = vi.fn();
const removeChannelMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (n: string) => channelMock(n),
    removeChannel: (c: unknown) => removeChannelMock(c),
  },
}));

import { subscribeUserNotifications } from '../../index';

beforeEach(() => {
  chain = makeChain();
  channelMock.mockReset();
  channelMock.mockImplementation(() => chain);
  removeChannelMock.mockReset();
});

describe('N-4 subscribeUserNotifications', () => {
  it('uses exact channel name and wires a single * listener with correct config', () => {
    const onChange = vi.fn();
    subscribeUserNotifications({
      userId: 'u1',
      channelName: 'dashboard-notifications-u1',
      listeners: [{ event: '*', onChange }],
    });
    expect(channelMock).toHaveBeenCalledWith('dashboard-notifications-u1');
    expect(chain._onCalls).toHaveLength(1);
    const call = chain._onCalls[0];
    expect(call.topic).toBe('postgres_changes');
    expect(call.config).toEqual({
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: 'user_id=eq.u1',
    });
    expect(call.cb).toBe(onChange);
    expect(chain.subscribe).toHaveBeenCalledTimes(1);
  });

  it('supports multiple INSERT + UPDATE listeners on a single channel', () => {
    const onInsert = vi.fn();
    const onUpdate = vi.fn();
    subscribeUserNotifications({
      userId: 'u9',
      channelName: 'user-notifications',
      listeners: [
        { event: 'INSERT', onChange: onInsert },
        { event: 'UPDATE', onChange: onUpdate },
      ],
    });
    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(chain._onCalls).toHaveLength(2);
    expect(chain._onCalls[0].config).toMatchObject({ event: 'INSERT', table: 'notifications', schema: 'public', filter: 'user_id=eq.u9' });
    expect(chain._onCalls[1].config).toMatchObject({ event: 'UPDATE', table: 'notifications', schema: 'public', filter: 'user_id=eq.u9' });
    expect(chain._onCalls[0].cb).toBe(onInsert);
    expect(chain._onCalls[1].cb).toBe(onUpdate);
  });

  it('forwards onStatus to .subscribe and returns cleanup that removes channel', () => {
    const onStatus = vi.fn();
    const cleanup = subscribeUserNotifications({
      userId: 'u2',
      channelName: `dashboard-activity-u2`,
      listeners: [{ event: '*', onChange: () => {} }],
      onStatus,
    });
    expect(chain.subscribe).toHaveBeenCalledTimes(1);
    // Invoke the subscribe callback the helper supplied
    chain._subscribeCb?.('SUBSCRIBED');
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');

    cleanup();
    expect(removeChannelMock).toHaveBeenCalledWith(chain);
  });

  it('calls .subscribe() with no args when onStatus is omitted', () => {
    subscribeUserNotifications({
      userId: 'u3',
      channelName: 'c',
      listeners: [{ event: '*', onChange: () => {} }],
    });
    expect(chain.subscribe).toHaveBeenCalledWith();
  });
});