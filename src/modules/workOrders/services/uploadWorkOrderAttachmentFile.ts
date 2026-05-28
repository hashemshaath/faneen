/**
 * BUSINESS-WORKFLOW-5A — Private upload wrapper for work-order attachments.
 * Hard-coded to the `work-order-files` bucket. Never logs file content or
 * the resolved storage path. Returns the raw Supabase storage envelope so
 * the caller can branch without leaking provider details.
 */
import { supabase } from "@/integrations/supabase/client";

export const WORK_ORDER_ATTACHMENTS_BUCKET = "work-order-files" as const;

export interface UploadWorkOrderAttachmentFileInput {
  path: string;
  file: Blob | File;
  contentType?: string;
}

export interface UploadWorkOrderAttachmentFileResult {
  data: { path: string } | null;
  error: unknown;
}

export async function uploadWorkOrderAttachmentFile(
  input: UploadWorkOrderAttachmentFileInput,
): Promise<UploadWorkOrderAttachmentFileResult> {
  const path = (input.path ?? "").toString();
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { data: null, error: new Error("invalid_path") };
  }
  const { data, error } = await supabase.storage
    .from(WORK_ORDER_ATTACHMENTS_BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.contentType,
    });
  return { data: data ? { path: data.path } : null, error };
}
