import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const keyFor = (userId: string | undefined): string | null =>
  userId ? `qitaat_active_business_${userId}` : null;

const ACTIVE_BUSINESS_EVENT = 'qitaat:active-business-changed';

/**
 * Persists the user's active business selection in LocalStorage so it
 * survives reloads and re-logins. Scoped per user id to prevent leaks
 * across accounts on shared devices.
 *
 * Cross-component sync: changes broadcast a `qitaat:active-business-changed`
 * window event so other consumers update without a page reload.
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

  // Listen for cross-component / cross-tab changes
  useEffect(() => {
    const k = keyFor(user?.id);
    if (!k) return;
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string; id: string | null }>).detail;
      if (!detail || detail.userId !== user?.id) return;
      setActiveBusinessIdState(detail.id);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== k) return;
      setActiveBusinessIdState(e.newValue && e.newValue.length > 0 ? e.newValue : null);
    };
    window.addEventListener(ACTIVE_BUSINESS_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ACTIVE_BUSINESS_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
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
    try {
      window.dispatchEvent(new CustomEvent(ACTIVE_BUSINESS_EVENT, {
        detail: { userId: user?.id, id },
      }));
    } catch { /* noop */ }
  }, [user?.id]);

  return { activeBusinessId, setActiveBusinessId };
}