/**
 * CT-2 — Dashboard trend series: list `created_at` for contracts the user
 * participates in, since a cutoff. Caps result count.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListContractCreatedAtSeriesArgs {
  userId: string;
  since: string;
  limit?: number;
}

export async function listContractCreatedAtSeries(
  args: ListContractCreatedAtSeriesArgs,
) {
  const { userId, since, limit = 500 } = args;
  return supabase
    .from('contracts')
    .select('created_at')
    .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
    .gte('created_at', since)
    .limit(limit);
}
