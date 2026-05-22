import { supabase } from '@/integrations/supabase/client';

/**
 * Insert a row into `quote_request_files` after a successful storage
 * upload (A3). Payload mirrors Quote.tsx exactly — including the optional
 * `user_id` field for authenticated submitters. Throws on insert error so
 * the caller can decide whether to surface or swallow (Quote.tsx currently
 * fire-and-forgets this insert without checking the result).
 */
export interface CreateQuoteRequestFileRecordPayload {
  quote_request_id: string;
  user_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
}

export async function createQuoteRequestFileRecord(
  payload: CreateQuoteRequestFileRecordPayload,
): Promise<void> {
  const { error } = await supabase.from('quote_request_files').insert(payload);
  if (error) throw error;
}