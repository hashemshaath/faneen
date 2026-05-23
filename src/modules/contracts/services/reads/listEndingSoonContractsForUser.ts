/**
 * CT-2 — Active contracts ending within the cutoff window for a user
 * (either client or provider). Preserves the exact filter chain previously
 * inlined in dashboard overview shared helpers.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListEndingSoonContractsForUserArgs {
  userId: string;
  /** ISO date (YYYY-MM-DD) — `end_date < cutoffDate`. */
  cutoffDate: string;
  limit?: number;
  select?: string;
}

export async function listEndingSoonContractsForUser(
  args: ListEndingSoonContractsForUserArgs,
) {
  const { userId, cutoffDate, limit = 10, select = 'id' } = args;
  return supabase
    .from('contracts')
    .select(select)
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .lt('end_date', cutoffDate)
    .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
    .limit(limit);
}
