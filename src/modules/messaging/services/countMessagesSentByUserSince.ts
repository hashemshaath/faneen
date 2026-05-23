import { supabase } from '@/integrations/supabase/client';

/**
 * Count messages a user has sent since the given ISO timestamp (inclusive).
 * Preserves: `.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId).gte('created_at', sinceIso)`.
 */
export function countMessagesSentByUserSince({
  userId,
  sinceIso,
}: {
  userId: string;
  sinceIso: string;
}) {
  return supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', userId)
    .gte('created_at', sinceIso);
}