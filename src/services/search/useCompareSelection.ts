import { useCallback, useEffect, useState } from 'react';

/**
 * Compare selection — small client-only store for the search page.
 * Holds up to 4 business IDs in localStorage so the user can build a
 * comparison set across pages/filter changes, then jump to /compare.
 */
export const COMPARE_STORAGE_KEY = 'qitaat_compare_ids';
export const COMPARE_MAX = 4;

const COMPARE_EVENT = 'qitaat:compare-changed';

const read = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, COMPARE_MAX);
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(COMPARE_EVENT));
  } catch {
    /* ignore quota errors */
  }
};

export interface CompareSelectionApi {
  ids: string[];
  has: (id: string) => boolean;
  isFull: boolean;
  toggle: (id: string) => { added: boolean; full: boolean };
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompareSelection = (): CompareSelectionApi => {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(COMPARE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COMPARE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      write(next);
      return { added: false, full: false };
    }
    if (current.length >= COMPARE_MAX) return { added: false, full: true };
    const next = [...current, id];
    write(next);
    return { added: true, full: next.length >= COMPARE_MAX };
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return {
    ids,
    has: (id) => ids.includes(id),
    isFull: ids.length >= COMPARE_MAX,
    toggle,
    remove,
    clear,
  };
};