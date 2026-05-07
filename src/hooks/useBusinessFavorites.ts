import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'qitaat_fav_businesses_v1';
const EVENT = 'qitaat:fav-businesses-changed';

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore quota errors */
  }
};

/**
 * Lightweight favorites store backed by localStorage. Used by search cards
 * to let visitors save providers without requiring an account.
 */
export const useBusinessFavorites = () => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggleFavorite = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
    return next.includes(id);
  }, []);

  return { ids, isFavorite, toggleFavorite, count: ids.length };
};