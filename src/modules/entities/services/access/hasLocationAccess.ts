/**
 * BM-REF-REBUILD-1 — Step C
 * Wrapper around `public.has_location_access`.
 *
 * UI convenience only — RLS on the underlying tables remains authoritative.
 */
import { supabase } from '@/integrations/supabase/client';

export interface HasLocationAccessInput {
  userId: string;
  locationId: string;
  permission?: string;
}

export async function hasLocationAccess(input: HasLocationAccessInput) {
  return await supabase.rpc('has_location_access', {
    _user_id: input.userId,
    _location_id: input.locationId,
    _permission: input.permission ?? undefined,
  });
}