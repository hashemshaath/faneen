import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
// CRED-3: canonical adminAdjustProviderCredits implementation lives in @/modules/credits.
export {
  adminAdjustProviderCredits,
  type AdminAdjustProviderCreditsArgs,
} from '@/modules/credits';

/**
 * Thin write wrappers for legacy provider subscriptions (MEMB-7).
 */

export type ProviderSubscriptionUpdate =
  Database['public']['Tables']['provider_subscriptions']['Update'];

export async function updateProviderSubscriptionById({
  id,
  values,
}: {
  id: string;
  values: ProviderSubscriptionUpdate;
}) {
  const { data, error } = await supabase
    .from('provider_subscriptions')
    .update(values)
    .eq('id', id);
  return { data, error };
}