import { supabase } from '@/integrations/supabase/client';

/**
 * EDGE-CRON-OBSERVABILITY-1
 *
 * Thin read-only wrappers around `public.cron_run_log`. Only admins /
 * super_admins can read these rows (enforced by RLS); these wrappers do
 * NOT bypass RLS, they just centralize the select shape so callers
 * cannot drift from the documented columns.
 *
 * Returns raw `{ data, error }` from supabase-js — no throwing, no shape
 * transformation, matching the project's service-wrapper convention.
 */

const TABLE = 'cron_run_log' as const;
const COLUMNS =
  'id, job_name, function_name, started_at, finished_at, ok, status, summary, error_code, error_message, duration_ms, created_at';

export interface ListCronRunLogsParams {
  limit?: number;
  jobName?: string;
}

export async function listCronRunLogs(params: ListCronRunLogsParams = {}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  let query = supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (params.jobName) {
    query = query.eq('job_name', params.jobName);
  }
  return await query;
}

export async function getCronRunLogById({ id }: { id: string }) {
  return await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
}