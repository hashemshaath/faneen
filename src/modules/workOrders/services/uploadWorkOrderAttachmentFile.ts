/**
 * BUSINESS-WORKFLOW-5A — Private upload wrapper for work-order attachments.
 * Hard-coded to the `work-order-files` bucket. Never logs file content or
 * the resolved storage path. Returns the raw Supabase storage envelope so
 * the caller can branch without leaking provider details.
 */
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

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
  // Auto-compress image attachments (no-op for PDFs/Word/Excel).
  let file: Blob | File = input.file;
  let contentType = input.contentType;
  if (file instanceof File && (file.type || "").startsWith("image/")) {
    const compressed = await compressImage(file);
    file = compressed;
    contentType = compressed.type || contentType;
  }
  const { data, error } = await supabase.storage
    .from(WORK_ORDER_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
  return { data: data ? { path: data.path } : null, error };
}
