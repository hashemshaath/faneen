import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

/**
 * Canonical wrapper for the onboarding step progress write:
 *   supabase.from('profiles')
 *     .update(values)
 *     .eq('user_id', userId)
 *     .is('onboarding_completed_at', null)
 *
 * Preserves the guard that we only stamp progress while onboarding is
 * still in flight (matching `Onboarding.tsx` exactly).
 *
 * Returns raw Supabase `{ data, error }`; never throws.
 */
export interface UpdateOnboardingProgressOptions {
  userId: string;
  values: TablesUpdate<'profiles'>;
}

export async function updateOnboardingProgress(
  options: UpdateOnboardingProgressOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { userId, values } = options;
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('user_id', userId)
    .is('onboarding_completed_at', null);
  return { data, error };
}