/**
 * BM-REF-REBUILD-1 — Step C
 * Wrapper around `public.get_user_entity_contexts`.
 *
 * Returns the entities a user belongs to (owner or staff member) with
 * their role and display refs. Server + RLS remain authoritative.
 */
import { supabase } from '@/integrations/supabase/client';

export interface GetUserEntityContextsInput {
  userId: string;
}

export async function getUserEntityContexts(input: GetUserEntityContextsInput) {
  return await supabase.rpc('get_user_entity_contexts', {
    _user_id: input.userId,
  });
}