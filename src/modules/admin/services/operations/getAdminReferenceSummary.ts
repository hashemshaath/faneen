import { lookupByReference } from "@/modules/reference/services/lookupByReference";
import { listAdminWorkOrders } from "@/modules/workOrders";
import { listAdminOperationalActivity } from "./listAdminOperationalActivity";
import type { BusinessActivityEvent } from "@/modules/businesses/notes";
import { getAdminContractSummaryByRef } from "@/modules/contracts";
import { getAdminQuoteSummaryByRef } from "@/modules/quotes";
import { getAdminLeadSummaryByRef } from "@/modules/leads";
import { getAdminBookingSummaryByRef } from "@/modules/bookings";
import { getAdminBusinessSummaryByRef } from "@/modules/businesses";
import { getAdminTaskSummaryByRef } from "@/modules/workOrders";

/**
 * BUSINESS-ADMIN-3 — Admin Reference Inspector resolver.
 *
 * Safe summary for any official ref (ENT/CNT/QTE/LED/BKG/WO/TASK/…).
 * Composes existing admin-safe wrappers and the `lookup_by_reference`
 * RPC. Never exposes raw UUIDs as primary identifiers, tokens, secrets,
 * provider_intent_id, login email, phone, or synthetic identifiers.
 *
 * Read-only. No direct table access in the page.
 */

export const ADMIN_REF_OFFICIAL = /^[A-Z]{2,6}-[A-Z0-9]+$/;
const UUID_SHAPE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export type AdminRefEntityType =
  | "work_order"
  | "work_order_task"
  | "contract"
  | "quote"
  | "lead"
  | "booking"
  | "business"
  | "payment"
  | "provider_subscription"
  | "staff"
  | "unknown";

