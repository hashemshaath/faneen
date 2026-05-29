/**
 * BUSINESS-FINISHING-1 Phase F — Quotation revision history (pure derivation).
 *
 * NO new domain / table / migration added. Revisions are derived from
 * existing audit events (business_audit_log entries with
 * entity_type=`work_order_quotation`). Read-only. If/when a dedicated
 * snapshot table is introduced, this helper can swap its input source
 * without changing UI contracts.
 */
import type { BusinessActivityEvent } from '@/modules/businesses/notes/services/listBusinessActivityTimeline';

export interface QuotationRevisionEntry {
  version: number;
  createdAt: string;
  createdBy: string | null;
  action: string;
  refId: string | null;
}

const REVISION_ACTIONS = new Set([
  'quotation_created',
  'quotation_updated',
  'quotation_sent',
  'quotation_approved',
  'quotation_rejected',
  'quotation_revised',
]);

/**
 * Filters audit events to quotation lifecycle changes for a specific
 * quotation (matched by metadata.ref_id) and returns them as ordered
 * revision entries — oldest first, monotonically versioned.
 */
export function deriveQuotationRevisions(
  events: ReadonlyArray<BusinessActivityEvent>,
  quotationRefId: string,
): QuotationRevisionEntry[] {
  const matches = events
    .filter((e) =>
      e.entity_type === 'work_order_quotation' &&
      REVISION_ACTIONS.has(e.action) &&
      e.metadata?.['ref_id'] === quotationRefId,
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return matches.map((e, idx) => ({
    version: idx + 1,
    createdAt: e.created_at,
    createdBy: e.actor_id,
    action: e.action,
    refId: typeof e.metadata?.['ref_id'] === 'string'
      ? (e.metadata['ref_id'] as string)
      : null,
  }));
}