/**
 * Shared brand theme for Supabase Edge Functions.
 *
 * Mirrors the central brandTheme.emails palette from `src/config/brandTheme.ts`,
 * but kept as a self-contained, dependency-free module because Edge Functions
 * cannot import from the `src/` tree.
 *
 * Use these tokens in HTML / React-Email templates and PDF/document generators.
 * CSS custom properties are NOT reliable in email clients — always inline the
 * literal hex values from this file.
 *
 * Keep this file in sync with `BRAND_EMAILS` in `src/config/brandTheme.ts`.
 */
export const EMAIL_BRAND = {
  // Layout
  headerBg:       '#131722',
  bodyBg:         '#F7F8FA',
  cardBg:         '#FFFFFF',

  // Typography
  text:           '#1A2230',
  muted:          '#6B7689',
  border:         '#E2E6EE',

  // Buttons
  primaryButton:  '#0E9E6F',
  primaryButtonText: '#FFFFFF',
  secondaryButton:'#2F62AE',
  secondaryButtonText: '#FFFFFF',

  // Status (matches brand status palette)
  success:        '#0E9E6F',
  warning:        '#B45309',
  error:          '#C42626',
  info:           '#2F62AE',
} as const;

export type EmailBrand = typeof EMAIL_BRAND;

/**
 * Soft tinted backgrounds for status badges / highlight boxes inside emails.
 * Derived from the brand status palette — keep in sync with `BilingualLayout`.
 */
export const EMAIL_TINTS = {
  neutral: '#EEF1F6',
  success: '#E6F5EE',
  warning: '#FBEEDC',
  info:    '#E6EEF8',
  danger:  '#F8E1E1',
} as const;

export type EmailTints = typeof EMAIL_TINTS;
