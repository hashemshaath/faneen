import { supabase } from "@/integrations/supabase/client";
import {
  sanitizeAuditMetadata,
} from "@/modules/businesses/notes/services/recordBusinessSourceAudit";
import type { BusinessActivityEvent } from "@/modules/businesses/notes";

/**
 * BUSINESS-ADMIN-1 — Admin-safe wrapper around `business_audit_log`.
 *
 * Reads the cross-business operational activity stream that powers the
 * Admin Operations Console. RLS on `business_audit_log` already restricts
 * non-admins to their own businesses (see policy `Admins read audit`), so
 * a non-admin caller silently receives only their own scope; admins get
 * the full stream.
 *
 * - Read-only.
 * - Returns the same shape as `BusinessActivityEvent`, but with metadata
 *   pushed through `sanitizeAuditMetadata` to drop PII / tokens /
 *   provider_intent_id even if a legacy writer slipped one in.
 * - Supports source-type, business and official-ref filters.
 * - Never throws; bubbles `{ error }` from Supabase.
 */

export type AdminOperationalSourceType =
  | "work_order"
  | "contract"
  | "quote"
  | "lead"
  | "booking";

export interface ListAdminOperationalActivityOptions {
  limit?: number;
  sourceType?: AdminOperationalSourceType;
  businessId?: string;
  /** Official ref id (ENT/CNT/QTE/LED/BKG/WO/TASK-…). UUIDs are rejected. */
  refSearch?: string;
}

/** Same official-ref shape as the rest of the operations stack. */
const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

const SOURCE_PREFIXES: Record<AdminOperationalSourceType, string> = {
  work_order: "work_order.",
  contract: "contract.",
  quote: "quote.",
  lead: "lead.",
  booking: "booking.",
};

function refMatches(
  metadata: Record<string, unknown> | null | undefined,
  query: string,
): boolean {
  if (!metadata) return false;
  const q = query.trim().toUpperCase();
  for (const k of [
    "ref_id",
    "task_ref_id",
    "contract_ref_id",
    "quote_ref_id",
    "lead_ref_id",
    "booking_ref_id",
    "work_order_ref_id",
  ] as const) {
    const v = metadata[k];
    if (typeof v !== "string") continue;
    const up = v.trim().toUpperCase();
    if (!OFFICIAL_REF.test(up)) continue;
    if (up.includes(q)) return true;
  }
  return false;
}

export async function listAdminOperationalActivity(
  options: ListAdminOperationalActivityOptions = {},
): Promise<{ data: BusinessActivityEvent[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  let query = supabase
    .from("business_audit_log")
    .select(
      "id, business_id, actor_id, entity_type, entity_id, action, metadata, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.businessId) {
    query = query.eq("business_id", options.businessId);
  }
  if (options.sourceType) {
    query = query.like("action", `${SOURCE_PREFIXES[options.sourceType]}%`);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  const rows = (data ?? []) as BusinessActivityEvent[];
  const cleaned: BusinessActivityEvent[] = rows.map((r) => ({
    ...r,
    metadata: sanitizeAuditMetadata(r.metadata ?? null),
  }));

  const refQuery = (options.refSearch ?? "").trim();
  // Only honour an official-ref-shaped search; reject UUIDs / junk silently.
  const refOk =
    refQuery.length > 0 &&
    OFFICIAL_REF.test(refQuery.toUpperCase()) === false
      ? false
      : refQuery.length > 0;
  // refOk is false when the query is empty OR a UUID-shaped string.
  // A non-empty query that doesn't match OFFICIAL_REF returns []
  // (we never expose UUIDs as searchable identifiers).
  if (refQuery.length === 0) {
    return { data: cleaned, error: null };
  }
  if (!OFFICIAL_REF.test(refQuery.toUpperCase())) {
    return { data: [], error: null };
  }
  const filtered = cleaned.filter((ev) => refMatches(ev.metadata, refQuery));
  return { data: filtered, error: null };
}

export { OFFICIAL_REF as ADMIN_OPERATIONAL_OFFICIAL_REF };