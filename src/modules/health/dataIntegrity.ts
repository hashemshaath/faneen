/**
 * PRODUCTION-RELEASE-READINESS-2 Phase C — Data Integrity Center.
 *
 * Pure diagnostics helpers. Detect cross-entity inconsistencies across the
 * customer + provider lifecycle (contracts → work orders → closure → warranty,
 * RFQs → POs, appointments, customer tracking links).
 *
 * Contract:
 *  - Pure functions. No Supabase calls. No I/O. No mutations.
 *  - Input shapes are the minimum projection each check needs — callers can
 *    pass already-fetched lists from React Query without remapping.
 *  - Output is a deterministic { id, ref, reason } row list per check so the
 *    Operations Center can render them as a read-only diagnostics table.
 */

export type IntegrityKey =
  | 'contracts_without_work_orders'
  | 'quotations_without_customer'
  | 'work_orders_without_due_date'
  | 'work_orders_without_pipeline_stage'
  | 'completed_work_orders_without_closure'
  | 'closures_without_warranty'
  | 'installation_without_confirmation'
  | 'rfqs_without_suppliers'
  | 'rfqs_without_quotes'
  | 'awarded_rfqs_without_po'
  | 'expired_warranties'
  | 'customer_tracking_without_project';

export interface IntegrityFinding {
  /** Stable internal id (UUID). UI must NOT render this directly. */
  id: string;
  /** Human-readable ref_id (e.g. WO-1000042). Empty string when unavailable. */
  ref: string;
  /** Single-key reason — UI maps to bilingual copy. */
  reason: IntegrityKey;
}

export interface IntegritySummary {
  key: IntegrityKey;
  count: number;
  /** Tone hint for the OC chip: red = blocking, amber = warning, slate = info. */
  tone: 'red' | 'amber' | 'slate';
}

const TONE: Record<IntegrityKey, IntegritySummary['tone']> = {
  contracts_without_work_orders: 'amber',
  quotations_without_customer: 'red',
  work_orders_without_due_date: 'amber',
  work_orders_without_pipeline_stage: 'amber',
  completed_work_orders_without_closure: 'red',
  closures_without_warranty: 'amber',
  installation_without_confirmation: 'amber',
  rfqs_without_suppliers: 'amber',
  rfqs_without_quotes: 'slate',
  awarded_rfqs_without_po: 'red',
  expired_warranties: 'slate',
  customer_tracking_without_project: 'red',
};

// ─── Minimal input shapes ──────────────────────────────────────────────

export interface ContractLite { id: string; ref_id?: string | null; status?: string | null }
export interface WorkOrderLite {
  id: string;
  ref_id?: string | null;
  contract_id?: string | null;
  due_at?: string | null;
  pipeline_stage?: string | null;
  status?: string | null;
}
export interface QuotationLite { id: string; ref_id?: string | null; customer_id?: string | null }
export interface ClosureLite { id: string; ref_id?: string | null; work_order_id: string; status?: string | null }
export interface WarrantyLite {
  id: string;
  ref_id?: string | null;
  work_order_id: string;
  status?: string | null;
  expires_at?: string | null;
}
export interface AppointmentLite {
  id: string;
  ref_id?: string | null;
  work_order_id?: string | null;
  status?: string | null;
}
export interface RfqLite { id: string; ref_id?: string | null; status?: string | null }
export interface RfqSupplierLite { rfq_id: string }
export interface RfqQuoteLite { rfq_id: string }
export interface PoLite { id: string; ref_id?: string | null; rfq_id?: string | null }
export interface CustomerTrackingLinkLite {
  id: string;
  ref_id?: string | null;
  work_order_id?: string | null;
  project_id?: string | null;
}

