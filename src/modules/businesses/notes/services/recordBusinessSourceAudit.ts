import { supabase } from "@/integrations/supabase/client";

/**
 * BUSINESS-CORE-13 — Source-side audit helper for the Unified Operations Feed.
 *
 * Best-effort write to `business_audit_log` for lifecycle events on the four
 * official source entities (contracts, quotes, leads, bookings). Mirrors the
 * `recordWorkOrderAudit` contract:
 *   - never throws (audit failure must not break the main mutation)
 *   - never includes UUIDs as display values
 *   - strips unsafe metadata keys before insert
 *
 * Scope is intentionally narrow: only the actions listed in
 * `BusinessSourceAuditAction` are accepted by the type system.
 */

export type BusinessSourceEntityType = "contract" | "quote" | "lead" | "booking";

export type BusinessSourceAuditAction =
  // Contracts
  | "contract.created"
  | "contract.updated"
  | "contract.status_changed"
  | "contract.signed"
  | "contract.converted_to_work_order"
  // Quotes
  | "quote.created"
  | "quote.updated"
  | "quote.responded"
  | "quote.converted_to_work_order"
  // Leads
  | "lead.created"
  | "lead.status_changed"
  | "lead.converted_to_work_order"
  // Bookings
  | "booking.created"
  | "booking.status_changed"
  | "booking.converted_to_work_order";

/** Keys we never store in audit metadata — PII / secrets / opaque IDs. */
export const FORBIDDEN_AUDIT_METADATA_KEYS: ReadonlySet<string> = new Set([
  "email",
  "phone",
  "phone_number",
  "mobile",
  "whatsapp",
  "message",
  "message_body",
  "body",
  "notes",
  "note",
  "description_full",
  "token",
  "access_token",
  "refresh_token",
  "otp",
  "password",
  "secret",
  "provider_intent_id",
  "payment_intent_id",
  "client_secret",
  "full_name",
  "name",
  "client_name",
  "address",
  "ip",
  "user_agent",
]);

/** Maximum length for any string we keep in audit metadata. */
const MAX_STRING_LENGTH = 240;

/**
 * Returns a new object containing only safe metadata fields:
 *   - drops every key in FORBIDDEN_AUDIT_METADATA_KEYS
 *   - drops nested objects/arrays (no recursion — only flat scalars survive)
 *   - drops empty strings / undefined
 *   - truncates long strings to MAX_STRING_LENGTH
 */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(metadata)) {
    const key = String(rawKey).trim();
    if (!key) continue;
    if (FORBIDDEN_AUDIT_METADATA_KEYS.has(key.toLowerCase())) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      out[key] = trimmed.length > MAX_STRING_LENGTH
        ? trimmed.slice(0, MAX_STRING_LENGTH)
        : trimmed;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    // Skip objects, arrays, functions, symbols — we never want nested PII to slip in.
  }
  return out;
}

export interface RecordBusinessSourceAuditInput {
  business_id: string;
  actor_id: string;
  entity_type: BusinessSourceEntityType;
  entity_id: string;
  action: BusinessSourceAuditAction;
  metadata?: Record<string, unknown> | null;
}

export async function recordBusinessSourceAudit(
  input: RecordBusinessSourceAuditInput,
): Promise<void> {
  try {
    if (!input.business_id || !input.actor_id || !input.entity_id) return;
    const payload: Record<string, unknown> = {
      business_id: input.business_id,
      actor_id: input.actor_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      action: input.action,
      metadata: sanitizeAuditMetadata(input.metadata ?? null),
    };
    await supabase
      .from("business_audit_log")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(payload as any);
  } catch {
    /* swallow — audit is observability-only */
  }
}