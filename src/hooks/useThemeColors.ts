import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BRAND_COLORS,
  BRAND_THEME,
  BRAND_CHARTS,
  BRAND_DOCUMENTS,
  BRAND_EMAILS,
  type BrandColorTokens,
} from '@/config/brandTheme';
import {
  hexToHslString as _hexToHslString,
  validateHexColor,
  isForbiddenBrandColor,
  mergeBrandThemeWithOverrides,
  buildCssVariablesFromBrandTheme,
  type BrandThemeOverrides,
} from '@/lib/theme/brandThemeUtils';

/**
 * Legacy `ThemeColors` shape — preserved for backward-compat with
 * `AdminBranding.tsx`. New code should use `BrandColorTokens` from
 * `@/config/brandTheme`. All defaults below are derived from the central
 * brand registry so there is a single source of truth.
 */
export interface ThemeColors {
  primary: string;       // logo green
  primaryDark: string;
  secondary: string;     // logo blue
  secondaryDark: string;
  accent: string;        // accent (defaults = primary)
  navy: string;          // surface/foreground deep
}

/** Default theme — sourced from the central `BRAND_COLORS` registry. */
export const DEFAULT_THEME: ThemeColors = {
  primary: BRAND_COLORS.primary,
  primaryDark: BRAND_COLORS.primaryDark,
  secondary: BRAND_COLORS.secondary,
  secondaryDark: BRAND_COLORS.secondaryDark,
  accent: BRAND_COLORS.accent,
  navy: BRAND_COLORS.dark,
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

/** Re-exported from the central `brandThemeUtils` so callers have one home. */
export const hexToHslString = _hexToHslString;

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
        if (!f || !r.setting_value) continue;
        const value = r.setting_value.trim();
        // Reject malformed and forbidden values — fall through to default.
        if (!validateHexColor(value)) continue;
        if (isForbiddenBrandColor(value)) continue;
        merged[f] = value;
      }
      return merged;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    placeholderData: DEFAULT_THEME,
  });
  return { theme: data ?? DEFAULT_THEME, isLoading };
}

/**
 * Build the `:root { ... }` CSS variable block injected by `<ThemeApplier />`.
 *
 * Three layers, in order:
 *  1. Brand-namespaced HSL tokens (from `buildCssVariablesFromBrandTheme`)
 *     — `--brand-primary`, `--brand-text`, etc.
 *  2. Public `--color-*`, `--chart-*`, `--invoice-*`, `--email-*` tokens
 *     consumed by app code, charts, PDFs and email templates.
 *  3. Legacy aliases (`--primary`, `--accent`, `--gold`, `--navy`,
 *     `--brand-blue`, `--gradient-gold`, `--shadow-gold`) so existing
 *     Tailwind tokens and CSS keep working without churn.
 */
export function buildCssVars(theme: ThemeColors): string {
  // Map legacy ThemeColors → BrandThemeOverrides so admin DB values cascade
  // through the central merger. Anything invalid was already filtered above.
  const overrides: BrandThemeOverrides = {
    primary: theme.primary,
    primaryDark: theme.primaryDark,
    secondary: theme.secondary,
    secondaryDark: theme.secondaryDark,
    accent: theme.accent,
    dark: theme.navy,
  };
  const merged = mergeBrandThemeWithOverrides(BRAND_THEME, overrides);
  const c: BrandColorTokens = merged.colors;

  const brandBlock = buildCssVariablesFromBrandTheme(merged);

  const p = hexToHslString(c.primary);
  const ph = hexToHslString(c.primaryHover);
  const pd = hexToHslString(c.primaryDark);
  const s = hexToHslString(c.secondary);
  const sd = hexToHslString(c.secondaryDark);
  const a = hexToHslString(c.accent);
  const bg = hexToHslString(c.background);
  const sf = hexToHslString(c.surface);
  const tx = hexToHslString(c.text);
  const tm = hexToHslString(c.textMuted);
  const br = hexToHslString(c.border);
  const ok = hexToHslString(c.success);
  const wn = hexToHslString(c.warning);
  const er = hexToHslString(c.error);
  const inf = hexToHslString(c.info);
  const n = hexToHslString(c.dark);
  if (!p || !s || !a) return '';

  const parts: string[] = [];
  if (brandBlock) parts.push(brandBlock);

  // ── Public --color-* tokens (the new public API) ────────────────────────
  const pushHsl = (name: string, v: string | null) => { if (v) parts.push(`${name}:${v}`); };
  pushHsl('--color-primary', p);
  pushHsl('--color-primary-hover', ph);
  pushHsl('--color-secondary', s);
  pushHsl('--color-accent', a);
  pushHsl('--color-background', bg);
  pushHsl('--color-surface', sf);
  pushHsl('--color-text', tx);
  pushHsl('--color-text-muted', tm);
  pushHsl('--color-border', br);
  pushHsl('--color-success', ok);
  pushHsl('--color-warning', wn);
  pushHsl('--color-error', er);
  pushHsl('--color-info', inf);

  // ── Charts / Invoices / Emails — raw hex (consumed by JS, not Tailwind) ─
  parts.push(`--chart-primary:${BRAND_CHARTS.primary}`);
  parts.push(`--chart-secondary:${BRAND_CHARTS.secondary}`);
  parts.push(`--chart-accent:${BRAND_CHARTS.accent}`);
  parts.push(`--invoice-header:${BRAND_DOCUMENTS.invoiceHeader}`);
  parts.push(`--invoice-accent:${BRAND_DOCUMENTS.invoiceAccent}`);
  parts.push(`--email-header-bg:${BRAND_EMAILS.headerBg}`);
  parts.push(`--email-primary-button:${BRAND_EMAILS.primaryButton}`);

  // ── Legacy aliases (do not remove — many components still consume) ──────
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