/**
 * BM-REF-REBUILD-1 — Step C
 * Wrapper around `public.has_entity_membership`.
 *
 * UI convenience only — RLS on the underlying tables remains authoritative.
 */
import { supabase } from '@/integrations/supabase/client';

export interface HasEntityMembershipInput {
  userId: string;
  entityId: string;
  permission?: string;
}

export async function hasEntityMembership(input: HasEntityMembershipInput) {
  return await supabase.rpc('has_entity_membership', {
    _user_id: input.userId,
    _entity_id: input.entityId,
    _permission: input.permission ?? undefined,
  });
}