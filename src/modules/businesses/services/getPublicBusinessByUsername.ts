import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public business profile read by username.
 *
 * - Table: `businesses`
 * - Filter: `eq('username', username)`
 * - Optional: `eq('is_active', true)` when `activeOnly` is true (default true)
 * - Terminal: `maybeSingle` (default) or `single` — preserved verbatim
 * - Select: caller-controlled; default `'*'`
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export interface GetPublicBusinessByUsernameOptions {
  username: string;
  select?: string;
  activeOnly?: boolean;
  terminal?: 'maybeSingle' | 'single';
}

export async function getPublicBusinessByUsername<T = unknown>(
  options: GetPublicBusinessByUsernameOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { username, select = '*', activeOnly = true, terminal = 'maybeSingle' } = options;
  // PII-MASKING: route public profile reads through the masked `businesses_public`
  // view. The view already pre-filters to is_active+published+!demo rows and
  // hides sensitive columns (phone/email/contact_person/etc.). The legacy
  // `activeOnly` flag is therefore redundant here but kept for callers that
  // depend on the option shape.
  void activeOnly;
  const q = supabase.from('businesses_public').select(select).eq('username', username);
  const { data, error } = terminal === 'single' ? await q.single() : await q.maybeSingle();
  return { data: (data as unknown as T | null), error };
}