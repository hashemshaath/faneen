import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_SAFE_COLUMNS_SELECT } from './businessSensitive';

/**
 * Canonical wrapper for admin single-row business reads by id.
 *
 * - Table: `businesses`
 * - Filter: `eq('id', id)`
 * - Terminal: `maybeSingle` (default) or `single` — preserved verbatim.
 * - Select: caller-controlled; default `'*'`.
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export interface GetAdminBusinessByIdOptions {
  id: string;
  select?: string;
  terminal?: 'maybeSingle' | 'single';
}

export async function getAdminBusinessById<T = unknown>(
  options: GetAdminBusinessByIdOptions,
): Promise<{ data: T | null; error: unknown }> {
  // Default select excludes sensitive cols (cr_scan_*, cr_document_url,
  // national_id, approval_notes, cr_owner_name) — those are owner+admin
  // only via column-level GRANT and must be fetched via
  // `getBusinessSensitiveFields` or `getBusinessFullById`.
  const { id, select = BUSINESS_SAFE_COLUMNS_SELECT, terminal = 'maybeSingle' } = options;
  const base = supabase.from('businesses').select(select).eq('id', id);
  const { data, error } =
    terminal === 'single' ? await base.single() : await base.maybeSingle();
  return { data: (data as unknown as T | null), error };
}