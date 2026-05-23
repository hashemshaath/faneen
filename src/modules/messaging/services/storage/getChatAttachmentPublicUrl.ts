import { supabase } from '@/integrations/supabase/client';
import { CHAT_ATTACHMENTS_BUCKET } from '../../constants/storage';

/**
 * M-5 canonical wrapper for resolving a chat-attachments public URL.
 * Returns the raw Supabase storage result so callers can read
 * `data.publicUrl` exactly as before.
 */
export function getChatAttachmentPublicUrl(path: string) {
  return supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .getPublicUrl(path);
}