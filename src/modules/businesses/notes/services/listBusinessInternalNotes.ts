import { supabase } from "@/integrations/supabase/client";
import type { BusinessInternalNote } from "../types";

export interface ListBusinessInternalNotesOptions {
  businessId: string;
  /** include soft-deleted rows (admin-only). Default false. */
  includeDeleted?: boolean;
  /** hard cap on rows returned. Default 100, max 200. */
  limit?: number;
}

/**
 * Canonical read wrapper for business_internal_notes.
 * RLS filters rows by caller role (admin / owner-manager / staff).
 * Pinned notes first, then most recent.
 */
export async function listBusinessInternalNotes(
  options: ListBusinessInternalNotesOptions,
): Promise<{ data: BusinessInternalNote[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
  let query = supabase
    .from("business_internal_notes")
    .select(
      "id, ref_id, business_id, author_user_id, body, visibility, pinned, created_at, updated_at, deleted_at",
    )
    .eq("business_id", options.businessId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!options.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;
  return {
    data: (data as BusinessInternalNote[] | null) ?? null,
    error,
  };
}