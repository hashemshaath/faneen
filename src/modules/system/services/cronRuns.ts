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

/**
 * ADMIN-CRON-AGGREGATE-RPC-1
 *
 * Calls the admin-gated `public.get_cron_run_health(_since)` RPC, which
 * returns one aggregate row per `job_name` over the requested time
 * window. Default window (when `sinceIso` is omitted) is 30 days, as
 * defined server-side. The RPC enforces admin / super_admin access via
 * `has_role` + `user_roles`; this wrapper does not bypass that gate.
 *
 * Returns raw `{ data, error }` from supabase-js — matches the project's
 * service-wrapper convention.
 */
export interface CronRunHealthRow {
  job_name: string;
  function_name: string;
  total_runs: number;
  ok_runs: number;
  failed_runs: number;
  success_rate: number;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
  last_run_at: string | null;
  last_ok_at: string | null;
  last_failed_at: string | null;
  latest_status: string | null;
  latest_error_code: string | null;
}

export interface GetCronRunHealthParams {
  sinceIso?: string;
}

export async function getCronRunHealth(params: GetCronRunHealthParams = {}) {
  const _since = params.sinceIso ?? null;
  return await supabase.rpc('get_cron_run_health', { _since });
}