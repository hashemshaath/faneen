import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 read wrapper for the full per-user notifications list.
 *
 * Generic: `select` and `limit` are configurable so the existing three
 * callsites (Notifications.tsx, DashboardNotifications.tsx, NotificationBell)
 * can preserve their exact shapes:
 *   - Notifications.tsx:           select '*', no limit
 *   - DashboardNotifications.tsx:  select '*', limit 500
 *   - NotificationBell.tsx:        select '*', limit 50
 *
 * Always orders by created_at desc and filters eq('user_id', userId).
 * Returns the raw Supabase `{ data, error }` result untransformed.
 */
export type ListNotificationsForUserArgs = {
  userId: string;
  select?: string;
  limit?: number;
};

export function listNotificationsForUser({
  userId,
  select = '*',
  limit,
}: ListNotificationsForUserArgs) {
  let q = supabase
    .from('notifications')
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (typeof limit === 'number') q = q.limit(limit);
  return q;
}