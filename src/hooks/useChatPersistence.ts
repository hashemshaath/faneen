import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Per-user persistent chat preferences (pin / star / mute / labels / message
 * reactions / starred messages). Stored in localStorage under
 * `qitaat_chat_prefs_${userId}`. Falls back to in-memory state when no userId.
 *
 * Keeps the same shape the messages page already used so the wiring is a
 * one-line replacement.
 */
interface ChatPrefsShape {
  pinned: string[];
  starred: string[];
  muted: string[];
  labels: Record<string, string>;
  reactions: Record<string, string>;
  starredMessages: string[];
}

const EMPTY: ChatPrefsShape = {
  pinned: [], starred: [], muted: [], labels: {}, reactions: {}, starredMessages: [],
};

const storageKey = (uid: string | null | undefined) =>
  uid ? `qitaat_chat_prefs_${uid}` : null;

function readFromStorage(uid: string | null | undefined): ChatPrefsShape {
  const key = storageKey(uid);
  if (!key || typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ChatPrefsShape>;
    return {
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      starred: Array.isArray(parsed.starred) ? parsed.starred : [],
      muted: Array.isArray(parsed.muted) ? parsed.muted : [],
      labels: parsed.labels && typeof parsed.labels === 'object' ? parsed.labels : {},
      reactions: parsed.reactions && typeof parsed.reactions === 'object' ? parsed.reactions : {},
      starredMessages: Array.isArray(parsed.starredMessages) ? parsed.starredMessages : [],
    };
  } catch {
    return EMPTY;
  }
}

export function useChatPersistence(userId: string | null | undefined) {
  const [pinnedConvs, setPinnedConvs] = useState<Set<string>>(() => new Set(readFromStorage(userId).pinned));
  const [starredConvs, setStarredConvs] = useState<Set<string>>(() => new Set(readFromStorage(userId).starred));
  const [mutedConvs, setMutedConvs] = useState<Set<string>>(() => new Set(readFromStorage(userId).muted));
  const [convLabels, setConvLabels] = useState<Record<string, string>>(() => readFromStorage(userId).labels);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>(() => readFromStorage(userId).reactions);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(() => new Set(readFromStorage(userId).starredMessages));

  // Rehydrate when userId changes (login switch).
  const lastUidRef = useRef<string | null | undefined>(userId);
  useEffect(() => {
    if (lastUidRef.current === userId) return;
    lastUidRef.current = userId;
    const snap = readFromStorage(userId);
    setPinnedConvs(new Set(snap.pinned));
    setStarredConvs(new Set(snap.starred));
    setMutedConvs(new Set(snap.muted));
    setConvLabels(snap.labels);
    setMessageReactions(snap.reactions);
    setStarredMessages(new Set(snap.starredMessages));
  }, [userId]);

  // Persist on any change (debounced via microtask).
  useEffect(() => {
    const key = storageKey(userId);
    if (!key || typeof window === 'undefined') return;
    const payload: ChatPrefsShape = {
      pinned: Array.from(pinnedConvs),
      starred: Array.from(starredConvs),
      muted: Array.from(mutedConvs),
      labels: convLabels,
      reactions: messageReactions,
      starredMessages: Array.from(starredMessages),
    };
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      /* quota / private-mode — silent. */
    }
  }, [userId, pinnedConvs, starredConvs, mutedConvs, convLabels, messageReactions, starredMessages]);

  const togglePinConv = useCallback((id: string) => {
    setPinnedConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleStarConv = useCallback((id: string) => {
    setStarredConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const toggleMuteConv = useCallback((id: string) => {
    setMutedConvs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const setConvLabelInternal = useCallback((id: string, label: string) => {
    setConvLabels(prev => {
      const next = { ...prev };
      if (label === 'none') delete next[id]; else next[id] = label;
      return next;
    });
  }, []);
  const setMessageReaction = useCallback((msgId: string, emoji: string | null) => {
    setMessageReactions(prev => {
      const next = { ...prev };
      if (emoji === null || next[msgId] === emoji) delete next[msgId];
      else next[msgId] = emoji;
      return next;
    });
  }, []);
  const toggleStarMessage = useCallback((msgId: string) => {
    setStarredMessages(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }, []);

  return {
    pinnedConvs, starredConvs, mutedConvs, convLabels, messageReactions, starredMessages,
    togglePinConv, toggleStarConv, toggleMuteConv,
    setConvLabel: setConvLabelInternal,
    handleReactMessage: setMessageReaction,
    toggleStarMessage,
  };
}