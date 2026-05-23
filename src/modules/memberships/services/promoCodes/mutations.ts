import { supabase } from '@/integrations/supabase/client';

/**
 * Thin RPC wrapper for promo code redemption (MEMB-6).
 * Preserves exact RPC name and parameter names.
 */

export interface RedeemPromoCodeArgs {
  _code: string;
  _business_id?: string | null;
}

export async function redeemPromoCode(args: RedeemPromoCodeArgs) {
  const { data, error } = await supabase.rpc('redeem_promo_code', args);
  return { data, error };
}