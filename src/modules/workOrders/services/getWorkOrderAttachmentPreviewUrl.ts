/**
 * BUSINESS-WORKFLOW-5A — RLS-respecting preview helper. Loads attachment
 * metadata through the public table (RLS guards `is_work_order_member`),
 * then mints a short-lived signed URL. The signed URL is returned ONCE to
 * the caller and never stored.
 */
import { supabase } from "@/integrations/supabase/client";
import { createWorkOrderAttachmentSignedUrl } from "./createWorkOrderAttachmentSignedUrl";

export interface GetWorkOrderAttachmentPreviewUrlInput {
  attachmentId: string;
  expiresInSeconds?: number;
}

export interface GetWorkOrderAttachmentPreviewUrlResult {
  data: { signedUrl: string; fileName: string; fileType: string | null } | null;
  error: unknown;
}

export async function getWorkOrderAttachmentPreviewUrl(
  input: GetWorkOrderAttachmentPreviewUrlInput,
): Promise<GetWorkOrderAttachmentPreviewUrlResult> {
  if (!input.attachmentId) return { data: null, error: new Error("attachment_id_required") };

  const { data: row, error: loadErr } = await supabase
    .from("work_order_attachments")
    .select("id, file_path, file_name, file_type, deleted_at")
    .eq("id", input.attachmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadErr) return { data: null, error: loadErr };
  if (!row || !row.file_path) return { data: null, error: new Error("attachment_not_found") };

  const { data: signed, error: signErr } = await createWorkOrderAttachmentSignedUrl({
    path: row.file_path,
    expiresInSeconds: input.expiresInSeconds,
  });
  if (signErr || !signed) return { data: null, error: signErr ?? new Error("sign_failed") };

  return {
    data: {
      signedUrl: signed.signedUrl,
      fileName: row.file_name,
      fileType: row.file_type ?? null,
    },
    error: null,
  };
}
