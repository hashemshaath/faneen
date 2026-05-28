import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderRow, WorkOrderStatus } from "../types";

export interface SearchWorkOrdersOptions {
  businessId: string;
  query: string;
  status?: WorkOrderStatus | "all";
  limit?: number;
}

/**
 * BUSINESS-CORE-5 — Unified operational search wrapper for work orders.
 *
 * Matches against `ref_id`, `title`, and `customer_name` within a single
 * business scope. RLS authoritative. Query is bounded to avoid pathological
 * wildcard cost. Sanitises `%` / `_` / `,` from the input so ILIKE patterns
 * and PostgREST `.or()` parsing cannot be subverted.
 */
export async function searchWorkOrders(
  options: SearchWorkOrdersOptions,
): Promise<{ data: WorkOrderRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 50);
  const raw = (options.query ?? "").trim();
  if (!raw || !options.businessId) return { data: [], error: null };
  // Strip characters that have special meaning in ILIKE / PostgREST or()
  const safe = raw.replace(/[%,_()*]/g, "").slice(0, 80);
  if (!safe) return { data: [], error: null };
  const pattern = `%${safe}%`;

  let q = supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, source_type, source_id, source_ref_id, title, customer_name, customer_phone, status, current_stage_key, priority, owner_user_id, created_by_user_id, due_at, completed_at, created_at, updated_at, deleted_at",
    )
    .eq("business_id", options.businessId)
    .is("deleted_at", null)
    .or(
      `ref_id.ilike.${pattern},title.ilike.${pattern},customer_name.ilike.${pattern}`,
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (options.status && options.status !== "all") {
    q = q.eq("status", options.status);
  }

  const { data, error } = await q;
  return { data: (data as WorkOrderRow[] | null) ?? null, error };
}