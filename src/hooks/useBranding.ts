import { useMemo } from 'react';
import { usePlatformSettingsCore } from '@/hooks/usePlatformSettingsCore';
// Bundle the default brand assets so they are served from the hashed
// /assets/* directory (long-cache immutable). Admin-uploaded URLs from
// platform_settings still take precedence at runtime.
import logoFullDefault from '@/assets/logo-full.png';
import logoFullLightDefault from '@/assets/logo-full-light.png';
import logoMarkDefault from '@/assets/logo-mark.png';

export interface BrandingConfig {
  fullLightUrl: string;   // logo for light backgrounds (full color)
  fullDarkUrl: string;    // logo for dark/opaque backgrounds (white/light)
  markUrl: string;        // icon-only mark
  sizeNavbar: number;     // height in px
  sizeFooter: number;
  sizeAuth: number;
  sizeLoader: number;
  sizeMark: number;       // default mark size
}

export const DEFAULT_BRANDING: BrandingConfig = {
  fullLightUrl: logoFullDefault,
  fullDarkUrl: logoFullLightDefault,
  markUrl: logoMarkDefault,
  sizeNavbar: 44,
  sizeFooter: 44,
  sizeAuth: 48,
  sizeLoader: 40,
  sizeMark: 40,
};

const KEY_MAP: Record<string, keyof BrandingConfig> = {
  brand_logo_full_light: 'fullLightUrl',
  brand_logo_full_dark: 'fullDarkUrl',
  brand_logo_mark: 'markUrl',
  brand_size_navbar: 'sizeNavbar',
  brand_size_footer: 'sizeFooter',
  brand_size_auth: 'sizeAuth',
  brand_size_loader: 'sizeLoader',
  brand_size_mark: 'sizeMark',
};

export const BRANDING_KEYS = Object.keys(KEY_MAP);

function applySettings(rows: Array<{ setting_key: string; setting_value: string | null }>): BrandingConfig {
  const cfg: BrandingConfig = { ...DEFAULT_BRANDING };
  for (const row of rows) {
    const field = KEY_MAP[row.setting_key];
    if (!field || !row.setting_value) continue;
    if (field.startsWith('size')) {
      const n = parseInt(row.setting_value, 10);
      if (!Number.isNaN(n) && n > 0) (cfg as unknown as Record<string, number | string>)[field] = n;
    } else {
      (cfg as unknown as Record<string, number | string>)[field] = row.setting_value;
    }
  }
  return cfg;
}

export function useBranding() {
  // Single shared query (see usePlatformSettingsCore) — selects only the
  // `branding` rows so this hook re-renders independently of theme changes.
  const { data, isLoading } = usePlatformSettingsCore();
  const branding = useMemo(() => {
    const rows = (data ?? []).filter((r) => r.category === 'branding');
    return applySettings(rows);
  }, [data]);
  return { branding, isLoading };
}