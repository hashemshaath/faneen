/**
 * BUSINESS-WORKFLOW-5A — Short-lived signed URL for previewing a private
 * work-order attachment. Expiry is hard-capped at 300 seconds. Signed URLs
 * are NEVER persisted in DB or audit metadata — they exist only for the
 * round-trip back to the caller.
 */
import { supabase } from "@/integrations/supabase/client";
import { WORK_ORDER_ATTACHMENTS_BUCKET } from "./uploadWorkOrderAttachmentFile";

export const WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS = 300;

export interface CreateWorkOrderAttachmentSignedUrlInput {
  path: string;
  expiresInSeconds?: number;
}

export interface CreateWorkOrderAttachmentSignedUrlResult {
  data: { signedUrl: string } | null;
  error: unknown;
}

export async function createWorkOrderAttachmentSignedUrl(
  input: CreateWorkOrderAttachmentSignedUrlInput,
): Promise<CreateWorkOrderAttachmentSignedUrlResult> {
  const path = (input.path ?? "").toString();
  if (!path || path.startsWith("/") || path.includes("..")) {
    return { data: null, error: new Error("invalid_path") };
  }
  const requested = Number.isFinite(input.expiresInSeconds)
    ? Math.floor(input.expiresInSeconds as number)
    : WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS;
  const expires = Math.max(
    30,
    Math.min(requested, WORK_ORDER_ATTACHMENT_SIGNED_URL_MAX_SECONDS),
  );
  const { data, error } = await supabase.storage
    .from(WORK_ORDER_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expires);
  return {
    data: data?.signedUrl ? { signedUrl: data.signedUrl } : null,
    error,
  };
}
