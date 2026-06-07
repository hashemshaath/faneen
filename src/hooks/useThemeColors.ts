import { useMemo } from 'react';
import { usePlatformSettingsCore } from '@/hooks/usePlatformSettingsCore';
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

/**
 * Full mapping: BrandColorTokens field ↔ `platform_settings.setting_key`.
 * Used by `AdminBranding` to read/write the full brand palette (not just
 * the 6 legacy fields exposed via `ThemeColors`). `dark` is stored under
 * the historical `theme_color_navy` key for backward compat.
 */
export const BRAND_THEME_KEY_BY_FIELD: Partial<Record<keyof BrandColorTokens, string>> = {
  primary:       'theme_color_primary',
  primaryHover:  'theme_color_primary_hover',
  primaryDark:   'theme_color_primary_dark',
  secondary:     'theme_color_secondary',
  secondaryDark: 'theme_color_secondary_dark',
  accent:        'theme_color_accent',
  accentHover:   'theme_color_accent_hover',
  background:    'theme_color_background',
  surface:       'theme_color_surface',
  text:          'theme_color_text',
  textMuted:     'theme_color_text_muted',
  border:        'theme_color_border',
  success:       'theme_color_success',
  warning:       'theme_color_warning',
  error:         'theme_color_error',
  info:          'theme_color_info',
  dark:          'theme_color_navy',
};

export const BRAND_THEME_FIELD_BY_KEY: Record<string, keyof BrandColorTokens> = Object.fromEntries(
  Object.entries(BRAND_THEME_KEY_BY_FIELD).map(([f, k]) => [k as string, f as keyof BrandColorTokens]),
);

export function useThemeColors() {
  // Single shared query (see usePlatformSettingsCore) — we filter the
  // `theme` rows locally so this hook never duplicates the network call.
  const { data: rawRows, isLoading } = usePlatformSettingsCore();
  const data = useMemo(() => {
    const rows = (rawRows ?? []).filter((r) => r.category === 'theme');
    const overrides: BrandThemeOverrides = {};
    for (const r of rows) {
      const field = BRAND_THEME_FIELD_BY_KEY[r.setting_key];
      if (!field || !r.setting_value) continue;
      const v = r.setting_value.trim();
      if (!validateHexColor(v) || isForbiddenBrandColor(v)) continue;
      overrides[field] = v;
    }
    const theme: ThemeColors = {
      primary:       overrides.primary       ?? DEFAULT_THEME.primary,
      primaryDark:   overrides.primaryDark   ?? DEFAULT_THEME.primaryDark,
      secondary:     overrides.secondary     ?? DEFAULT_THEME.secondary,
      secondaryDark: overrides.secondaryDark ?? DEFAULT_THEME.secondaryDark,
      accent:        overrides.accent        ?? DEFAULT_THEME.accent,
      navy:          overrides.dark          ?? DEFAULT_THEME.navy,
    };
    return { theme, overrides };
  }, [rawRows]);
  return {
    theme: data?.theme ?? DEFAULT_THEME,
    overrides: data?.overrides ?? {},
    isLoading,
  };
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
 *
 * The optional `extraOverrides` argument lets callers (e.g. `ThemeApplier`)
 * forward the full admin-saved BrandColorTokens overrides — not just the
 * 6 legacy fields exposed via `ThemeColors` — so neutrals/status tokens
 * also flow into `--brand-*` and `--color-*` CSS variables.
 */
export function buildCssVars(
  theme: ThemeColors,
  extraOverrides?: BrandThemeOverrides,
): string {
  // Map legacy ThemeColors → BrandThemeOverrides so admin DB values cascade
  // through the central merger. Anything invalid was already filtered above.
  const overrides: BrandThemeOverrides = {
    primary: theme.primary,
    primaryDark: theme.primaryDark,
    secondary: theme.secondary,
    secondaryDark: theme.secondaryDark,
    accent: theme.accent,
    dark: theme.navy,
    ...(extraOverrides ?? {}),
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

  // ── Legacy aliases (kept to avoid churn — values re-pointed to brand v1.0)
  // None of these emit gold/amber anymore. `--gold*`/`--gradient-gold`/
  // `--shadow-gold` are name-only aliases that resolve to the brand-green
  // palette. The accent orange (#F08A24) is exposed only via `--accent`.
  parts.push(`--primary:${p}`);
  parts.push(`--accent:${a}`);
  parts.push(`--ring:${p}`);
  parts.push(`--gold:${p}`);                  // alias → brand primary green
  if (pd) parts.push(`--gold-dark:${pd}`);    // alias → brand primary dark
  parts.push(`--secondary:${s}`);
  parts.push(`--brand-blue:${s}`);            // alias → brand secondary
  if (sd) parts.push(`--brand-blue-dark:${sd}`); // alias → brand secondary dark
  if (n) parts.push(`--navy:${n}`);           // alias → brand dark
  // Gradient `--gradient-gold` is now primary → primary-dark (no gold).
  const gradGoldEnd = pd ?? p;
  parts.push(
    `--gradient-gold:linear-gradient(135deg,hsl(${p}) 0%,hsl(${gradGoldEnd}) 100%)`,
    `--gradient-brand:linear-gradient(135deg,hsl(${p}) 0%,hsl(${s}) 100%)`,
    // Calm green shadow (no gold tint). Hardcoded RGBA matches brand primary.
    `--shadow-gold:0 8px 24px rgba(14,158,111,0.18)`,
  );
  return `:root{${parts.join(';')}}`;
}