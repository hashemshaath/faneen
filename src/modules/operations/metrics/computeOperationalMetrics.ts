import type { WorkOrderRow } from '@/modules/workOrders';
import type { BusinessActivityEvent } from '@/modules/businesses/notes';

/**
 * BUSINESS-OPS-METRICS-1 — Pure operational metrics aggregator.
 *
 * Computes a sanitized, read-only metrics object over data the caller
 * already loaded via admin/business-safe wrappers. No I/O, no side
 * effects, no PII. Safe to call inside `useMemo`.
 *
 * Inputs are the same shapes the Operations Console already receives:
 *   - WorkOrderRow[]  from listAdminWorkOrders / business work order wrappers
 *   - BusinessActivityEvent[] from listAdminOperationalActivity / timeline
 *   - AdminOpenNote[]  thin shape derived from listAdminOperationalNotes
 *
 * Metrics are *current-window* (limited by upstream `limit` — typically
 * 200 rows). Document this in the UI; treat them as directional, not as
 * a warehouse aggregate.
 */

export interface OperationalMetricsOpenNote {
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'resolved';
  created_at: string;
}

export interface OperationalWorkOrderMetrics {
  open: number;
  completed: number;
  overdue: number;
  highPriority: number;   // high + urgent
  urgent: number;
  unassignedOpen: number; // open WOs with no owner_user_id
  completedRecent: number; // = completed (within current window)
  avgOpenAgeMs: number | null;
  avgCycleTimeMs: number | null;
}

export interface OperationalLeadQuoteMetrics {
  newLeads: number;
  leadStatusChanged: number;
  quoteResponded: number;
  leadToWorkOrder: number;
  quoteToWorkOrder: number;
}

export interface OperationalContractMetrics {
  created: number;
  statusChanged: number;
  signed: number;
  contractToWorkOrder: number;
}

export interface OperationalBookingMetrics {
  created: number;
  statusChanged: number;
  bookingToWorkOrder: number;
}

export interface OperationalAdminSupportMetrics {
  openNotes: number;
  criticalNotes: number;
  staleOpenNotes: number; // open AND older than 7 days
}

export interface OperationalMetrics {
  workOrders: OperationalWorkOrderMetrics;
  leadsQuotes: OperationalLeadQuoteMetrics;
  contracts: OperationalContractMetrics;
  bookings: OperationalBookingMetrics;
  adminSupport: OperationalAdminSupportMetrics;
  activity: { totalEvents: number };
  /** Window cap inferred from inputs — used by UI for "approximate" hint. */
  windowSize: number;
}

export interface ComputeOperationalMetricsInput {
  workOrders?: ReadonlyArray<WorkOrderRow>;
  activityEvents?: ReadonlyArray<BusinessActivityEvent>;
  adminNotes?: ReadonlyArray<OperationalMetricsOpenNote>;
  now?: number;
}

const OPEN_STATUSES = new Set(['draft', 'active', 'on_hold']);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return Math.round(sum / values.length);
}

function countAction(
  events: ReadonlyArray<BusinessActivityEvent>,
  predicate: (action: string) => boolean,
): number {
  let n = 0;
  for (const ev of events) if (predicate(ev.action)) n += 1;
  return n;
}

/** Conversion suffix used across the Connected Operations Graph. */
const CONVERTED_SUFFIX = '.converted_to_work_order';

