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

/**
 * PROVIDER-GROWTH-ENGINE-3 — Part A: live observability emission.
 *
 * Safe metadata only. No raw PII (phone/email/address) or staff identifiers
 * leak through the event sink. Callers pass a rich input; we project it down
 * to a small, allow-listed payload.
 */
export interface GrowthEventInput {
  business_ref?: string | null;
  stage?: string | null;
  source?: string | null;
  readiness_score?: number | null;
  quality_score?: number | null;
}

export interface GrowthEventPayload {
  event: ProviderGrowthEvent;
  business_ref: string | null;
  stage: string | null;
  source: string | null;
  readiness_score: number | null;
  quality_score: number | null;
  emitted_at: string;
}

/** Keys allowed in event metadata. Used by tests + the safety projector. */
export const GROWTH_EVENT_SAFE_KEYS = [
  'event',
  'business_ref',
  'stage',
  'source',
  'readiness_score',
  'quality_score',
  'emitted_at',
] as const;

const SAFE_KEY_SET = new Set<string>(GROWTH_EVENT_SAFE_KEYS);

function clampScore(v: number | null | undefined): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function safeString(v: unknown, max = 64): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function buildSafeGrowthEventPayload(
  event: ProviderGrowthEvent,
  input: GrowthEventInput,
): GrowthEventPayload {
  return {
    event,
    business_ref: safeString(input.business_ref),
    stage: safeString(input.stage),
    source: safeString(input.source, 96),
    readiness_score: clampScore(input.readiness_score ?? null),
    quality_score: clampScore(input.quality_score ?? null),
    emitted_at: new Date().toISOString(),
  };
}

/** True if the payload only contains the allow-listed safe keys. */
export function isSafeGrowthEventPayload(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).every((k) => SAFE_KEY_SET.has(k));
}

type GrowthEventSink = (payload: GrowthEventPayload) => void;

let sink: GrowthEventSink = (payload) => {
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.info('[provider-growth]', payload.event, payload);
  }
};

/** Replace the sink (tests / wiring to analytics). */
export function setProviderGrowthEventSink(next: GrowthEventSink): void {
  sink = next;
}

export function emitProviderGrowthEvent(
  event: ProviderGrowthEvent,
  input: GrowthEventInput = {},
): GrowthEventPayload {
  const payload = buildSafeGrowthEventPayload(event, input);
  try {
    sink(payload);
  } catch {
    /* never throw from the observability path */
  }
  return payload;
}