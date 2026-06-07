import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared `platform_settings` reader.
 *
 * `useThemeColors` (category=theme) and `useBranding` (category=branding) used
 * to fire TWO separate Supabase queries on app boot — both mounted from
 * `App.tsx` (ThemeApplier + BrandFaviconApplier), so every public page paid
 * the network cost twice. We now coalesce both categories into ONE query.
 *
 * Caching is identical to the two prior queries (10 min stale, 1 h GC). The
 * derived hooks select their slice via React Query's `select` so each
 * consumer only re-renders when its own rows actually change.
 */
export interface PlatformSettingRow {
  setting_key: string;
  setting_value: string | null;
  category: string;
}

export const PLATFORM_SETTINGS_CORE_KEY = ['platform-settings-core'] as const;

export function usePlatformSettingsCore() {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_CORE_KEY,
    queryFn: async (): Promise<PlatformSettingRow[]> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value, category')
        .in('category', ['theme', 'branding']);
      if (error) return [];
      return (data ?? []) as PlatformSettingRow[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: [],
  });
}