export interface AdminReferenceSummary {
  ref_id: string;
  entity_type: AdminRefEntityType;
  canonical_route: string | null;
  label: string | null;
  status: string | null;
  priority: string | null;
  business_ref_id: string | null;
  source_ref_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminReferenceInspectorBundle {
  ref_id: string;
  found: boolean;
  summary: AdminReferenceSummary | null;
  related_refs: string[];
  events: BusinessActivityEvent[];
}

function normalizeRef(input: string): string {
  return (input ?? "").trim().toUpperCase();
}

export function isOfficialAdminRef(input: string): boolean {
  const r = normalizeRef(input);
  if (r.length === 0) return false;
  if (UUID_SHAPE.test(r)) return false;
  return ADMIN_REF_OFFICIAL.test(r);
}

function prefixOf(ref: string): string {
  const i = ref.indexOf("-");
  return i > 0 ? ref.slice(0, i).toUpperCase() : "";
}

/** Map server entity_type → narrow union we render. */
function mapEntityType(raw: string | null | undefined): AdminRefEntityType {
  switch ((raw ?? "").toLowerCase()) {
    case "work_order":
    case "work_orders":
      return "work_order";
    case "work_order_task":
    case "work_order_tasks":
    case "task":
      return "work_order_task";
    case "contract":
    case "contracts":
      return "contract";
    case "quote":
    case "quote_request":
    case "quote_requests":
      return "quote";
    case "lead":
    case "lead_request":
    case "lead_requests":
      return "lead";
    case "booking":
    case "bookings":
      return "booking";
    case "business":
    case "businesses":
    case "entity":
      return "business";
    case "payment":
    case "membership_payment":
      return "payment";
    case "provider_subscription":
    case "subscription":
      return "provider_subscription";
    case "staff":
    case "business_staff":
      return "staff";
    default:
      return "unknown";
  }
}

/** Pull official refs out of a sanitized metadata payload. */
function collectRefs(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  if (!metadata) return [];
  const out: string[] = [];
  const keys = [
    "ref_id",
    "task_ref_id",
    "contract_ref_id",
    "quote_ref_id",
    "lead_ref_id",
    "booking_ref_id",
    "work_order_ref_id",
    "source_ref_id",
    "parent_ref_id",
    "business_ref_id",
  ] as const;
  for (const k of keys) {
    const v = metadata[k];
    if (typeof v !== "string") continue;
    const up = v.trim().toUpperCase();
    if (ADMIN_REF_OFFICIAL.test(up)) out.push(up);
  }
  return out;
}

export async function getAdminReferenceSummary(input: {
  refId: string;
}): Promise<{ data: AdminReferenceInspectorBundle | null; error: unknown }> {
  const refId = normalizeRef(input.refId);
  if (!isOfficialAdminRef(refId)) {
    return {
      data: {
        ref_id: refId,
        found: false,
        summary: null,
        related_refs: [],
        events: [],
      },
      error: null,
    };
  }

  const [lookupRes, activityRes, woRes] = await Promise.all([
    lookupByReference({ reference: refId }),
    listAdminOperationalActivity({ refSearch: refId, limit: 200 }),
    // WO enrichment is harmless for non-WO refs (search returns []).
    listAdminWorkOrders({ search: refId, limit: 50 }),
  ]);

  if (lookupRes.error) return { data: null, error: lookupRes.error };

  const row = (lookupRes.data ?? [])[0] ?? null;
  const events = activityRes.data ?? [];

  // Derive related refs from event metadata, excluding self.
  const relatedSet = new Set<string>();
  for (const ev of events) {
    for (const r of collectRefs(ev.metadata ?? null)) {
      if (r !== refId) relatedSet.add(r);
    }
  }

  let summary: AdminReferenceSummary | null = null;

  if (row) {
    const entityType = mapEntityType(row.entity_type);
    summary = {
      ref_id: row.ref_id && ADMIN_REF_OFFICIAL.test(row.ref_id) ? row.ref_id : refId,
      entity_type: entityType,
      canonical_route:
        typeof row.canonical_route === "string" && row.canonical_route.length > 0
          ? row.canonical_route
          : null,
      label: null,
      status: null,
      priority: null,
      business_ref_id: null,
      source_ref_id: null,
      created_at: null,
      updated_at: null,
    };
  }

  // BUSINESS-ADMIN-4 — Per-entity enrichment dispatched by official prefix.
  // Each wrapper is admin-safe, read-only, and only returns sanitized fields.
  const prefix = prefixOf(refId);
  type EnrichResult = {
    label?: string | null;
    status?: string | null;
    priority?: string | null;
    business_ref_id?: string | null;
    source_ref_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    canonical_route?: string | null;
    entity_type?: AdminRefEntityType;
  };
  let enriched: EnrichResult | null = null;
  try {
    if (prefix === "CNT") {
      const r = await getAdminContractSummaryByRef({ refId });
      enriched = r.data;
    } else if (prefix === "QTE") {
      const r = await getAdminQuoteSummaryByRef({ refId });
      enriched = r.data;
    } else if (prefix === "LED" || prefix === "LR") {
      const r = await getAdminLeadSummaryByRef({ refId });
      enriched = r.data;
    } else if (prefix === "BKG" || prefix === "BK") {
      const r = await getAdminBookingSummaryByRef({ refId });
      enriched = r.data;
    } else if (prefix === "ENT" || prefix === "BIZ") {
      const r = await getAdminBusinessSummaryByRef({ refId });
      enriched = r.data;
    } else if (prefix === "TASK") {
      const r = await getAdminTaskSummaryByRef({ refId });
      enriched = r.data;
    }
  } catch {
    // Never throw on enrichment failure; fall back to lookup row.
    enriched = null;
  }

  if (enriched) {
    if (!summary) {
      summary = {
        ref_id: refId,
        entity_type: enriched.entity_type ?? "unknown",
        canonical_route: enriched.canonical_route ?? null,
        label: enriched.label ?? null,
        status: enriched.status ?? null,
        priority: enriched.priority ?? null,
        business_ref_id: enriched.business_ref_id ?? null,
        source_ref_id: enriched.source_ref_id ?? null,
        created_at: enriched.created_at ?? null,
        updated_at: enriched.updated_at ?? null,
      };
    } else {
      summary.label = enriched.label ?? summary.label;
      summary.status = enriched.status ?? summary.status;
      summary.priority = enriched.priority ?? summary.priority;
      summary.business_ref_id = enriched.business_ref_id ?? summary.business_ref_id;
      summary.created_at = enriched.created_at ?? summary.created_at;
      summary.updated_at = enriched.updated_at ?? summary.updated_at;
      if (enriched.canonical_route) summary.canonical_route = enriched.canonical_route;
      if (
        enriched.source_ref_id &&
        ADMIN_REF_OFFICIAL.test(enriched.source_ref_id)
      ) {
        summary.source_ref_id = enriched.source_ref_id;
        relatedSet.add(enriched.source_ref_id);
      }
    }
  }

  // WO enrichment: when the matching work-order row is available, fold
  // its public-safe fields into the summary. Never expose UUIDs as the
  // primary display — only ref_id / source_ref_id strings.
  const woRow = (woRes.data ?? []).find(
    (w) => (w.ref_id ?? "").toUpperCase() === refId,
  );
  if (woRow) {
    if (!summary) {
      summary = {
        ref_id: woRow.ref_id ?? refId,
        entity_type: "work_order",
        canonical_route: `/dashboard/work-orders/${woRow.id}`,
        label: null,
        status: null,
        priority: null,
        business_ref_id: null,
        source_ref_id: null,
        created_at: null,
        updated_at: null,
      };
    }
    summary.label = woRow.title ?? summary.label;
    summary.status = woRow.status ?? summary.status;
    summary.priority = woRow.priority ?? summary.priority;
    summary.created_at = woRow.created_at ?? summary.created_at;
    summary.updated_at = woRow.updated_at ?? summary.updated_at;
    if (woRow.source_ref_id && ADMIN_REF_OFFICIAL.test(woRow.source_ref_id)) {
      summary.source_ref_id = woRow.source_ref_id;
      relatedSet.add(woRow.source_ref_id);
    }
  }

  // Also fold in any WO whose source_ref_id matches this ref (reverse link).
  for (const w of woRes.data ?? []) {
    if (w.source_ref_id && w.source_ref_id.toUpperCase() === refId) {
      if (w.ref_id && ADMIN_REF_OFFICIAL.test(w.ref_id)) {
        relatedSet.add(w.ref_id);
      }
    }
  }

  return {
    data: {
      ref_id: refId,
      found: Boolean(summary),
      summary,
      related_refs: Array.from(relatedSet).sort(),
      events,
    },
    error: null,
  };
}