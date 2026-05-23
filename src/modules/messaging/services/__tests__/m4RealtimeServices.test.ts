import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

const channelObj: Chain = {
  on: vi.fn(),
  subscribe: vi.fn(),
};
const channelMock = vi.fn((_name: string) => channelObj);
const removeChannelMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: (n: string) => channelMock(n),
    removeChannel: (c: unknown) => removeChannelMock(c),
  },
}));

import {
  subscribeConversationMessages,
  subscribeUserConversations,
} from '../../index';

beforeEach(() => {
  channelMock.mockClear();
  removeChannelMock.mockClear();
  channelObj.on = vi.fn(() => channelObj);
  channelObj.subscribe = vi.fn(() => channelObj);
});

describe('M-4 messaging realtime helpers', () => {
  it('subscribeConversationMessages preserves channel name, postgres_changes config, and removeChannel teardown', () => {
    const onInsert = vi.fn();
    const cleanup = subscribeConversationMessages({
      conversationId: 'c123',
      onInsert,
    });

    expect(channelMock).toHaveBeenCalledWith('messages-c123');
    expect(channelObj.on).toHaveBeenCalledTimes(1);
    const [evt, cfg, cb] = channelObj.on.mock.calls[0];
    expect(evt).toBe('postgres_changes');
    expect(cfg).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'conversation_id=eq.c123',
    });
    expect(channelObj.subscribe).toHaveBeenCalledTimes(1);

    // Callback wiring
    cb();
    expect(onInsert).toHaveBeenCalledTimes(1);

    // Cleanup removes the channel
    cleanup();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('subscribeUserConversations preserves channel name, * event config, and removeChannel teardown', () => {
    const onChange = vi.fn();
    const cleanup = subscribeUserConversations({ onChange });

    expect(channelMock).toHaveBeenCalledWith('conversations-list');
    expect(channelObj.on).toHaveBeenCalledTimes(1);
    const [evt, cfg, cb] = channelObj.on.mock.calls[0];
    expect(evt).toBe('postgres_changes');
    expect(cfg).toEqual({
      event: '*',
      schema: 'public',
      table: 'conversations',
    });
    expect(channelObj.subscribe).toHaveBeenCalledTimes(1);

    cb();
    expect(onChange).toHaveBeenCalledTimes(1);

    cleanup();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });
});