/**
 * PSG-1 — Part M: Catalog governance observability events.
 * Constant vocabulary + a safe payload projector. No PII leaks.
 */

export const CATALOG_GOVERNANCE_EVENTS = [
  'product_created',
  'product_review_requested',
  'product_approved',
  'product_published',
  'product_archived',
  'service_created',
  'service_review_requested',
  'service_approved',
  'service_published',
  'service_archived',
] as const;

export type CatalogGovernanceEvent = (typeof CATALOG_GOVERNANCE_EVENTS)[number];

export const CATALOG_EVENT_SAFE_KEYS = [
  'event',
  'entity',
  'entity_ref',
  'stage',
  'readiness_score',
  'quality_score',
  'emitted_at',
] as const;

export interface CatalogEventInput {
  entity?: 'product' | 'service' | null;
  entity_ref?: string | null;
  stage?: string | null;
  readiness_score?: number | null;
  quality_score?: number | null;
}

export interface CatalogEventPayload {
  event: CatalogGovernanceEvent;
  entity: 'product' | 'service' | null;
  entity_ref: string | null;
  stage: string | null;
  readiness_score: number | null;
  quality_score: number | null;
  emitted_at: string;
}

const clampScore = (v: number | null | undefined): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
};
const safeString = (v: unknown, max = 64): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

export function buildSafeCatalogEventPayload(
  event: CatalogGovernanceEvent,
  input: CatalogEventInput,
): CatalogEventPayload {
  return {
    event,
    entity: input.entity === 'product' || input.entity === 'service' ? input.entity : null,
    entity_ref: safeString(input.entity_ref),
    stage: safeString(input.stage, 32),
    readiness_score: clampScore(input.readiness_score),
    quality_score: clampScore(input.quality_score),
    emitted_at: new Date().toISOString(),
  };
}

export function emitCatalogGovernanceEvent(
  event: CatalogGovernanceEvent,
  input: CatalogEventInput = {},
): CatalogEventPayload {
  const payload = buildSafeCatalogEventPayload(event, input);
  if (typeof window !== 'undefined' && typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.debug('[catalog.governance]', payload);
  }
  return payload;
}

export function isCatalogGovernanceEvent(v: string): v is CatalogGovernanceEvent {
  return (CATALOG_GOVERNANCE_EVENTS as readonly string[]).includes(v);
}

/** Unified catalog lifecycle stages — shared by products & services. */
export const CATALOG_LIFECYCLE_STAGES = [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
] as const;
export type CatalogLifecycleStage = (typeof CATALOG_LIFECYCLE_STAGES)[number];

/**
 * Map raw `admin_status` + `is_active` to the unified lifecycle stage.
 * Mirrors the existing `business_services` model — no schema change.
 */
export function mapServiceToLifecycleStage(row: {
  admin_status?: string | null;
  provider_status?: string | null;
  is_active?: boolean | null;
}): CatalogLifecycleStage {
  if (row.admin_status === 'rejected' || row.admin_status === 'suspended') return 'archived';
  if (row.admin_status === 'pending_review') return 'review';
  if (row.admin_status === 'allowed') {
    if (row.is_active === false || row.provider_status === 'paused') return 'approved';
    return 'published';
  }
  return 'draft';
}