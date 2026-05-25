/**
 * BM-REF-REBUILD-1 — Step C
 *
 * Compatibility resolver that accepts:
 *   - new entity ref_id (ENT-…)
 *   - legacy business ref_id (BIZ-…)
 *   - raw UUID (admin context only — gated server-side by lookup_by_reference)
 *
 * Delegates to the SECURITY DEFINER RPC `lookup_by_reference`, which is the
 * single source of truth for cross-prefix resolution. Returns raw RPC result
 * filtered to rows that point at the `businesses` table.
 *
 * Does NOT itself read the businesses table directly and does NOT grant
 * access — RLS still applies to any follow-up read.
 */
import { lookupByReference } from '@/modules/reference/services/lookupByReference';
import type { ReferenceLookupRow } from '@/modules/reference/services/types';

export interface GetBusinessByAnyReferenceInput {
  reference: string;
}

export interface GetBusinessByAnyReferenceResult {
  data: ReferenceLookupRow | null;
  error: unknown;
}

export async function getBusinessByAnyReference(
  input: GetBusinessByAnyReferenceInput,
): Promise<GetBusinessByAnyReferenceResult> {
  const { data, error } = await lookupByReference({ reference: input.reference });
  if (error) return { data: null, error };
  const match =
    (data ?? []).find((row) => row.table_name === 'businesses') ?? null;
  return { data: match, error: null };
}