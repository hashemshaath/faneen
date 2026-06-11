/**
 * Local types for AdminProviderAnalytics.
 *
 * Kept narrow on purpose: only the columns actually selected from
 * `provider_interactions` and `businesses_public` are modelled here.
 */

export type ProviderInteractionEventType =
  | 'section_view'
  | 'card_click'
  | 'view_all_click'
  | string;

/** Row shape returned by the summary query (only `event_type` is selected). */
export interface ProviderAnalyticsEventRow {
  event_type: ProviderInteractionEventType | null;
}

/** Row shape returned by the top-clicked query. */
export interface ProviderAnalyticsClickRow {
  provider_id: string | null;
  provider_username: string | null;
}

/** Subset of `businesses_public` fetched for the top-providers panel. */
export interface ProviderBusinessLite {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  membership_tier: string | null;
  is_verified: boolean | null;
}

/** Aggregated click count per provider. */
export interface ProviderAnalyticsAggregate {
  id: string;
  username: string;
  clicks: number;
}

/** Final row rendered in the Top Providers table. */
export interface ProviderAnalyticsTopRow extends ProviderAnalyticsAggregate {
  business: ProviderBusinessLite | null;
}