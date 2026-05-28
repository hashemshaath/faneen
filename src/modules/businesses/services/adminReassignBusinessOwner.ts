/**
 * ORG-RBAC-9F: Service wrapper for public.admin_reassign_business_owner.
 * Super-admin only — transfers businesses.user_id to another user and
 * audits via admin_operation_log.
 */
import { supabase } from '@/integrations/supabase/client';

export type AdminReassignBusinessOwnerCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'not_found'
  | 'new_owner_not_found'
  | 'noop'
  | 'unknown';

export interface AdminReassignBusinessOwnerResult {
  success: boolean;
  code?: AdminReassignBusinessOwnerCode;
  error?: string;
  business_id?: string;
  old_owner?: string;
  new_owner?: string;
}

export async function adminReassignBusinessOwner(params: {
  businessId: string;
  newOwnerUserId: string;
  reason?: string | null;
}): Promise<AdminReassignBusinessOwnerResult> {
  const { data, error } = await supabase.rpc('admin_reassign_business_owner', {
    _business_id: params.businessId,
    _new_owner_user_id: params.newOwnerUserId,
    _reason: params.reason ?? null,
  });

  if (error) {
    return { success: false, code: 'unknown', error: error.message };
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    success: Boolean(raw.success),
    code: (raw.code as AdminReassignBusinessOwnerCode | undefined) ?? undefined,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    business_id: typeof raw.business_id === 'string' ? raw.business_id : undefined,
    old_owner: typeof raw.old_owner === 'string' ? raw.old_owner : undefined,
    new_owner: typeof raw.new_owner === 'string' ? raw.new_owner : undefined,
  };
}