import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const keyFor = (userId: string | undefined): string | null =>
  userId ? `qitaat_active_business_${userId}` : null;

/**
 * Persists the user's active business selection in LocalStorage so it
 * survives reloads and re-logins. Scoped per user id to prevent leaks
 * across accounts on shared devices.
 */
export function useActiveBusiness(availableIds: string[]): {
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string | null) => void;
} {
  const { user } = useAuth();
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);

  // Hydrate from storage when user changes
  useEffect(() => {
    const k = keyFor(user?.id);
    if (!k) {
      setActiveBusinessIdState(null);
      return;
    }
    try {
      const stored = localStorage.getItem(k);
      setActiveBusinessIdState(stored && stored.length > 0 ? stored : null);
    } catch {
      setActiveBusinessIdState(null);
    }
  }, [user?.id]);

  // Self-heal: if the persisted id is no longer in the available list,
  // fall back to the first available business and persist that choice.
  useEffect(() => {
    if (availableIds.length === 0) return;
    const k = keyFor(user?.id);
    if (!k) return;
    if (!activeBusinessId || !availableIds.includes(activeBusinessId)) {
      const fallback = availableIds[0];
      setActiveBusinessIdState(fallback);
      try { localStorage.setItem(k, fallback); } catch { /* noop */ }
    }
  }, [availableIds, activeBusinessId, user?.id]);

  const setActiveBusinessId = useCallback((id: string | null) => {
    setActiveBusinessIdState(id);
    const k = keyFor(user?.id);
    if (!k) return;
    try {
      if (id) localStorage.setItem(k, id);
      else localStorage.removeItem(k);
    } catch { /* noop */ }
  }, [user?.id]);

  return { activeBusinessId, setActiveBusinessId };
}