import { supabase } from "@/integrations/supabase/client";
import type {
  BusinessInternalNote,
  BusinessInternalNoteInsert,
} from "../types";

/**
 * Insert a new internal note. RLS enforces that the caller is an
 * owner/manager of business_id (or admin) and author_user_id = auth.uid().
 */
export async function insertBusinessInternalNote(
  input: BusinessInternalNoteInsert,
): Promise<{ data: BusinessInternalNote | null; error: unknown }> {
  const body = (input.body ?? "").trim();
  if (body.length === 0) {
    return { data: null, error: new Error("body_required") };
  }
  if (body.length > 4000) {
    return { data: null, error: new Error("body_too_long") };
  }

  const payload = {
    business_id: input.business_id,
    author_user_id: input.author_user_id,
    body,
    visibility: input.visibility ?? "internal",
    pinned: input.pinned ?? false,
  };

  const { data, error } = await supabase
    .from("business_internal_notes")
    .insert(payload)
    .select(
      "id, ref_id, business_id, author_user_id, body, visibility, pinned, created_at, updated_at, deleted_at",
    )
    .maybeSingle();

  return {
    data: (data as BusinessInternalNote | null) ?? null,
    error,
  };
}