export interface DataIntegrityInput {
  contracts: ContractLite[];
  workOrders: WorkOrderLite[];
  quotations: QuotationLite[];
  closures: ClosureLite[];
  warranties: WarrantyLite[];
  appointments: AppointmentLite[];
  rfqs: RfqLite[];
  rfqSuppliers: RfqSupplierLite[];
  rfqQuotes: RfqQuoteLite[];
  purchaseOrders: PoLite[];
  trackingLinks: CustomerTrackingLinkLite[];
  now?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const finding = (
  id: string,
  ref: string | null | undefined,
  reason: IntegrityKey,
): IntegrityFinding => ({ id, ref: ref ?? '', reason });

const toSet = <T>(rows: readonly T[], key: keyof T): Set<string> => {
  const s = new Set<string>();
  for (const r of rows) {
    const v = r[key] as unknown;
    if (typeof v === 'string' && v.length > 0) s.add(v);
  }
  return s;
};

// ─── Individual checks (pure) ────────────────────────────────────────

export function contractsWithoutWorkOrders(input: DataIntegrityInput): IntegrityFinding[] {
  const withWo = toSet(input.workOrders, 'contract_id');
  return input.contracts
    .filter((c) => c.status === 'active' && !withWo.has(c.id))
    .map((c) => finding(c.id, c.ref_id, 'contracts_without_work_orders'));
}

export function quotationsWithoutCustomer(input: DataIntegrityInput): IntegrityFinding[] {
  return input.quotations
    .filter((q) => !q.customer_id)
    .map((q) => finding(q.id, q.ref_id, 'quotations_without_customer'));
}

export function workOrdersWithoutDueDate(input: DataIntegrityInput): IntegrityFinding[] {
  return input.workOrders
    .filter((w) => w.status !== 'completed' && w.status !== 'cancelled' && !w.due_at)
    .map((w) => finding(w.id, w.ref_id, 'work_orders_without_due_date'));
}

export function workOrdersWithoutPipelineStage(input: DataIntegrityInput): IntegrityFinding[] {
  return input.workOrders
    .filter((w) => w.status !== 'completed' && w.status !== 'cancelled' && !w.pipeline_stage)
    .map((w) => finding(w.id, w.ref_id, 'work_orders_without_pipeline_stage'));
}

export function completedWorkOrdersWithoutClosure(input: DataIntegrityInput): IntegrityFinding[] {
  const closed = toSet(input.closures, 'work_order_id');
  return input.workOrders
    .filter((w) => w.status === 'completed' && !closed.has(w.id))
    .map((w) => finding(w.id, w.ref_id, 'completed_work_orders_without_closure'));
}

export function closuresWithoutWarranty(input: DataIntegrityInput): IntegrityFinding[] {
  const withWarranty = toSet(input.warranties, 'work_order_id');
  return input.closures
    .filter((c) => c.status === 'confirmed' && !withWarranty.has(c.work_order_id))
    .map((c) => finding(c.id, c.ref_id, 'closures_without_warranty'));
}

export function installationWithoutConfirmation(input: DataIntegrityInput): IntegrityFinding[] {
  return input.appointments
    .filter((a) => a.status === 'scheduled')
    .map((a) => finding(a.id, a.ref_id, 'installation_without_confirmation'));
}

export function rfqsWithoutSuppliers(input: DataIntegrityInput): IntegrityFinding[] {
  const withSup = toSet(input.rfqSuppliers, 'rfq_id');
  return input.rfqs
    .filter((r) => r.status === 'open' && !withSup.has(r.id))
    .map((r) => finding(r.id, r.ref_id, 'rfqs_without_suppliers'));
}

export function rfqsWithoutQuotes(input: DataIntegrityInput): IntegrityFinding[] {
  const withQ = toSet(input.rfqQuotes, 'rfq_id');
  return input.rfqs
    .filter((r) => r.status === 'open' && !withQ.has(r.id))
    .map((r) => finding(r.id, r.ref_id, 'rfqs_without_quotes'));
}

export function awardedRfqsWithoutPo(input: DataIntegrityInput): IntegrityFinding[] {
  const poRfqs = toSet(input.purchaseOrders, 'rfq_id');
  return input.rfqs
    .filter((r) => r.status === 'awarded' && !poRfqs.has(r.id))
    .map((r) => finding(r.id, r.ref_id, 'awarded_rfqs_without_po'));
}

export function expiredWarranties(input: DataIntegrityInput): IntegrityFinding[] {
  const now = input.now ?? Date.now();
  return input.warranties
    .filter((w) => {
      if (w.status !== 'active') return false;
      if (!w.expires_at) return false;
      const t = new Date(w.expires_at).getTime();
      return Number.isFinite(t) && t < now;
    })
    .map((w) => finding(w.id, w.ref_id, 'expired_warranties'));
}

export function customerTrackingWithoutProject(input: DataIntegrityInput): IntegrityFinding[] {
  return input.trackingLinks
    .filter((l) => !l.work_order_id && !l.project_id)
    .map((l) => finding(l.id, l.ref_id, 'customer_tracking_without_project'));
}

// ─── Aggregator ──────────────────────────────────────────────────────

export interface DataIntegrityReport {
  findings: Record<IntegrityKey, IntegrityFinding[]>;
  summary: IntegritySummary[];
  totalIssues: number;
  generatedAt: string;
}

const CHECKS: Array<{ key: IntegrityKey; run: (i: DataIntegrityInput) => IntegrityFinding[] }> = [
  { key: 'contracts_without_work_orders', run: contractsWithoutWorkOrders },
  { key: 'quotations_without_customer', run: quotationsWithoutCustomer },
  { key: 'work_orders_without_due_date', run: workOrdersWithoutDueDate },
  { key: 'work_orders_without_pipeline_stage', run: workOrdersWithoutPipelineStage },
  { key: 'completed_work_orders_without_closure', run: completedWorkOrdersWithoutClosure },
  { key: 'closures_without_warranty', run: closuresWithoutWarranty },
  { key: 'installation_without_confirmation', run: installationWithoutConfirmation },
  { key: 'rfqs_without_suppliers', run: rfqsWithoutSuppliers },
  { key: 'rfqs_without_quotes', run: rfqsWithoutQuotes },
  { key: 'awarded_rfqs_without_po', run: awardedRfqsWithoutPo },
  { key: 'expired_warranties', run: expiredWarranties },
  { key: 'customer_tracking_without_project', run: customerTrackingWithoutProject },
];

export function runDataIntegrityChecks(input: DataIntegrityInput): DataIntegrityReport {
  const findings = {} as Record<IntegrityKey, IntegrityFinding[]>;
  const summary: IntegritySummary[] = [];
  let totalIssues = 0;
  for (const c of CHECKS) {
    const rows = c.run(input);
    findings[c.key] = rows;
    summary.push({ key: c.key, count: rows.length, tone: TONE[c.key] });
    totalIssues += rows.length;
  }
  const now = input.now ?? Date.now();
  return { findings, summary, totalIssues, generatedAt: new Date(now).toISOString() };
}

/** Bilingual labels for the OC UI. */
export const INTEGRITY_LABELS: Record<IntegrityKey, { ar: string; en: string }> = {
  contracts_without_work_orders: { ar: 'عقود نشطة بدون أوامر عمل', en: 'Active contracts without work orders' },
  quotations_without_customer: { ar: 'عروض أسعار بدون عميل مرتبط', en: 'Quotations missing a linked customer' },
  work_orders_without_due_date: { ar: 'أوامر عمل بدون تاريخ استحقاق', en: 'Open work orders missing a due date' },
  work_orders_without_pipeline_stage: { ar: 'أوامر عمل بدون مرحلة إنتاج', en: 'Open work orders missing a pipeline stage' },
  completed_work_orders_without_closure: { ar: 'أوامر عمل مكتملة بدون إغلاق مشروع', en: 'Completed work orders missing a closure record' },
  closures_without_warranty: { ar: 'مشاريع مغلقة بدون ضمان', en: 'Confirmed closures without an active warranty' },
  installation_without_confirmation: { ar: 'مواعيد تركيب بانتظار تأكيد العميل', en: 'Scheduled installations awaiting customer confirmation' },
  rfqs_without_suppliers: { ar: 'طلبات تسعير بدون موردين', en: 'Open RFQs with no suppliers attached' },
  rfqs_without_quotes: { ar: 'طلبات تسعير بدون أي عروض', en: 'Open RFQs with no supplier quotes yet' },
  awarded_rfqs_without_po: { ar: 'طلبات تسعير مرسّاة بدون أمر شراء', en: 'Awarded RFQs missing a purchase order' },
  expired_warranties: { ar: 'ضمانات منتهية لم تُغلق', en: 'Active warranties past their expiry date' },
  customer_tracking_without_project: { ar: 'روابط تتبّع عميل بدون مشروع', en: 'Customer tracking links not linked to a project' },
};