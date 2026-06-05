/**
 * PROVIDER-GROWTH-ENGINE-1 — Part K (foundation)
 *
 * Canonical observability event names for the provider growth pipeline.
 * Pure constants. Actual emission is wired in later phases.
 */

export const PROVIDER_GROWTH_EVENTS = [
  'provider_discovered',
  'provider_imported',
  'provider_enriched',
  'provider_review_requested',
  'provider_verified',
  'provider_published',
  'provider_archived',
] as const;

export type ProviderGrowthEvent = (typeof PROVIDER_GROWTH_EVENTS)[number];

export function isProviderGrowthEvent(value: string): value is ProviderGrowthEvent {
  return (PROVIDER_GROWTH_EVENTS as readonly string[]).includes(value);
}