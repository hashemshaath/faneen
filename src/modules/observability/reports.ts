/**
 * POST-LAUNCH-OBSERVABILITY-1 — read-only observability log access +
 * RPC trigger. Thin wrappers; no business mutations anywhere.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ObservabilityLogRow, RunType } from './types';

const TABLE = 'operations_observability_log' as const;
const COLUMNS =
  'id, ref_id, run_type, status, score, summary, alerts, created_at, created_by';

export interface ListObservabilityLogsParams {
  limit?: number;
  runType?: RunType;
}

export async function listObservabilityLogs(params: ListObservabilityLogsParams = {}) {
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 200);
  let q = supabase
    .from(TABLE)
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (params.runType) q = q.eq('run_type', params.runType);
  const { data, error } = await q;
  return { data: (data ?? []) as ObservabilityLogRow[], error };
}

export interface RunObservabilityCheckParams {
  runType?: RunType;
}

export async function runObservabilityCheck(
  params: RunObservabilityCheckParams = {},
) {
  return await supabase.rpc('run_operations_observability_check', {
    _run_type: params.runType ?? 'manual_check',
  });
}