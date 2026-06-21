/**
 * DASHBOARD MESSAGES PAGE EXTRACTION — pure derivations hook.
 *
 * Extracts inline `useMemo` blocks from `DashboardMessages.tsx`:
 *   - filteredConversations (search + tab filter + pinned-first sort)
 *   - groupedMessages (date-grouped + enriched with reactions / starred)
 *   - stats (total / unread / starred / pinned)
 *
 * Pure logic only — no DB, no RPC, no mutations. Generics keep the
 * caller's existing types intact without introducing `any`.
 */
import { useMemo } from 'react';
import { format } from 'date-fns';

export type ConvFilter = 'all' | 'unread' | 'starred' | 'pinned';

export interface ConversationLike {
  id: string;
  other_profile?: { full_name?: string | null } | null;
  last_message_text?: string | null;
}

export interface MessageLike {
  id: string;
  content?: string | null;
  created_at: string;
  sender_id?: string | null;
  attachment_url?: string | null;
  message_type?: string | null;
}

export interface MessageGroup<M> {
  date: string;
  label: string;
  messages: M[];
}

export interface MessageStats {
  total: number;
  unread: number;
  starred: number;
  pinned: number;
}

export interface UseMessagesDerivationsInput<C extends ConversationLike, M extends MessageLike> {
  conversations: C[];
  messages: M[];
  deferredSearch: string;
  convFilter: ConvFilter;
  unreadCounts: Record<string, number>;
  totalUnread: number;
  starredConvs: ReadonlySet<string>;
  pinnedConvs: ReadonlySet<string>;
  getDateLabel: (iso: string) => string;
}

export interface UseMessagesDerivationsResult<C, M> {
  filteredConversations: C[];
  groupedMessages: MessageGroup<M>[];
  stats: MessageStats;
}

export function useMessagesDerivations<
  C extends ConversationLike,
  M extends MessageLike,
>(input: UseMessagesDerivationsInput<C, M>): UseMessagesDerivationsResult<C, M> {
  const {
    conversations, messages, deferredSearch, convFilter,
    unreadCounts, totalUnread, starredConvs, pinnedConvs, getDateLabel,
  } = input;

  const filteredConversations = useMemo<C[]>(() => {
    let result: C[] = conversations;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      result = result.filter((c) => {
        const name = c.other_profile?.full_name?.toLowerCase() || '';
        const lastMsg = (c.last_message_text || '').toLowerCase();
        return name.includes(q) || lastMsg.includes(q);
      });
    }
    if (convFilter === 'unread') result = result.filter((c) => (unreadCounts[c.id] ?? 0) > 0);
    if (convFilter === 'starred') result = result.filter((c) => starredConvs.has(c.id));
    if (convFilter === 'pinned') result = result.filter((c) => pinnedConvs.has(c.id));

    return [...result].sort((a, b) => {
      const aPinned = pinnedConvs.has(a.id) ? 1 : 0;
      const bPinned = pinnedConvs.has(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [conversations, deferredSearch, convFilter, unreadCounts, starredConvs, pinnedConvs]);

  const groupedMessages = useMemo<MessageGroup<M>[]>(() => {
    const groups: MessageGroup<M>[] = [];
    messages.forEach((msg) => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.messages.push(msg);
      else groups.push({ date: dateKey, label: getDateLabel(msg.created_at), messages: [msg] });
    });
    return groups;
  }, [messages, getDateLabel]);

  const stats = useMemo<MessageStats>(() => ({
    total: conversations.length,
    unread: totalUnread,
    starred: starredConvs.size,
    pinned: pinnedConvs.size,
  }), [conversations.length, totalUnread, starredConvs.size, pinnedConvs.size]);

  return { filteredConversations, groupedMessages, stats };
}

export default useMessagesDerivations;