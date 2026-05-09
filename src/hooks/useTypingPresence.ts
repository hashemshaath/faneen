import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  conversationId: string | null | undefined;
  userId: string | null | undefined;
  /** ms after last keystroke when we stop broadcasting */
  idleMs?: number;
}

/**
 * Lightweight typing presence over Supabase Realtime broadcast.
 * No DB writes — purely ephemeral. Privacy-safe (only userId broadcast).
 *
 * Usage:
 *   const { typingUsers, notifyTyping } = useTypingPresence({ conversationId, userId });
 *   <input onChange={() => notifyTyping()} />
 *   {typingUsers.length > 0 && <TypingIndicator />}
 */
export function useTypingPresence({ conversationId, userId, idleMs = 3000 }: Options) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<number>(0);
  const expiryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const fromId = (payload?.payload as { userId?: string } | undefined)?.userId;
      if (!fromId || fromId === userId) return;

      setTypingUsers((prev) => (prev.includes(fromId) ? prev : [...prev, fromId]));

      // auto-expire after idleMs + buffer
      const existing = expiryTimersRef.current.get(fromId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== fromId));
        expiryTimersRef.current.delete(fromId);
      }, idleMs + 1500);
      expiryTimersRef.current.set(fromId, timer);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      expiryTimersRef.current.forEach((t) => clearTimeout(t));
      expiryTimersRef.current.clear();
      setTypingUsers([]);
    };
  }, [conversationId, userId, idleMs]);

  const notifyTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    // throttle: max 1 broadcast per 1.5s
    if (now - lastSentRef.current >= 1500) {
      lastSentRef.current = now;
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId } });
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => { lastSentRef.current = 0; }, idleMs);
  }, [userId, idleMs]);

  return { typingUsers, notifyTyping };
}

export default useTypingPresence;