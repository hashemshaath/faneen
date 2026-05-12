import { supabase } from '@/integrations/supabase/client';

/**
 * Badge attribution funnel — links every action a visitor takes on a workshop
 * profile back to the embedded badge that brought them in.
 *
 * Flow:
 *  1. `useBadgeClickTracking` runs once per session when `?ref=badge` is present.
 *     It stores a UUID in sessionStorage under `qitaat_badge_session_<bizId>`
 *     and writes one row to `badge_clicks` carrying that token.
 *  2. Every subsequent action (profile_view, contact, booking, phone/email
 *     reveal) calls `recordBadgeConversion(...)`. We only insert when the
 *     session token exists — non-badge traffic stays unattributed.
 */

const STORAGE_PREFIX = 'qitaat_badge_session_';

export type BadgeEventType =
  | 'profile_view'
  | 'contact'
  | 'booking'
  | 'phone_reveal'
  | 'email_reveal';

export function getBadgeSessionToken(businessId: string): string | null {
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${businessId}`);
  } catch {
    return null;
  }
}

export function setBadgeSessionToken(businessId: string, token: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${businessId}`, token);
  } catch {
    /* private mode — ignore */
  }
}

/**
 * Insert one `badge_conversions` row when this session originated from a
 * badge click. No-op for organic traffic.
 */
export async function recordBadgeConversion(
  businessId: string | null | undefined,
  eventType: BadgeEventType,
  sourcePage?: string,
): Promise<void> {
  if (!businessId) return;
  const token = getBadgeSessionToken(businessId);
  if (!token) return;
  try {
    await supabase.from('badge_conversions').insert({
      business_id: businessId,
      session_token: token,
      event_type: eventType,
      source_page: sourcePage ?? null,
    });
  } catch {
    /* analytics is best-effort */
  }
}