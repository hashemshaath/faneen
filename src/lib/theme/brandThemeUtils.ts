/**
 * Brand Theme Utilities
 *
 * Pure helpers for validating, transforming and applying the central
 * `BrandTheme` registry (see `src/config/brandTheme.ts`). No React, no DOM
 * side-effects — safe to import from edge functions, PDF builders, charts
 * and email templates.
 */

import {
  BRAND_THEME,
  FORBIDDEN_BRAND_COLORS,
  type BrandTheme,
  type BrandColorTokens,
} from '@/config/brandTheme';

/** Strict 6-digit hex (with leading `#`). */
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

export function validateHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX6_RE.test(value.trim());
}

/** Convert `#RRGGBB` → `H S% L%` (Tailwind `hsl(var(--x))` token format). */
export function hexToHslString(hex: string): string | null {
  if (!validateHexColor(hex)) return null;
  const v = parseInt(hex.trim().slice(1), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
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

/** Case-insensitive forbidden check. Logo-only `#14B481` returns `true`. */
export function isForbiddenBrandColor(hex: string): boolean {
  if (typeof hex !== 'string') return false;
  const norm = hex.trim().toLowerCase();
  return FORBIDDEN_BRAND_COLORS.some((c) => c.toLowerCase() === norm);
}

/**
 * Admin override shape — flat partial map of color-token overrides.
 * Anything that isn't a valid hex (or that is forbidden) is silently dropped
 * so a bad DB row can never poison the live theme.
 */
export type BrandThemeOverrides = Partial<Record<keyof BrandColorTokens, string>>;

export function mergeBrandThemeWithOverrides(
  base: BrandTheme = BRAND_THEME,
  overrides?: BrandThemeOverrides | null,
): BrandTheme {
  if (!overrides) return base;
  const colors: BrandColorTokens = { ...base.colors };
  (Object.keys(overrides) as Array<keyof BrandColorTokens>).forEach((key) => {
    const value = overrides[key];
    if (validateHexColor(value) && !isForbiddenBrandColor(value)) {
      colors[key] = value;
    }
  });
  return { ...base, colors };
}

/**
 * Build a CSS variable block (without selector) from a BrandTheme.
 * Wrap the returned string in `:root{ ... }` (or any selector) at the call
 * site. Returns `''` when required tokens fail conversion.
 */
export function buildCssVariablesFromBrandTheme(theme: BrandTheme = BRAND_THEME): string {
  const c = theme.colors;
  const p  = hexToHslString(c.primary);
  const ph = hexToHslString(c.primaryHover);
  const pl = hexToHslString(c.primaryLight);
  const pd = hexToHslString(c.primaryDark);
  const s  = hexToHslString(c.secondary);
  const sh = hexToHslString(c.secondaryHover);
  const sl = hexToHslString(c.secondaryLight);
  const sd = hexToHslString(c.secondaryDark);
  const a  = hexToHslString(c.accent);
  const ah = hexToHslString(c.accentHover);
  const al = hexToHslString(c.accentLight);
  const bg = hexToHslString(c.background);
  const sf = hexToHslString(c.surface);
  const sf2 = hexToHslString(c.surface2);
  const tx = hexToHslString(c.text);
  const tm = hexToHslString(c.textMuted);
  const ts = hexToHslString(c.textSubtle);
  const br = hexToHslString(c.border);
  const brs = hexToHslString(c.borderStrong);
  const ok = hexToHslString(c.success);
  const wn = hexToHslString(c.warning);
  const er = hexToHslString(c.error);
  const inf = hexToHslString(c.info);
  const dk = hexToHslString(c.dark);

  if (!p || !s || !a || !bg || !tx) return '';

  const lines: string[] = [];
  const push = (k: string, v: string | null) => { if (v) lines.push(`${k}:${v}`); };

  push('--brand-primary', p);
  push('--brand-primary-hover', ph);
  push('--brand-primary-light', pl);
  push('--brand-primary-dark', pd);
  push('--brand-secondary', s);
  push('--brand-secondary-hover', sh);
  push('--brand-secondary-light', sl);
  push('--brand-secondary-dark', sd);
  push('--brand-accent', a);
  push('--brand-accent-hover', ah);
  push('--brand-accent-light', al);
  push('--brand-background', bg);
  push('--brand-surface', sf);
  push('--brand-surface-2', sf2);
  push('--brand-text', tx);
  push('--brand-text-muted', tm);
  push('--brand-text-subtle', ts);
  push('--brand-border', br);
  push('--brand-border-strong', brs);
  push('--brand-success', ok);
  push('--brand-warning', wn);
  push('--brand-error', er);
  push('--brand-info', inf);
  push('--brand-dark', dk);

  return lines.join(';');
}

/** Convenience: convert `#RRGGBB` → `[r,g,b]` (0-255) for jsPDF / canvas. */
export function hexToRgbTuple(hex: string): [number, number, number] | null {
  if (!validateHexColor(hex)) return null;
  const v = parseInt(hex.trim().slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}