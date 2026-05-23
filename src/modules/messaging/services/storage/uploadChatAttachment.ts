import { supabase } from '@/integrations/supabase/client';
import { CHAT_ATTACHMENTS_BUCKET } from '../../constants/storage';

/**
 * M-5 canonical wrapper for uploading a chat attachment.
 *
 * Preserves the exact Supabase storage upload semantics used by
 * DashboardMessages: the bucket name, path, file object, and upload
 * options are passed through untransformed. The raw result is returned
 * so callers retain access to the original `{ data, error }` shape.
 */
export type UploadChatAttachmentOptions = {
  cacheControl?: string;
  upsert?: boolean;
  contentType?: string;
};

export function uploadChatAttachment(
  path: string,
  file: File | Blob,
  options?: UploadChatAttachmentOptions,
) {
  return supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, file, options);
}