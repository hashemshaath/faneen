import { supabase } from "@/integrations/supabase/client";
import type { WorkOrderPipelineStageKey, WorkOrderPriority } from "../types";

/**
 * BUSINESS-WORKFLOW-7 — Production board enrichment query.
 *
 * Returns the active work orders for a business plus the latest active
 * stage assignment + latest quotation/contract refs. Pure read query; all
 * fields are constrained to what the board card renders. NO realtime, NO
 * RPC, NO writes.
 */
export interface BoardWorkOrderRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  title: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  pipeline_stage: WorkOrderPipelineStageKey;
  priority: WorkOrderPriority;
  owner_user_id: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  source_type: string | null;
  source_ref_id: string | null;
}

export interface BoardAssignmentRow {
  work_order_id: string;
  stage_key: WorkOrderPipelineStageKey;
  assigned_to_user_id: string;
  assigned_at: string;
}

export interface BoardQuotationSummary {
  work_order_id: string;
  ref_id: string | null;
  status: string;
  contract_id: string | null;
}

export interface BoardChecklistSummary {
  work_order_id: string;
  total_items: number;
  done_items: number;
  checklists_total: number;
  checklists_completed: number;
}

export interface ListWorkOrdersForBoardOptions {
  businessId: string;
  limit?: number;
}

export interface ListWorkOrdersForBoardResult {
  orders: BoardWorkOrderRow[];
  assignments: BoardAssignmentRow[];
  quotations: BoardQuotationSummary[];
  checklists: BoardChecklistSummary[];
}

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 200, 1), 500);
}

export async function listWorkOrdersForBoard(
  options: ListWorkOrdersForBoardOptions,
): Promise<{ data: ListWorkOrdersForBoardResult | null; error: unknown }> {
  const limit = clampLimit(options.limit);

  // 1) Work orders (active scope: not soft-deleted).
  const { data: woRows, error: woErr } = await supabase
    .from("work_orders")
    .select(
      "id, ref_id, business_id, title, customer_name, customer_phone, status, pipeline_stage, priority, owner_user_id, due_at, completed_at, created_at, updated_at, source_type, source_ref_id",
    )
    .eq("business_id", options.businessId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (woErr) return { data: null, error: woErr };
  const orders = (woRows ?? []) as BoardWorkOrderRow[];
  if (orders.length === 0) {
    return {
      data: { orders, assignments: [], quotations: [], checklists: [] },
      error: null,
    };
  }

  const ids = orders.map((o) => o.id);

  // 2) Latest active stage assignments per (WO, stage).
  const { data: asgRows, error: asgErr } = await supabase
    .from("work_order_stage_assignments")
    .select("work_order_id, stage_key, assigned_to_user_id, assigned_at")
    .in("work_order_id", ids)
    .is("unassigned_at", null)
    .order("assigned_at", { ascending: false });
  if (asgErr) return { data: null, error: asgErr };

  // 3) Latest quotation per WO.
  const { data: qRows, error: qErr } = await supabase
    .from("work_order_quotations")
    .select("work_order_id, ref_id, status, contract_id, created_at")
    .in("work_order_id", ids)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (qErr) return { data: null, error: qErr };

  // Reduce to most-recent quotation per WO.
  const seen = new Set<string>();
  const quotations: BoardQuotationSummary[] = [];
  for (const row of (qRows ?? []) as Array<{
    work_order_id: string;
    ref_id: string | null;
    status: string;
    contract_id: string | null;
  }>) {
    if (seen.has(row.work_order_id)) continue;
    seen.add(row.work_order_id);
    quotations.push({
      work_order_id: row.work_order_id,
      ref_id: row.ref_id,
      status: row.status,
      contract_id: row.contract_id,
    });
  }

  // 4) Checklist progress per WO.
  const { data: clRows, error: clErr } = await supabase
    .from("work_order_checklists")
    .select("id, work_order_id, status")
    .in("work_order_id", ids)
    .is("deleted_at", null);
  if (clErr) return { data: null, error: clErr };

  const checklistIds = ((clRows ?? []) as Array<{ id: string }>)
    .map((r) => r.id);

  let itemRows: Array<{ checklist_id: string; completed: boolean }> = [];
  if (checklistIds.length > 0) {
    const { data: iRows, error: iErr } = await supabase
      .from("work_order_checklist_items")
      .select("checklist_id, completed")
      .in("checklist_id", checklistIds);
    if (iErr) return { data: null, error: iErr };
    itemRows = (iRows ?? []) as typeof itemRows;
  }

  // Map checklist id → wo id
  const clToWo = new Map<string, string>();
  for (const c of (clRows ?? []) as Array<{
    id: string;
    work_order_id: string;
    status: string;
  }>) {
    clToWo.set(c.id, c.work_order_id);
  }

  const cs = new Map<string, BoardChecklistSummary>();
  for (const wo of orders) {
    cs.set(wo.id, {
      work_order_id: wo.id,
      total_items: 0,
      done_items: 0,
      checklists_total: 0,
      checklists_completed: 0,
    });
  }
  for (const c of (clRows ?? []) as Array<{
    id: string;
    work_order_id: string;
    status: string;
  }>) {
    const s = cs.get(c.work_order_id);
    if (!s) continue;
    s.checklists_total += 1;
    if (c.status === "completed") s.checklists_completed += 1;
  }
  for (const it of itemRows) {
    const woId = clToWo.get(it.checklist_id);
    if (!woId) continue;
    const s = cs.get(woId);
    if (!s) continue;
    s.total_items += 1;
    if (it.completed) s.done_items += 1;
  }

  return {
    data: {
      orders,
      assignments: (asgRows ?? []) as BoardAssignmentRow[],
      quotations,
      checklists: Array.from(cs.values()),
    },
    error: null,
  };
}