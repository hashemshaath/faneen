/**
 * OPPORTUNITIES PHASE 10 — CSV export of admin operations rows.
 *
 * Pure transformation: takes already-fetched `OpportunityOpsRow`s and
 * produces a CSV string. No DB calls, no service_role, no network egress.
 * Admin-only consumption is enforced by the page that calls it.
 */
import type { OpportunityOpsRow } from './types';
import { computeOpportunitySla } from './sla';

export const OPPORTUNITY_EXPORT_LIMIT = 5000;

export const OPPORTUNITY_EXPORT_COLUMNS = [
  'ref_id',
  'created_at',
  'customer_name',
  'city',
  'district',
  'sector',
  'status',
  'assigned_count',
  'bid_count',
  'awarded',
  'has_contract',
  'first_assigned_at',
  'first_bid_at',
  'awarded_at',
  'contract_created_at',
  'flag',
  'time_to_first_bid_h',
  'time_to_award_h',
  'time_to_contract_h',
  'sla_status',
] as const;

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function round1(n: number | null): string {
  if (n === null) return '';
  return (Math.round(n * 10) / 10).toString();
}

export function buildOpportunityReportCsv(
  rows: OpportunityOpsRow[],
  now: Date = new Date(),
): string {
  const capped = rows.slice(0, OPPORTUNITY_EXPORT_LIMIT);
  const header = OPPORTUNITY_EXPORT_COLUMNS.join(',');
  const body = capped.map((r) => {
    const sla = computeOpportunitySla(r, now);
    const cells: Record<(typeof OPPORTUNITY_EXPORT_COLUMNS)[number], string> = {
      ref_id: escapeCsv(r.ref_id ?? r.id),
      created_at: escapeCsv(r.created_at),
      customer_name: escapeCsv(r.customer_name),
      city: escapeCsv(r.city),
      district: escapeCsv(r.district),
      sector: escapeCsv(r.sector),
      status: escapeCsv(r.status),
      assigned_count: escapeCsv(r.assigned_count),
      bid_count: escapeCsv(r.bid_count),
      awarded: escapeCsv(r.award_status === 'awarded' ? 'yes' : 'no'),
      has_contract: escapeCsv(r.contract_id ? 'yes' : 'no'),
      first_assigned_at: escapeCsv(r.first_assigned_at),
      first_bid_at: escapeCsv(r.first_bid_at),
      awarded_at: escapeCsv(r.awarded_at),
      contract_created_at: escapeCsv(r.contract_created_at),
      flag: escapeCsv(r.flag),
      time_to_first_bid_h: escapeCsv(round1(sla.time_to_first_bid_h)),
      time_to_award_h: escapeCsv(round1(sla.time_to_award_h)),
      time_to_contract_h: escapeCsv(round1(sla.time_to_contract_h)),
      sla_status: escapeCsv(sla.status),
    };
    return OPPORTUNITY_EXPORT_COLUMNS.map((c) => cells[c]).join(',');
  });
  // UTF-8 BOM so Excel opens Arabic correctly.
  return '\uFEFF' + [header, ...body].join('\n');
}

export function buildOpportunityReportFilename(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `opportunities-report-${iso}.csv`;
}