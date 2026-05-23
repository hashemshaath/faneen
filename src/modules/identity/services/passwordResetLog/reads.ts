/**
 * Password reset log reads (ID-4) — admin only at the RLS layer.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ListPasswordResetLogsOptions } from './types';

/**
 * Read recent password reset log rows (admin-only at the RLS layer).
 * Always selects `*` to preserve exact pre-migration row shape.
 */
export function listPasswordResetLogs(options: ListPasswordResetLogsOptions = {}) {
  const { sinceIso = null, limit = 200 } = options;
  let query = supabase.from('password_reset_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (sinceIso) query = query.gte('created_at', sinceIso);
  return query;
}