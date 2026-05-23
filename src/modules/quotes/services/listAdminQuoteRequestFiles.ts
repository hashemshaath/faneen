import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: files attached to a quote request.
 * Preserves AdminQuoteRequestDetails semantics:
 *   .from('quote_request_files')
 *   .select('id, file_name, file_path, file_size, file_type')
 *   .eq('quote_request_id', id)
 *   .order('created_at', { ascending: false })
 */
export interface AdminQuoteRequestFileRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
}

export const ADMIN_QUOTE_FILE_SELECT =
  'id, file_name, file_path, file_size, file_type';

export async function listAdminQuoteRequestFiles(
  quoteRequestId: string,
): Promise<AdminQuoteRequestFileRow[]> {
  const { data, error } = await supabase
    .from('quote_request_files')
    .select(ADMIN_QUOTE_FILE_SELECT)
    .eq('quote_request_id', quoteRequestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminQuoteRequestFileRow[];
}