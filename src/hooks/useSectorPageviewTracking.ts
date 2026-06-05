import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Logs a single pageview to public.sector_page_events via the
 * `log_sector_pageview` RPC. Fires once per (sector, city) pair per mount.
 *
 * Designed to be lightweight and silent — failures are swallowed so they
 * never affect the user experience on the public sector landing pages.
 */
export function useSectorPageviewTracking(
  sectorSlug: string | null | undefined,
  citySlug?: string | null,
) {
  const fired = useRef<string>('');

  useEffect(() => {
    if (!sectorSlug) return;
    const key = `${sectorSlug}::${citySlug ?? ''}`;
    if (fired.current === key) return;
    fired.current = key;

    // Fire-and-forget. Defer slightly so it never blocks paint.
    const t = window.setTimeout(() => {
      try {
        const referrer = document.referrer || '';
        const path = window.location.pathname || '';
         
        (supabase.rpc as any)('log_sector_pageview', {
          p_sector: sectorSlug,
          p_city: citySlug ?? null,
          p_referrer: referrer || null,
          p_path: path,
        }).then(() => {}, () => {});
      } catch {
        /* ignore */
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [sectorSlug, citySlug]);
}
