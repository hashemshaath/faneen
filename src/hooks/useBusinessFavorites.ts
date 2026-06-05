import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
 * When a user is authenticated we mirror writes into
 * `public.user_favorite_businesses` so favorites follow them across devices.
 */
export const useBusinessFavorites = () => {
  const [ids, setIds] = useState<string[]>(() => read());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Track auth + merge remote favorites
  useEffect(() => {
    let cancelled = false;
    const load = async (uid: string) => {
      const { data } = await supabase
        .from('user_favorite_businesses')
        .select('business_id')
        .eq('user_id', uid);
      if (cancelled) return;
      const remote = (data ?? []).map((r) => r.business_id as string);
      const merged = Array.from(new Set([...read(), ...remote]));
      write(merged);
      // Push any local-only entries up to the server
      const localOnly = merged.filter((id) => !remote.includes(id));
      if (localOnly.length > 0) {
        await supabase.from('user_favorite_businesses').upsert(
          localOnly.map((bid) => ({ user_id: uid, business_id: bid })),
          { onConflict: 'user_id,business_id', ignoreDuplicates: true },
        );
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) void load(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void load(uid);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggleFavorite = useCallback((id: string, refIdSnapshot?: string | null) => {
    const current = read();
    const adding = !current.includes(id);
    const next = adding ? [...current, id] : current.filter((x) => x !== id);
    write(next);
    if (userId) {
      if (adding) {
        void supabase.from('user_favorite_businesses').upsert(
          { user_id: userId, business_id: id, business_ref_id: refIdSnapshot ?? null },
          { onConflict: 'user_id,business_id', ignoreDuplicates: true },
        );
      } else {
        void supabase.from('user_favorite_businesses').delete()
          .eq('user_id', userId).eq('business_id', id);
      }
    }
    return adding;
  }, [userId]);

  return { ids, isFavorite, toggleFavorite, count: ids.length, isAuthenticated: !!userId };
};