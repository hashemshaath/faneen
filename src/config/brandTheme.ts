/**
 * Qitaat Brand Theme — Single Source of Truth (v1.0)
 *
 * Central registry for ALL brand colors used across:
 *   - Web UI (via CSS variables)
 *   - Emails (inline styles in transactional templates)
 *   - PDFs / Invoices / Contracts (jsPDF rgb values)
 *   - Charts (Recharts series)
 *   - Print stylesheets / Maps
 *
 * RULES:
 *   - Hex values only here. Conversion to HSL happens in `brandThemeUtils`.
 *   - Never hardcode colors elsewhere — import from this file.
 *   - Forbidden colors are listed in `FORBIDDEN_BRAND_COLORS`.
 *   - DB overrides (admin branding) merge on top via `mergeBrandThemeWithOverrides`.
 */

export interface BrandColorTokens {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  dark: string;
}

export interface StatusToken {
  bg: string;
  border: string;
  text: string;
}

export interface BrandStatusTokens {
  success: StatusToken;
  warning: StatusToken;
  error: StatusToken;
  info: StatusToken;
  pending: StatusToken;
  featured: StatusToken;
  urgent: StatusToken;
}

export interface BrandChartTokens {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
}

export interface BrandDocumentTokens {
  invoiceHeader: string;
  invoiceAccent: string;
  invoiceText: string;
  invoiceMuted: string;
  invoiceBorder: string;
  pdfHeader: string;
  pdfAccent: string;
}

export interface BrandEmailTokens {
  headerBg: string;
  primaryButton: string;
  secondaryButton: string;
  bodyBg: string;
  cardBg: string;
  text: string;
  muted: string;
  border: string;
}

export interface BrandShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  primaryGlow: string;
}

export interface BrandRadiiTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  pill: string;
}

export interface BrandTheme {
  colors: BrandColorTokens;
  status: BrandStatusTokens;
  charts: BrandChartTokens;
  documents: BrandDocumentTokens;
  emails: BrandEmailTokens;
  shadows: BrandShadowTokens;
  radii: BrandRadiiTokens;
}

export const BRAND_COLORS: BrandColorTokens = {
  primary: '#0E9E6F',
  primaryHover: '#0A7E58',
  primaryLight: '#E6F7F0',
  primaryDark: '#075E42',
  secondary: '#2F62AE',
  secondaryHover: '#234E8C',
  secondaryLight: '#EAF0FA',
  secondaryDark: '#142D52',
  accent: '#F08A24',
  accentHover: '#D17008',
  accentLight: '#FCE7CE',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surface2: '#F2F4F8',
  text: '#1A2230',
  textMuted: '#6B7689',
  textSubtle: '#94A0B2',
  border: '#E2E6EE',
  borderStrong: '#C2CAD6',
  success: '#0E9E6F',
  warning: '#B45309',
  error: '#C42626',
  info: '#2F62AE',
  dark: '#131722',
};

export const BRAND_STATUS: BrandStatusTokens = {
  success: { bg: '#E6F7F0', border: '#9DD8BD', text: '#075E42' },
  warning: { bg: '#FEF3C7', border: '#F4C77B', text: '#7C3A05' },
  error:   { bg: '#FDECEC', border: '#F1A7A7', text: '#7A1212' },
  info:    { bg: '#EAF0FA', border: '#A6BFE3', text: '#142D52' },
  pending: { bg: '#EDEFF3', border: '#DDE2EA', text: '#4B5566' },
  featured:{ bg: '#FFF6E5', border: '#F4C77B', text: '#7C3A05' },
  urgent:  { bg: '#C42626', border: '#9C1212', text: '#FFFFFF' },
};

export const BRAND_CHARTS: BrandChartTokens = {
  primary:   '#0E9E6F',
  secondary: '#2F62AE',
  accent:    '#F08A24',
  success:   '#0E9E6F',
  warning:   '#B45309',
  error:     '#C42626',
  neutral:   '#6B7689',
};

export const BRAND_DOCUMENTS: BrandDocumentTokens = {
  invoiceHeader: '#131722',
  invoiceAccent: '#0E9E6F',
  invoiceText:   '#1A2230',
  invoiceMuted:  '#6B7689',
  invoiceBorder: '#E2E6EE',
  pdfHeader:     '#131722',
  pdfAccent:     '#0E9E6F',
};

export const BRAND_EMAILS: BrandEmailTokens = {
  headerBg:        '#131722',
  primaryButton:   '#0E9E6F',
  secondaryButton: '#2F62AE',
  bodyBg:          '#F7F8FA',
  cardBg:          '#FFFFFF',
  text:            '#1A2230',
  muted:           '#6B7689',
  border:          '#E2E6EE',
};

export const BRAND_SHADOWS: BrandShadowTokens = {
  sm: '0 1px 2px rgba(19,23,34,.06), 0 1px 1px rgba(19,23,34,.04)',
  md: '0 4px 12px rgba(19,23,34,.06), 0 2px 4px rgba(19,23,34,.04)',
  lg: '0 12px 32px rgba(19,23,34,.10), 0 4px 8px rgba(19,23,34,.04)',
  xl: '0 24px 56px rgba(19,23,34,.14), 0 8px 16px rgba(19,23,34,.06)',
  primaryGlow: '0 4px 20px -4px rgba(14,158,111,.40)',
};

export const BRAND_RADII: BrandRadiiTokens = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  pill: '9999px',
};

export const BRAND_THEME: BrandTheme = {
  colors: BRAND_COLORS,
  status: BRAND_STATUS,
  charts: BRAND_CHARTS,
  documents: BRAND_DOCUMENTS,
  emails: BRAND_EMAILS,
  shadows: BRAND_SHADOWS,
  radii: BRAND_RADII,
};

/**
 * Colors that must NEVER appear in components, emails, PDFs or charts.
 * - `#14B481` is reserved for the LOGO ONLY (legacy brand green tone).
 * - The rest are deprecated palette values from previous iterations.
 */
export const FORBIDDEN_BRAND_COLORS: readonly string[] = [
  '#14B481', // logo-only — never reuse in UI
  '#1FBA82',
  '#178A60',
  '#2D54C4',
  '#1F3D99',
  '#1A2240',
  '#d4a017',
  '#f59e0b',
  '#fbbf24',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
] as const;

export default BRAND_THEME;