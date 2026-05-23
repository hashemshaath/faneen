import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_promo_codes` and
 * `membership_promo_code_attempts` (MEMB-6). Returns raw
 * Supabase `{ data, error }` with no transformation.
 */

export interface ListMembershipPromoCodesOptions {
  select?: string;
}

export async function listMembershipPromoCodes<T = unknown>({
  select = 'id, code, type, target_tier, duration_days, discount_percent, max_redemptions, used_count, valid_from, valid_until, is_active',
}: ListMembershipPromoCodesOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_promo_codes')
    .select(select)
    .order('created_at', { ascending: false });
  return { data: (data as unknown as T[] | null), error };
}

export interface ListMembershipPromoCodeAttemptsOptions {
  select?: string;
  limit?: number;
}

export async function listMembershipPromoCodeAttempts<T = unknown>({
  select = 'id, code, promo_code_id, user_id, success, rejection_reason, created_at',
  limit = 500,
}: ListMembershipPromoCodeAttemptsOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_promo_code_attempts')
    .select(select)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}