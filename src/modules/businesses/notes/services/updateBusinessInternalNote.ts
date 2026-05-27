import { supabase } from "@/integrations/supabase/client";
import type {
  BusinessInternalNote,
  BusinessInternalNoteUpdate,
} from "../types";

/**
 * Update body / pinned on an existing note. RLS restricts to the original
 * author (owner/manager) or admin.
 */
export async function updateBusinessInternalNote(
  id: string,
  patch: BusinessInternalNoteUpdate,
): Promise<{ data: BusinessInternalNote | null; error: unknown }> {
  const safe: BusinessInternalNoteUpdate = {};
  if (typeof patch.body === "string") {
    const trimmed = patch.body.trim();
    if (trimmed.length === 0) return { data: null, error: new Error("body_required") };
    if (trimmed.length > 4000) return { data: null, error: new Error("body_too_long") };
    safe.body = trimmed;
  }
  if (typeof patch.pinned === "boolean") safe.pinned = patch.pinned;
  if (patch.deleted_at === null || typeof patch.deleted_at === "string") {
    safe.deleted_at = patch.deleted_at;
  }

  const { data, error } = await supabase
    .from("business_internal_notes")
    .update(safe)
    .eq("id", id)
    .select(
      "id, ref_id, business_id, author_user_id, body, visibility, pinned, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  return {
    data: (data as BusinessInternalNote | null) ?? null,
    error,
  };
}

/** Soft-delete via UPDATE deleted_at = now() — works for non-admin authors. */
export async function softDeleteBusinessInternalNote(
  id: string,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from("business_internal_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  return { error };
}