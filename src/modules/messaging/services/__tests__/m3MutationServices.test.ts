import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = Record<string, ReturnType<typeof vi.fn>>;

const chain: Chain = {};
const fromMock = vi.fn((_t: string) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  createConversation,
  insertMessage,
  markConversationMessagesRead,
} from '../../index';

function resetChain() {
  for (const k of Object.keys(chain)) delete chain[k];
  fromMock.mockClear();
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
}

beforeEach(resetChain);

describe('M-3 messaging mutation services', () => {
  it('createConversation: from(conversations).insert(payload).select(id).single()', () => {
    createConversation({ participant_1: 'a', participant_2: 'b' });
    expect(fromMock).toHaveBeenCalledWith('conversations');
    expect(chain.insert).toHaveBeenCalledWith({ participant_1: 'a', participant_2: 'b' });
    expect(chain.select).toHaveBeenCalledWith('id');
    expect(chain.single).toHaveBeenCalledTimes(1);
  });

  it('insertMessage: from(messages).insert(payload) — no select/single', () => {
    const payload = {
      conversation_id: 'c1',
      sender_id: 'u1',
      content: 'hi',
      message_type: 'text',
    };
    insertMessage(payload);
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.insert).toHaveBeenCalledWith(payload);
    expect(chain.select).not.toHaveBeenCalled();
    expect(chain.single).not.toHaveBeenCalled();
  });

  it('insertMessage: passes through attachment_url without transformation', () => {
    const payload = {
      conversation_id: 'c1',
      sender_id: 'u1',
      content: '📎 file.pdf',
      message_type: 'file',
      attachment_url: 'https://example/x.pdf',
    };
    insertMessage(payload);
    expect(chain.insert).toHaveBeenCalledWith(payload);
  });

  it('markConversationMessagesRead: exact filters preserved', () => {
    markConversationMessagesRead({ conversationId: 'c9', viewerUserId: 'u9' });
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.update).toHaveBeenCalledWith({ is_read: true });
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'conversation_id', 'c9');
    expect(chain.neq).toHaveBeenCalledWith('sender_id', 'u9');
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'is_read', false);
  });
});