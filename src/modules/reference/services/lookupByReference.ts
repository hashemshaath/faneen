/**
 * BM-REF-REBUILD-1 — Step C
 *
 * Thin wrapper around the SECURITY DEFINER RPC `public.lookup_by_reference`.
 *
 * Contract:
 *  - Accepts any of: new ref_id (ENT-/STF-/LOC-/LED-/BKG-/QTE-/PAY-/PVS-/STI-…),
 *    legacy ref_id (BIZ-/LR-/BK-/site_ref…), or a raw UUID (admin-only fallback,
 *    gated by the DB function itself).
 *  - Returns raw `{ data, error }`. No client-side authorization, no field
 *    transformation, no exposure of provider_intent_id, tokens, login email,
 *    phone, or any synthetic auth identifier.
 *  - Server + RLS remain authoritative.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ReferenceLookupInput,
  ReferenceLookupResult,
  ReferenceLookupRow,
} from './types';

export async function lookupByReference(
  input: ReferenceLookupInput,
): Promise<ReferenceLookupResult> {
  const { data, error } = await supabase.rpc('lookup_by_reference', {
    _ref: input.reference,
  });
  return {
    data: (data as ReferenceLookupRow[] | null) ?? null,
    error,
  };
}

export type { ReferenceLookupInput, ReferenceLookupResult, ReferenceLookupRow };