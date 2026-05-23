import { describe, it, expect, vi, beforeEach } from 'vitest';

type Chain = Record<string, ReturnType<typeof vi.fn>>;

const chain: Chain = {};
const fromMock = vi.fn((_t: string) => chain);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  countConversationsForUser,
  countConversationsTotal,
  countMessagesBySender,
  countMessagesSentByUserSince,
  listConversationIdsForUser,
  countUnreadMessagesInConversations,
  listUnreadMessageConversationIds,
  listRecentConversationsForUser,
  findConversationBetweenUsers,
  listConversationsForUser,
  listMessagesForConversation,
} from '../../index';

function resetChain() {
  for (const k of Object.keys(chain)) delete chain[k];
  fromMock.mockClear();
  chain.select = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => chain);
}

beforeEach(resetChain);

describe('M-2 messaging read services', () => {
  it('countConversationsForUser preserves table, select+head, and participant or filter', () => {
    countConversationsForUser({ userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('conversations');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.or).toHaveBeenCalledWith('participant_1.eq.u1,participant_2.eq.u1');
  });

  it('countConversationsTotal preserves global head count', () => {
    countConversationsTotal();
    expect(fromMock).toHaveBeenCalledWith('conversations');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.or).not.toHaveBeenCalled();
  });

  it('countMessagesBySender preserves sender_id filter', () => {
    countMessagesBySender({ userId: 'u9' });
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.eq).toHaveBeenCalledWith('sender_id', 'u9');
  });

  it('countMessagesSentByUserSince preserves sender_id + gte filters', () => {
    countMessagesSentByUserSince({ userId: 'u3', sinceIso: '2026-05-23T00:00:00Z' });
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.eq).toHaveBeenCalledWith('sender_id', 'u3');
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-05-23T00:00:00Z');
  });

  it('listConversationIdsForUser selects only id with participant or', () => {
    listConversationIdsForUser({ userId: 'u4' });
    expect(chain.select).toHaveBeenCalledWith('id');
    expect(chain.or).toHaveBeenCalledWith('participant_1.eq.u4,participant_2.eq.u4');
  });

  it('countUnreadMessagesInConversations preserves in + is_read=false + neq(sender)', () => {
    countUnreadMessagesInConversations({ conversationIds: ['a', 'b'], viewerUserId: 'me' });
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(chain.in).toHaveBeenCalledWith('conversation_id', ['a', 'b']);
    expect(chain.eq).toHaveBeenCalledWith('is_read', false);
    expect(chain.neq).toHaveBeenCalledWith('sender_id', 'me');
  });

  it('listUnreadMessageConversationIds selects conversation_id with is_read=false + neq(sender)', () => {
    listUnreadMessageConversationIds({ userId: 'me' });
    expect(chain.select).toHaveBeenCalledWith('conversation_id');
    expect(chain.eq).toHaveBeenCalledWith('is_read', false);
    expect(chain.neq).toHaveBeenCalledWith('sender_id', 'me');
  });

  it('listRecentConversationsForUser preserves exact select, or, order, limit', () => {
    listRecentConversationsForUser({ userId: 'u', limit: 10 });
    expect(chain.select).toHaveBeenCalledWith(
      'id, participant_1, participant_2, last_message_at, updated_at',
    );
    expect(chain.or).toHaveBeenCalledWith('participant_1.eq.u,participant_2.eq.u');
    expect(chain.order).toHaveBeenCalledWith('last_message_at', {
      ascending: false,
      nullsFirst: false,
    });
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('findConversationBetweenUsers preserves AND/OR composite and maybeSingle', () => {
    findConversationBetweenUsers({ userIdA: 'A', userIdB: 'B' });
    expect(chain.select).toHaveBeenCalledWith('id');
    expect(chain.or).toHaveBeenCalledWith(
      'and(participant_1.eq.A,participant_2.eq.B),and(participant_1.eq.B,participant_2.eq.A)',
    );
    expect(chain.maybeSingle).toHaveBeenCalled();
  });

  it('listConversationsForUser without includeAll applies participant filter, with includeAll skips it', () => {
    listConversationsForUser({ userId: 'u', includeAll: false });
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.or).toHaveBeenCalledWith('participant_1.eq.u,participant_2.eq.u');
    expect(chain.order).toHaveBeenCalledWith('last_message_at', { ascending: false });

    resetChain();
    listConversationsForUser({ userId: 'u', includeAll: true });
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.or).not.toHaveBeenCalled();
    expect(chain.order).toHaveBeenCalledWith('last_message_at', { ascending: false });
  });

  it('listMessagesForConversation preserves select * + conversation_id eq + asc order', () => {
    listMessagesForConversation({ conversationId: 'c1' });
    expect(fromMock).toHaveBeenCalledWith('messages');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('conversation_id', 'c1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});