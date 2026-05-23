import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity';
import { trackEvent } from '@/lib/analytics';

const STORAGE_KEY = 'qitaat_provider_last_active_ping';
const THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

export async function pingProviderActive(force = false): Promise<void> {
  try {
    if (!force) {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (last && Date.now() - last < THROTTLE_MS) return;
    }
    const { data: { user } } = await getCurrentUser();
    if (!user) return;
    const { error } = await supabase.rpc('touch_business_last_active');
    if (error) {
      // Silent — never disturb the user
      return;
    }
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    trackEvent('provider_last_active_updated');
  } catch {
    /* swallow */
  }
}

/** Hook variant: pings on mount (throttled). */
export function useProviderActivityPing(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    void pingProviderActive(false);
  }, [enabled]);
}