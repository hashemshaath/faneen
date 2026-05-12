import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Records a single `badge_clicks` row when a profile page is opened with
 * `?ref=badge` (the marker embedded by `DashboardBadge` in every snippet).
 *
 * Dedupes per browser session via sessionStorage so reloads on the same
 * tab don't inflate counts.
 */
export function useBadgeClickTracking(
  businessId: string | null | undefined,
  username: string | null | undefined,
) {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!businessId || !username) return;
    if (searchParams.get('ref') !== 'badge') return;

    const key = `qitaat_badge_click_${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage may be unavailable in private mode — proceed anyway.
    }

    void supabase.from('badge_clicks').insert({
      business_id: businessId,
      username,
      referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
    });
  }, [businessId, username, searchParams]);
}