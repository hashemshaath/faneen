/**
 * BUSINESS-FINISHING-1 Phase E — Production / Procurement / Quotation analytics.
 *
 * Pure functions only. Caller is responsible for fetching rows via
 * existing service wrappers (no direct supabase access here).
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface ProductionRowInput {
  id: string;
  status: string;
  pipeline_stage: string;
  created_at: string;
  due_at: string | null;
  completed_at: string | null;
}

export interface ProductionStageDurationInput {
  work_order_id: string;
  stage_key: string;
  /** ms in this stage. Sourced from work_order_stage transitions. */
  duration_ms: number;
}

export interface ProductionMetrics {
  totalCount: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number;          // 0..1
  averageCycleTimeMs: number | null;
  averageStageDurationMs: Record<string, number>;
  bottleneckStage: string | null;
}

/** Compute production analytics from work-order rows + stage durations. */
export function computeProductionMetrics(
  rows: ReadonlyArray<ProductionRowInput>,
  stageDurations: ReadonlyArray<ProductionStageDurationInput> = [],
  now: number = Date.now(),
): ProductionMetrics {
  const totalCount = rows.length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const overdueCount = rows.filter((r) => {
    if (r.status === 'completed' || r.status === 'cancelled') return false;
    if (!r.due_at) return false;
    const t = new Date(r.due_at).getTime();
    return !Number.isNaN(t) && t < now;
  }).length;

  // Cycle time = completed_at - created_at
  const cycles: number[] = [];
  for (const r of rows) {
    if (r.status !== 'completed' || !r.completed_at) continue;
    const c = new Date(r.created_at).getTime();
    const d = new Date(r.completed_at).getTime();
    if (!Number.isNaN(c) && !Number.isNaN(d) && d >= c) cycles.push(d - c);
  }
  const averageCycleTimeMs = cycles.length
    ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
    : null;

  // Stage averages
  const stageTotals: Record<string, { sum: number; count: number }> = {};
  for (const s of stageDurations) {
    if (!stageTotals[s.stage_key]) stageTotals[s.stage_key] = { sum: 0, count: 0 };
    stageTotals[s.stage_key].sum += Math.max(0, s.duration_ms);
    stageTotals[s.stage_key].count += 1;
  }
  const averageStageDurationMs: Record<string, number> = {};
  let bottleneckStage: string | null = null;
  let bottleneckAvg = 0;
  for (const [key, agg] of Object.entries(stageTotals)) {
    const avg = Math.round(agg.sum / Math.max(1, agg.count));
    averageStageDurationMs[key] = avg;
    if (avg > bottleneckAvg) {
      bottleneckAvg = avg;
      bottleneckStage = key;
    }
  }

  const completionRate = totalCount === 0 ? 0 : completedCount / totalCount;

  return {
    totalCount,
    completedCount,
    overdueCount,
    completionRate,
    averageCycleTimeMs,
    averageStageDurationMs,
    bottleneckStage,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Procurement

export interface RfqInput {
  id: string;
  status: string;          // 'draft' | 'sent' | 'closed' | 'cancelled' | 'awarded'(award proxy)
  awarded_quote_id?: string | null;
}

export interface SupplierQuoteInput {
  rfq_id: string;
  status: string;          // 'draft' | 'submitted' | ...
}

export interface ProcurementMetrics {
  openRfqCount: number;
  awardedRfqCount: number;
  pendingSupplierQuoteCount: number;
  averageResponsesPerRfq: number;
}

export function computeProcurementMetrics(
  rfqs: ReadonlyArray<RfqInput>,
  supplierQuotes: ReadonlyArray<SupplierQuoteInput>,
): ProcurementMetrics {
  let openRfqCount = 0;
  let awardedRfqCount = 0;
  for (const r of rfqs) {
    if (r.awarded_quote_id || r.status === 'awarded') awardedRfqCount += 1;
    else if (r.status === 'sent' || r.status === 'draft') openRfqCount += 1;
  }
  const pendingSupplierQuoteCount = supplierQuotes.filter(
    (q) => q.status === 'draft' || q.status === 'submitted',
  ).length;

  const responsesPerRfq = new Map<string, number>();
  for (const q of supplierQuotes) {
    if (q.status === 'draft') continue;
    responsesPerRfq.set(q.rfq_id, (responsesPerRfq.get(q.rfq_id) ?? 0) + 1);
  }
  const averageResponsesPerRfq = rfqs.length === 0
    ? 0
    : Array.from(responsesPerRfq.values()).reduce((a, b) => a + b, 0) / rfqs.length;

  return {
    openRfqCount,
    awardedRfqCount,
    pendingSupplierQuoteCount,
    averageResponsesPerRfq,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Quotations

export interface QuotationAnalyticsInput {
  status: string;
  expires_at: string | null;
}

export interface QuotationMetrics {
  total: number;
  approvalRate: number;
  rejectionRate: number;
  expiryRate: number;
}

export function computeQuotationMetrics(
  quotations: ReadonlyArray<QuotationAnalyticsInput>,
  now: number = Date.now(),
): QuotationMetrics {
  const total = quotations.length;
  if (total === 0) {
    return { total: 0, approvalRate: 0, rejectionRate: 0, expiryRate: 0 };
  }
  let approved = 0;
  let rejected = 0;
  let expired = 0;
  for (const q of quotations) {
    if (q.status === 'approved' || q.status === 'accepted') {
      approved += 1;
      continue;
    }
    if (q.status === 'rejected') {
      rejected += 1;
      continue;
    }
    if (q.expires_at) {
      const t = new Date(q.expires_at).getTime();
      if (!Number.isNaN(t) && t < now && q.status !== 'approved' && q.status !== 'accepted') {
        expired += 1;
      }
    }
  }
  return {
    total,
    approvalRate: approved / total,
    rejectionRate: rejected / total,
    expiryRate: expired / total,
  };
}