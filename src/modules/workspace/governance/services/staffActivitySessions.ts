import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ListStaffActivitySessionsOptions {
  businessId: string;
  select?: string;
  limit?: number;
}

export async function listStaffActivitySessions(
  options: ListStaffActivitySessionsOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { businessId, select = '*', limit } = options;
  let q = db.from('staff_activity_sessions').select(select).eq('business_id', businessId);
  if (typeof limit === 'number') q = q.limit(limit);
  const { data, error } = await q;
  return { data, error };
}