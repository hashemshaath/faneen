import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow } from "@/modules/workOrders";

/**
 * BUSINESS-ADMIN-1 — Admin-safe wrapper around `work_orders`.
 *
 * Reads non-deleted work orders across businesses for the Admin Operations
 * Console. RLS on `work_orders` already restricts non-admins to their own
 * memberships (see policy `wo_select_member` which short-circuits on
 * `has_role(_, 'admin')`), so this wrapper is safe for non-admin callers
 * too — they simply receive their own scope.
 *
 * - Read-only.
 * - Supports status / priority / business / official-ref search filters.
 * - Never throws; bubbles `{ error }` from Supabase.
 * - Search matches `ref_id`, `source_ref_id`, or `title` (case-insensitive).
 *   Pure UUID-shaped queries are rejected so we never invite admins to
 *   paste raw uuids as primary identifiers.
 */

export interface ListAdminWorkOrdersOptions {
  limit?: number;
  status?: string;
  priority?: string;
  businessId?: string;
  search?: string;
}

const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function listAdminWorkOrders(
  options: ListAdminWorkOrdersOptions = {},
): Promise<{ data: WorkOrderRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);

  let query = supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, source_ref_id, title, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.status) query = query.eq("status", options.status);
  if (options.priority) query = query.eq("priority", options.priority);
  if (options.businessId) query = query.eq("business_id", options.businessId);

  const search = (options.search ?? "").trim();
  if (search.length > 0) {
    if (UUID_SHAPE.test(search)) {
      // Refuse to encourage UUID-as-identifier UX.
      return { data: [], error: null };
    }
    const escaped = search.replace(/[\\%_,()]/g, "");
    if (escaped.length > 0) {
      query = query.or(
        `ref_id.ilike.%${escaped}%,source_ref_id.ilike.%${escaped}%,title.ilike.%${escaped}%`,
      );
    }
  }

  const { data, error } = await query;
  return {
    data: (data as WorkOrderRow[] | null) ?? null,
    error,
  };
}