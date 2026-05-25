/**
 * BM-REF-REBUILD-1 — Step C
 * Shared types for the unified reference lookup service layer.
 *
 * Server (`public.lookup_by_reference`) + RLS remain authoritative.
 * These types are only client-side shape contracts.
 */

export interface ReferenceLookupInput {
  reference: string;
}

export interface ReferenceLookupRow {
  entity_type: string;
  table_name: string;
  id: string;
  ref_id: string | null;
  legacy_ref_id: string | null;
  canonical_route: string | null;
}

export interface ReferenceLookupResult {
  data: ReferenceLookupRow[] | null;
  error: unknown;
}