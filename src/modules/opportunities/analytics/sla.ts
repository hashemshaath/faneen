/**
 * OPPORTUNITIES PHASE 10 — SLA computation (pure, read-only).
 *
 * Thresholds live as constants here (no DB settings table in this phase).
 * All inputs are derived from existing analytics rows; nothing is fetched
 * or mutated. Used by the admin operations center only.
 */
import type { OpportunityOpsRow } from './types';

export const SLA_THRESHOLDS_HOURS = {
  needs_assignment_after_hours: 24,
  awaiting_bids_after_hours: 48,
  awaiting_award_after_hours: 72,
  awaiting_contract_after_hours: 48,
} as const;

export type SlaStatus = 'on_time' | 'at_risk' | 'breached' | 'completed';

export interface OpportunitySlaMetrics {
  time_to_first_assignment_h: number | null;
  time_to_first_bid_h: number | null;
  time_to_award_h: number | null;
  time_to_contract_h: number | null;
  idle_time_since_last_action_h: number;
  status: SlaStatus;
  threshold_h: number | null;
  stage_label: string;
}

export interface OpportunitySlaAggregate {
  avg_time_to_first_bid_h: number | null;
  avg_time_to_award_h: number | null;
  avg_time_to_contract_after_award_h: number | null;
  breached_count: number;
  no_assignment_after_threshold: number;
  no_bids_after_threshold: number;
  awarded_without_contract_after_threshold: number;
}

const MS_PER_HOUR = 1000 * 60 * 60;

function diffHours(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const a = Date.parse(later);
  const b = Date.parse(earlier);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, (a - b) / MS_PER_HOUR);
}

function lastActionTs(row: OpportunityOpsRow): string {
  return (
    row.contract_created_at ??
    row.awarded_at ??
    row.first_bid_at ??
    row.first_assigned_at ??
    row.updated_at ??
    row.created_at
  );
}

export function computeOpportunitySla(
  row: OpportunityOpsRow,
  now: Date = new Date(),
): OpportunitySlaMetrics {
  const nowIso = now.toISOString();
  const time_to_first_assignment_h = diffHours(row.first_assigned_at, row.created_at);
  const time_to_first_bid_h = diffHours(row.first_bid_at, row.created_at);
  const time_to_award_h = diffHours(row.awarded_at, row.created_at);
  const time_to_contract_h = diffHours(row.contract_created_at, row.awarded_at);
  const idle_time_since_last_action_h = diffHours(nowIso, lastActionTs(row)) ?? 0;

  let status: SlaStatus = 'on_time';
  let threshold_h: number | null = null;
  let stage_label = '';

  if (row.flag === 'cancelled' || row.flag === 'operationally_complete') {
    status = 'completed';
    stage_label = row.flag === 'cancelled' ? 'ملغاة' : 'مكتملة';
    return {
      time_to_first_assignment_h,
      time_to_first_bid_h,
      time_to_award_h,
      time_to_contract_h,
      idle_time_since_last_action_h,
      status,
      threshold_h,
      stage_label,
    };
  }

  if (row.flag === 'needs_matching') {
    threshold_h = SLA_THRESHOLDS_HOURS.needs_assignment_after_hours;
    stage_label = 'بانتظار إسناد';
  } else if (row.flag === 'awaiting_bids') {
    threshold_h = SLA_THRESHOLDS_HOURS.awaiting_bids_after_hours;
    stage_label = 'بانتظار عروض';
  } else if (row.flag === 'awaiting_award') {
    threshold_h = SLA_THRESHOLDS_HOURS.awaiting_award_after_hours;
    stage_label = 'بانتظار تعميد';
  } else if (row.flag === 'awaiting_contract') {
    threshold_h = SLA_THRESHOLDS_HOURS.awaiting_contract_after_hours;
    stage_label = 'بانتظار عقد';
  }

  if (threshold_h !== null) {
    if (idle_time_since_last_action_h >= threshold_h) status = 'breached';
    else if (idle_time_since_last_action_h >= threshold_h * 0.8) status = 'at_risk';
    else status = 'on_time';
  }

  return {
    time_to_first_assignment_h,
    time_to_first_bid_h,
    time_to_award_h,
    time_to_contract_h,
    idle_time_since_last_action_h,
    status,
    threshold_h,
    stage_label,
  };
}

function avg(values: Array<number | null>): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number');
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function aggregateOpportunitySla(
  rows: OpportunityOpsRow[],
  now: Date = new Date(),
): OpportunitySlaAggregate {
  const metrics = rows.map((r) => ({ row: r, sla: computeOpportunitySla(r, now) }));
  return {
    avg_time_to_first_bid_h: avg(metrics.map((m) => m.sla.time_to_first_bid_h)),
    avg_time_to_award_h: avg(metrics.map((m) => m.sla.time_to_award_h)),
    avg_time_to_contract_after_award_h: avg(metrics.map((m) => m.sla.time_to_contract_h)),
    breached_count: metrics.filter((m) => m.sla.status === 'breached').length,
    no_assignment_after_threshold: metrics.filter(
      (m) => m.row.flag === 'needs_matching' && m.sla.status === 'breached',
    ).length,
    no_bids_after_threshold: metrics.filter(
      (m) => m.row.flag === 'awaiting_bids' && m.sla.status === 'breached',
    ).length,
    awarded_without_contract_after_threshold: metrics.filter(
      (m) => m.row.flag === 'awaiting_contract' && m.sla.status === 'breached',
    ).length,
  };
}