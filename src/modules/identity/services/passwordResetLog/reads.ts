/**
 * Password reset log reads (ID-4) — admin only at the RLS layer.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ListPasswordResetLogsOptions } from './types';

export function listPasswordResetLogs(options: ListPasswordResetLogsOptions = {}) {
  const { sinceIso = null, limit = 200, selectColumns = '*' } = options;
  let query = supabase.from('password_reset_log')
    .select(selectColumns)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (sinceIso) query = query.gte('created_at', sinceIso);
  return query;
}