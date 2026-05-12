import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getBadgeSessionToken, recordBadgeConversion, setBadgeSessionToken } from '@/lib/badge-attribution';

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
    const isBadgeRef = searchParams.get('ref') === 'badge';

    // First-time badge landing in this tab → mint a session token & record click.
    if (isBadgeRef && !getBadgeSessionToken(businessId)) {
      const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setBadgeSessionToken(businessId, token);

      void supabase.from('badge_clicks').insert({
        business_id: businessId,
        username,
        session_token: token,
        referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
      });
    }

    // Every profile view in a badge-attributed session is a funnel step.
    void recordBadgeConversion(businessId, 'profile_view');
  }, [businessId, username, searchParams]);
}