import { supabase } from '@/integrations/supabase/client';

/**
 * ORG-RBAC-STRUCTURE-9D — Canonical client wrapper for the
 * `public.transfer_primary_manager` RPC.
 *
 * Does NOT throw. Returns the raw Supabase `{ data, error }` envelope.
 * `data` is the safe JSON envelope returned by the RPC. Callers (hook
 * layer) are responsible for interpreting `data.ok` / `data.code`.
 *
 * Hard constraints (enforced by Phase-9C RPC, mirrored here for clarity):
 *  - never mutates auth.users
 *  - never mutates businesses.user_id (ownership)
 *  - never enforces owner-is-primary-manager
 */
export interface TransferPrimaryManagerOptions {
  businessId: string;
  toUserId: string;
  reason?: string | null;
}

export type TransferPrimaryManagerCode =
  | 'primary_manager_transferred'
  | 'already_primary_manager'
  | 'forbidden'
  | 'business_not_found'
  | 'target_not_found'
  | 'target_inactive'
  | 'target_role_not_eligible'
  | 'unique_constraint_conflict'
  | 'unknown';

export interface TransferPrimaryManagerResult {
  ok: boolean;
  code: TransferPrimaryManagerCode;
  business_id?: string;
  from_user_id?: string | null;
  to_user_id?: string;
}

export async function transferPrimaryManager(
  options: TransferPrimaryManagerOptions,
): Promise<{ data: TransferPrimaryManagerResult | null; error: unknown }> {
  const { businessId, toUserId, reason } = options;
  const { data, error } = await supabase.rpc('transfer_primary_manager', {
    _business_id: businessId,
    _to_user_id: toUserId,
    _reason: reason ?? null,
  });
  return {
    data: (data as unknown as TransferPrimaryManagerResult | null) ?? null,
    error,
  };
}
