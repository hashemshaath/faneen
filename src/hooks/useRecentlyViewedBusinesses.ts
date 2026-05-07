import { useCallback, useEffect, useState } from 'react';

const KEY = 'qitaat_recent_businesses_v1';
const MAX = 12;

const read = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX))); } catch { /* ignore */ }
};

/**
 * Tracks the most recently opened business cards (ordered, newest first).
 * Stored in localStorage; capped at MAX entries.
 */
export const useRecentlyViewedBusinesses = () => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setIds(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const track = useCallback((id: string) => {
    if (!id) return;
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setIds([]);
  }, []);

  return { ids, track, clear, count: ids.length };
};
