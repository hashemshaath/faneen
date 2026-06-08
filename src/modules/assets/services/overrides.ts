/**
 * RENTAL-ASSET-INTEGRATION-2 — admin override governance.
 * All overrides flow through `asset_apply_override` RPC which enforces
 * reason + note + admin role and writes to the append-only audit log.
 */
import { supabase } from '@/integrations/supabase/client';
import type { AssetStatus } from '../types';
import type { AssignmentStatus } from './rentalAssignments';

export type OverrideReason =
  | 'emergency_release'
  | 'manual_correction'
  | 'legacy_data_fix'
  | 'migration_repair';

export const OVERRIDE_REASONS: { value: OverrideReason; ar: string; en: string }[] = [
  { value: 'emergency_release', ar: 'إفراج طارئ', en: 'Emergency release' },
  { value: 'manual_correction', ar: 'تصحيح يدوي', en: 'Manual correction' },
  { value: 'legacy_data_fix',   ar: 'إصلاح بيانات قديمة', en: 'Legacy data fix' },
  { value: 'migration_repair',  ar: 'إصلاح ترحيل', en: 'Migration repair' },
];

export interface AssetOverrideLogRow {
  id: string;
  ref_id: string;
  asset_id: string;
  rental_order_id: string | null;
  assignment_id: string | null;
  reason: OverrideReason;
  note: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  actor_user_id: string;
  created_at: string;
}

export interface ApplyOverrideInput {
  asset_id: string;
  reason: OverrideReason;
  note: string;
  new_asset_status?: AssetStatus;
  assignment_id?: string;
  new_assignment_status?: AssignmentStatus;
  rental_order_id?: string;
}

export interface ApplyOverrideResult {
  ok: boolean;
  override_ref?: string;
  error?: string;
}

export async function applyAssetOverride(input: ApplyOverrideInput): Promise<ApplyOverrideResult> {
  if (!input.note || input.note.trim().length < 5) {
    return { ok: false, error: 'note_required' };
  }
  const { data, error } = await supabase.rpc('asset_apply_override' as never, {
    _asset_id: input.asset_id,
    _reason: input.reason,
    _note: input.note,
    _new_asset_status: input.new_asset_status ?? null,
    _assignment_id: input.assignment_id ?? null,
    _new_assignment_status: input.new_assignment_status ?? null,
    _rental_order_id: input.rental_order_id ?? null,
  } as never);
  if (error) return { ok: false, error: error.message };
  const r = (data ?? {}) as { ok?: boolean; override_ref?: string };
  return { ok: !!r.ok, override_ref: r.override_ref };
}

export async function listOverrides(limit = 100): Promise<AssetOverrideLogRow[]> {
  const { data } = await supabase
    .from('asset_override_log' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as AssetOverrideLogRow[] | null) ?? [];
}

/**
 * Emit a `asset_assignment_blocked` observability event (admin-callable; the
 * client can fire and forget — RLS on cron_run_log restricts who can read).
 */
export async function logAssignmentBlocked(payload: {
  asset_ref?: string;
  rental_order_ref?: string;
  reason?: string;
}): Promise<void> {
  await supabase.from('cron_run_log' as never).insert({
    job_name: 'asset_assignment_blocked',
    payload: payload as never,
  } as never);
}
