/**
 * BUSINESS-FINISHING-2A — Pure diagnostic helpers.
 *
 * Compute simple, derivable operational gaps from already-loaded rows.
 * No Supabase, no React, no side effects. UI consumes via small cards.
 *
 * Scope guards: no inventory / payments / warehouse / supplier-portal /
 * realtime references. These helpers operate on shapes already exposed
 * by canonical module services.
 */

// ──────────────────────────────────────────────────────────────────────
// Work Order diagnostics

export interface WorkOrderDiagInput {
  id: string;
  status: string;
  owner_user_id: string | null;
  due_at: string | null;
  has_checklist?: boolean | null;
}

export interface WorkOrderDiagnostics {
  missingAssignee: number;
  missingDueDate: number;
  missingChecklist: number;
  overdue: number;
}

export function computeWorkOrderDiagnostics(
  rows: ReadonlyArray<WorkOrderDiagInput>,
  now: number = Date.now(),
): WorkOrderDiagnostics {
  let missingAssignee = 0;
  let missingDueDate = 0;
  let missingChecklist = 0;
  let overdue = 0;
  for (const r of rows) {
    const closed = r.status === 'completed' || r.status === 'cancelled';
    if (closed) continue;
    if (!r.owner_user_id) missingAssignee += 1;
    if (!r.due_at) missingDueDate += 1;
    if (r.has_checklist === false) missingChecklist += 1;
    if (r.due_at) {
      const t = new Date(r.due_at).getTime();
      if (!Number.isNaN(t) && t < now) overdue += 1;
    }
  }
  return { missingAssignee, missingDueDate, missingChecklist, overdue };
}

// ──────────────────────────────────────────────────────────────────────
// Procurement diagnostics

export interface ProcurementDiagInput {
  rfq_id: string;
  status: string;
  awarded_quote_id: string | null;
  supplier_quote_count: number;
  po_count: number;
}

export interface ProcurementDiagnostics {
  rfqWithoutSupplierQuote: number;
  awardedWithoutPo: number;
}

export function computeProcurementDiagnostics(
  rows: ReadonlyArray<ProcurementDiagInput>,
): ProcurementDiagnostics {
  let rfqWithoutSupplierQuote = 0;
  let awardedWithoutPo = 0;
  for (const r of rows) {
    const isOpen = r.status === 'sent' || r.status === 'open';
    if (isOpen && r.supplier_quote_count === 0) rfqWithoutSupplierQuote += 1;
    if ((r.awarded_quote_id || r.status === 'awarded') && r.po_count === 0) {
      awardedWithoutPo += 1;
    }
  }
  return { rfqWithoutSupplierQuote, awardedWithoutPo };
}

// ──────────────────────────────────────────────────────────────────────
// Contract diagnostics

export interface ContractDiagInput {
  id: string;
  status: string;
  created_at: string;
  work_order_id?: string | null;
}

export interface ContractDiagnostics {
  draftOlderThanThreshold: number;
  contractWithoutWorkOrder: number;
}

const DRAFT_AGE_DAYS_DEFAULT = 14;

export function computeContractDiagnostics(
  rows: ReadonlyArray<ContractDiagInput>,
  now: number = Date.now(),
  draftAgeDays: number = DRAFT_AGE_DAYS_DEFAULT,
): ContractDiagnostics {
  const cutoff = now - draftAgeDays * 86_400_000;
  let draftOlderThanThreshold = 0;
  let contractWithoutWorkOrder = 0;
  for (const r of rows) {
    if (r.status === 'draft' || r.status === 'pending_approval') {
      const t = new Date(r.created_at).getTime();
      if (!Number.isNaN(t) && t < cutoff) draftOlderThanThreshold += 1;
    }
    const active = r.status === 'active' || r.status === 'in_progress';
    if (active && !r.work_order_id) contractWithoutWorkOrder += 1;
  }
  return { draftOlderThanThreshold, contractWithoutWorkOrder };
}
