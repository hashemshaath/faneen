/**
 * Shared types for admin contract analytics presentational sections.
 * Pure types — no Supabase, no queries.
 *
 * Shape mirrors the SECURITY DEFINER RPC
 * `get_admin_contract_analytics_dashboard` payload consumed by
 * `src/pages/admin/AdminContractAnalytics.tsx`.
 */

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '12m' | 'all';

export interface AnalyticsCurrencyAmount {
  currency_code: string;
  total: number;
}

export type AnalyticsLanguage = 'ar' | 'en';

export interface AdminAnalyticsSummary {
  contracts_total: number;
  by_status: Record<
    'draft' | 'pending_approval' | 'active' | 'completed' | 'cancelled' | 'disputed',
    number
  >;
  created_this_period: number;
  completed_this_period: number;
  providers_active: number;
  businesses_with_contracts: number;
}

export interface AdminAnalyticsMonthlyTrendItem {
  month: string;
  created: number;
  completed: number;
}

export interface AdminAnalyticsLeaderboardCountItem {
  business_id: string;
  business_name: string;
  contracts: number;
}

export interface AdminAnalyticsLeaderboardValueItem {
  business_id: string;
  business_name: string;
  value_by_currency: AnalyticsCurrencyAmount[];
}

export interface AdminAnalyticsLeadConversionItem {
  business_id: string;
  business_name: string;
  leads: number;
  contracts_from_leads: number;
  rate: number;
}

export interface AdminAnalyticsTemplateItem {
  template_id: string;
  template_name: string;
  count: number;
}

export interface AdminAnalyticsPricingMethodItem {
  method: string;
  count: number;
}

export interface AdminAnalyticsExecutionSiteCoverage {
  with_sites: number;
  without_sites: number;
  top_cities: { city_name: string; count: number }[];
}

export interface AdminAnalyticsPdfExports {
  exports_count: number;
  last_exported_at: string | null;
}

export interface AdminAnalyticsAmendments {
  total: number;
  by_event: { event: string; count: number }[];
}

export interface AdminAnalyticsRiskIndicators {
  drafts_missing_sites: number;
  drafts_missing_pricing: number;
  active_without_recent_pdf: number;
  businesses_with_missing_sites: {
    business_id: string;
    business_name: string;
    drafts_missing_sites: number;
  }[];
}

export interface AdminAnalyticsPayload {
  generated_at: string;
  period: { key: AnalyticsPeriod; from: string | null; to: string };
  scope: { business_id: string | null; include_demo: boolean };
  summary: AdminAnalyticsSummary;
  value_by_currency: AnalyticsCurrencyAmount[];
  active_value_by_currency: AnalyticsCurrencyAmount[];
  monthly_trend: AdminAnalyticsMonthlyTrendItem[];
  leaderboard_by_count: AdminAnalyticsLeaderboardCountItem[];
  leaderboard_by_value: AdminAnalyticsLeaderboardValueItem[];
  lead_conversion_by_business: AdminAnalyticsLeadConversionItem[];
  template_adoption: AdminAnalyticsTemplateItem[];
  pricing_method_distribution: AdminAnalyticsPricingMethodItem[];
  execution_site_coverage: AdminAnalyticsExecutionSiteCoverage;
  pdf_exports: AdminAnalyticsPdfExports;
  amendments: AdminAnalyticsAmendments;
  risk_indicators: AdminAnalyticsRiskIndicators;
}

export const fmtAnalyticsNumber = (n: number, locale: string): string =>
  new Intl.NumberFormat(locale).format(n ?? 0);

export const fmtAnalyticsMoney = (a: number, ccy: string, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: ccy,
      maximumFractionDigits: 0,
    }).format(a ?? 0);
  } catch {
    return `${fmtAnalyticsNumber(a ?? 0, locale)} ${ccy}`;
  }
};

export const pickAnalyticsLabel = (language: AnalyticsLanguage, ar: string, en: string): string =>
  language === 'ar' ? ar : en;