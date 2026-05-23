import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * N-4 realtime wrapper for per-user `notifications` postgres_changes channels.
 *
 * Preserves the exact wire shape used by all four legacy callsites:
 *   supabase
 *     .channel(channelName)
 *     .on('postgres_changes', {
 *       event,                            // '*', 'INSERT', or 'UPDATE'
 *       schema: 'public',
 *       table: 'notifications',
 *       filter: `user_id=eq.${userId}`,
 *     }, onChange)
 *     [.on(...) ...]                      // multiple listeners on the same channel
 *     .subscribe(onStatus?)
 *
 * Multiple listeners can be attached to the same channel (matches the
 * NotificationBell pattern of INSERT + UPDATE on `user-notifications`).
 * An optional `onStatus` callback is forwarded to `.subscribe(...)` (matches
 * the LiveActivityWidget online-indicator pattern).
 *
 * Returns a cleanup function that calls `supabase.removeChannel(channel)`.
 */
export type NotificationRealtimeEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

export type NotificationRealtimeListener = {
  event: NotificationRealtimeEvent;
  onChange: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
};

export type SubscribeUserNotificationsArgs = {
  userId: string;
  channelName: string;
  listeners: NotificationRealtimeListener[];
  onStatus?: (status: string) => void;
};

export function subscribeUserNotifications({
  userId,
  channelName,
  listeners,
  onStatus,
}: SubscribeUserNotificationsArgs): () => void {
  let channel = supabase.channel(channelName);
  for (const { event, onChange } of listeners) {
    channel = channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    );
  }
  if (onStatus) {
    channel.subscribe((status) => onStatus(status));
  } else {
    channel.subscribe();
  }
  return () => {
    supabase.removeChannel(channel);
  };
}