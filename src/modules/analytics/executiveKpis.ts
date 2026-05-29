/**
 * COMMERCIAL-LAUNCH-FINAL-1 Part B — Executive KPI helpers.
 *
 * Pure functions for revenue pipeline and cycle-time analytics.
 * No I/O. Inputs are minimal projections so callers can pass
 * already-fetched rows from React Query.
 */

export interface ContractLite {
  id: string;
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  activated_at?: string | null;
}

export interface QuotationLite {
  id: string;
  status?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
}

export interface WorkOrderCycleLite {
  id: string;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface AppointmentCycleLite {
  id: string;
  status?: string | null;
  scheduled_at?: string | null;
  confirmed_at?: string | null;
}

export interface RevenuePipeline {
  openQuotations: number;
  approvedQuotations: number;
  draftContracts: number;
  activeContracts: number;
}

export interface CycleTimes {
  /** Average days from quotation creation to approval. 0 when no data. */
  avgQuotationApprovalDays: number;
  /** Average days from quotation approval to contract activation. */
  avgContractConversionDays: number;
  /** Average days from work order creation to completion. */
  avgWorkOrderCompletionDays: number;
  /** Average days from installation schedule to customer confirmation. */
  avgInstallationConfirmationDays: number;
}

const MS_PER_DAY = 24 * 3600 * 1000;

function avgDays(deltas: number[]): number {
  if (deltas.length === 0) return 0;
  const total = deltas.reduce((s, n) => s + n, 0);
  return Math.round((total / deltas.length / MS_PER_DAY) * 10) / 10;
}

function diffMs(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  if (tb < ta) return null;
  return tb - ta;
}

const OPEN_QUOTATION_STATUSES = new Set(['draft', 'sent', 'submitted', 'open', 'pending']);
const APPROVED_QUOTATION_STATUSES = new Set(['approved', 'accepted', 'won']);
const DRAFT_CONTRACT_STATUSES = new Set(['draft', 'pending', 'pending_signature']);
const ACTIVE_CONTRACT_STATUSES = new Set(['active', 'in_progress']);

export function computeRevenuePipeline(input: {
  contracts: ContractLite[];
  quotations: QuotationLite[];
}): RevenuePipeline {
  let openQuotations = 0;
  let approvedQuotations = 0;
  for (const q of input.quotations) {
    const s = (q.status ?? '').toLowerCase();
    if (OPEN_QUOTATION_STATUSES.has(s)) openQuotations++;
    else if (APPROVED_QUOTATION_STATUSES.has(s)) approvedQuotations++;
  }
  let draftContracts = 0;
  let activeContracts = 0;
  for (const c of input.contracts) {
    const s = (c.status ?? '').toLowerCase();
    if (DRAFT_CONTRACT_STATUSES.has(s)) draftContracts++;
    else if (ACTIVE_CONTRACT_STATUSES.has(s)) activeContracts++;
  }
  return { openQuotations, approvedQuotations, draftContracts, activeContracts };
}

export function computeCycleTimes(input: {
  contracts: ContractLite[];
  quotations: QuotationLite[];
  workOrders: WorkOrderCycleLite[];
  appointments: AppointmentCycleLite[];
}): CycleTimes {
  const qDeltas: number[] = [];
  for (const q of input.quotations) {
    const d = diffMs(q.created_at, q.approved_at);
    if (d !== null) qDeltas.push(d);
  }
  const cDeltas: number[] = [];
  for (const c of input.contracts) {
    const d = diffMs(c.created_at, c.activated_at ?? c.start_date);
    if (d !== null) cDeltas.push(d);
  }
  const woDeltas: number[] = [];
  for (const w of input.workOrders) {
    if (w.status !== 'completed') continue;
    const d = diffMs(w.created_at, w.completed_at);
    if (d !== null) woDeltas.push(d);
  }
  const apDeltas: number[] = [];
  for (const a of input.appointments) {
    const d = diffMs(a.scheduled_at, a.confirmed_at);
    if (d !== null) apDeltas.push(d);
  }
  return {
    avgQuotationApprovalDays: avgDays(qDeltas),
    avgContractConversionDays: avgDays(cDeltas),
    avgWorkOrderCompletionDays: avgDays(woDeltas),
    avgInstallationConfirmationDays: avgDays(apDeltas),
  };
}