export function computeOperationalMetrics(
  input: ComputeOperationalMetricsInput,
): OperationalMetrics {
  const now = input.now ?? Date.now();
  const workOrders = input.workOrders ?? [];
  const events = input.activityEvents ?? [];
  const notes = input.adminNotes ?? [];

  // ───────── Work Orders ─────────
  let open = 0;
  let completed = 0;
  let overdue = 0;
  let high = 0;
  let urgent = 0;
  let unassignedOpen = 0;
  const openAges: number[] = [];
  const cycleTimes: number[] = [];

  for (const r of workOrders) {
    const status = (r.status ?? '') as string;
    const isOpen = OPEN_STATUSES.has(status);
    if (isOpen) open += 1;
    if (status === 'completed') completed += 1;

    const priority = (r.priority ?? 'medium') as string;
    if (priority === 'urgent') { urgent += 1; high += 1; }
    else if (priority === 'high') { high += 1; }

    if (isOpen && !r.owner_user_id) unassignedOpen += 1;

    if (r.due_at && isOpen) {
      const due = new Date(r.due_at).getTime();
      if (Number.isFinite(due) && due < now) overdue += 1;
    }

    if (isOpen && r.created_at) {
      const t = new Date(r.created_at).getTime();
      if (Number.isFinite(t)) openAges.push(Math.max(0, now - t));
    }

    if (status === 'completed' && r.completed_at && r.created_at) {
      const c = new Date(r.created_at).getTime();
      const d = new Date(r.completed_at).getTime();
      if (Number.isFinite(c) && Number.isFinite(d) && d >= c) {
        cycleTimes.push(d - c);
      }
    }
  }

  // ───────── Activity-driven counts ─────────
  const leadToWo = countAction(events, (a) => a === `lead${CONVERTED_SUFFIX}`);
  const quoteToWo = countAction(events, (a) => a === `quote${CONVERTED_SUFFIX}`);
  const contractToWo = countAction(events, (a) => a === `contract${CONVERTED_SUFFIX}`);
  const bookingToWo = countAction(events, (a) => a === `booking${CONVERTED_SUFFIX}`);

  const newLeads = countAction(events, (a) => a === 'lead.created');
  const leadStatusChanged = countAction(events, (a) => a === 'lead.status_changed');
  const quoteResponded = countAction(
    events,
    (a) => a === 'quote.responded' || a === 'quote.response_submitted',
  );

  const contractsCreated = countAction(events, (a) => a === 'contract.created');
  const contractStatusChanged = countAction(events, (a) => a === 'contract.status_changed');
  const contractsSigned = countAction(
    events,
    (a) => a === 'contract.signed' || a === 'contract.activated',
  );

  const bookingsCreated = countAction(events, (a) => a === 'booking.created');
  const bookingStatusChanged = countAction(events, (a) => a === 'booking.status_changed');

  // ───────── Admin support ─────────
  let openNotes = 0;
  let criticalNotes = 0;
  let staleOpenNotes = 0;
  for (const n of notes) {
    if (n.status !== 'open') continue;
    openNotes += 1;
    if (n.severity === 'critical') criticalNotes += 1;
    const t = new Date(n.created_at).getTime();
    if (Number.isFinite(t) && now - t >= SEVEN_DAYS_MS) staleOpenNotes += 1;
  }

  return {
    workOrders: {
      open,
      completed,
      overdue,
      highPriority: high,
      urgent,
      unassignedOpen,
      completedRecent: completed,
      avgOpenAgeMs: avg(openAges),
      avgCycleTimeMs: avg(cycleTimes),
    },
    leadsQuotes: {
      newLeads,
      leadStatusChanged,
      quoteResponded,
      leadToWorkOrder: leadToWo,
      quoteToWorkOrder: quoteToWo,
    },
    contracts: {
      created: contractsCreated,
      statusChanged: contractStatusChanged,
      signed: contractsSigned,
      contractToWorkOrder: contractToWo,
    },
    bookings: {
      created: bookingsCreated,
      statusChanged: bookingStatusChanged,
      bookingToWorkOrder: bookingToWo,
    },
    adminSupport: { openNotes, criticalNotes, staleOpenNotes },
    activity: { totalEvents: events.length },
    windowSize: Math.max(workOrders.length, events.length, notes.length),
  };
}

/** Format a duration in ms as a compact bilingual-ready human string. */
export function formatDurationShort(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  const days = Math.round(hr / 24);
  return `${days}d`;
}