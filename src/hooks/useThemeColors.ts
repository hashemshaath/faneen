import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Hex like "#1FBA82" — UI-friendly. We convert to "H S% L%" for CSS HSL tokens. */
export interface ThemeColors {
  primary: string;       // logo green
  primaryDark: string;
  secondary: string;     // logo blue
  secondaryDark: string;
  accent: string;        // accent (defaults = primary)
  navy: string;          // surface/foreground deep
}

export const DEFAULT_THEME: ThemeColors = {
  primary: '#1FBA82',
  primaryDark: '#178A60',
  secondary: '#2D54C4',
  secondaryDark: '#1F3D99',
  accent: '#1FBA82',
  navy: '#1A2240',
};

const KEY_MAP: Record<string, keyof ThemeColors> = {
  theme_color_primary: 'primary',
  theme_color_primary_dark: 'primaryDark',
  theme_color_secondary: 'secondary',
  theme_color_secondary_dark: 'secondaryDark',
  theme_color_accent: 'accent',
  theme_color_navy: 'navy',
};

export const THEME_SETTING_KEYS = Object.keys(KEY_MAP);
export const FIELD_FROM_KEY = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [k, v]),
) as Record<string, keyof ThemeColors>;
export const KEY_FROM_FIELD = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k]),
) as Record<keyof ThemeColors, string>;

/** Convert "#RRGGBB" → "H S% L%" string used by Tailwind's hsl(var(--x)) tokens. */
export function hexToHslString(hex: string): string | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useThemeColors() {
  const { data, isLoading } = useQuery({
    queryKey: ['theme-colors'],
    queryFn: async (): Promise<ThemeColors> => {
      const { data: rows, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .eq('category', 'theme');
      if (error) return DEFAULT_THEME;
      const merged: ThemeColors = { ...DEFAULT_THEME };
      for (const r of rows ?? []) {
        const f = FIELD_FROM_KEY[r.setting_key];
        if (f && r.setting_value && /^#[0-9a-f]{6}$/i.test(r.setting_value)) {
          merged[f] = r.setting_value;
        }
      }
      return merged;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: DEFAULT_THEME,
  });
  return { theme: data ?? DEFAULT_THEME, isLoading };
}

/** Build CSS variable assignments suitable for injection on :root. */
export function buildCssVars(theme: ThemeColors): string {
  const p = hexToHslString(theme.primary);
  const pd = hexToHslString(theme.primaryDark);
  const s = hexToHslString(theme.secondary);
  const sd = hexToHslString(theme.secondaryDark);
  const a = hexToHslString(theme.accent);
  const n = hexToHslString(theme.navy);
  if (!p || !s || !a) return '';
  const parts: string[] = [];
  parts.push(`--primary:${p}`);
  parts.push(`--accent:${a}`);
  parts.push(`--ring:${p}`);
  parts.push(`--gold:${p}`);
  if (pd) parts.push(`--gold-dark:${pd}`);
  parts.push(`--secondary:${s}`);
  parts.push(`--brand-blue:${s}`);
  if (sd) parts.push(`--brand-blue-dark:${sd}`);
  if (n) parts.push(`--navy:${n}`);
  parts.push(
    `--gradient-gold:linear-gradient(135deg,hsl(${p}),hsl(${s}))`,
    `--gradient-brand:linear-gradient(135deg,hsl(${p}),hsl(${s}))`,
    `--shadow-gold:0 4px 20px -4px hsl(${p} / 0.4)`,
  );
  return `:root{${parts.join(';')}}`;
}