import { supabase } from '@/integrations/supabase/client';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1
 * Canonical wrapper for inserting into `entity_access_requests`.
 *
 * The caller passes either `targetBusinessId` (preferred, exact entity)
 * or `targetRef` (raw ENT-/BIZ- reference or business name when the entity
 * is unknown). RLS enforces that `requester_user_id` equals `auth.uid()`.
 *
 * Returns raw Supabase `{ data, error }`; never throws.
 */
export interface CreateEntityAccessRequestOptions {
  requesterUserId: string;
  targetBusinessId?: string | null;
  targetRef?: string | null;
  message?: string | null;
}

export interface EntityAccessRequestRow {
  id: string;
  ref_id: string;
  status: string;
}

export async function createEntityAccessRequest(
  options: CreateEntityAccessRequestOptions,
): Promise<{ data: EntityAccessRequestRow | null; error: unknown }> {
  const payload = {
    requester_user_id: options.requesterUserId,
    target_business_id: options.targetBusinessId ?? null,
    target_ref: options.targetRef ?? null,
    message: options.message ?? null,
  };
  const { data, error } = await supabase
    .from('entity_access_requests')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select('id, ref_id, status')
    .maybeSingle();
  return { data: (data as EntityAccessRequestRow | null) ?? null, error };
}