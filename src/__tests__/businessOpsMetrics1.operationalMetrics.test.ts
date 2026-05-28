import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeOperationalMetrics,
  formatDurationShort,
} from '@/modules/operations/metrics/computeOperationalMetrics';
import type { WorkOrderRow } from '@/modules/workOrders';
import type { BusinessActivityEvent } from '@/modules/businesses/notes';

const NOW = new Date('2026-05-28T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

function wo(partial: Partial<WorkOrderRow>): WorkOrderRow {
  return {
    id: partial.id ?? 'uuid-' + Math.random(),
    ref_id: partial.ref_id ?? 'WO-1000001',
    business_id: 'b1',
    source_type: null,
    source_id: null,
    source_ref_id: null,
    title: 'x',
    status: 'active',
    current_stage_key: null,
    priority: 'medium',
    owner_user_id: null,
    created_by_user_id: null,
    due_at: null,
    completed_at: null,
    created_at: new Date(NOW - DAY).toISOString(),
    updated_at: new Date(NOW).toISOString(),
    deleted_at: null,
    ...partial,
  } as WorkOrderRow;
}

function ev(action: string): BusinessActivityEvent {
  return {
    id: 'e' + action + Math.random(),
    business_id: 'b1',
    actor_id: null,
    entity_type: action.split('.')[0],
    entity_id: null,
    action,
    metadata: null,
    created_at: new Date(NOW).toISOString(),
  };
}

describe('BUSINESS-OPS-METRICS-1 — compute work order metrics', () => {
  it('counts open / completed / overdue / high+urgent / unassigned', () => {
    const rows: WorkOrderRow[] = [
      wo({ status: 'active', priority: 'urgent', due_at: new Date(NOW - DAY).toISOString() }),
      wo({ status: 'active', priority: 'high', owner_user_id: 'u' }),
      wo({ status: 'on_hold', priority: 'medium' }),
      wo({ status: 'completed', priority: 'low',
        created_at: new Date(NOW - 5 * DAY).toISOString(),
        completed_at: new Date(NOW - DAY).toISOString() }),
      wo({ status: 'cancelled' }),
    ];
    const m = computeOperationalMetrics({ workOrders: rows, now: NOW });
    expect(m.workOrders.open).toBe(3);
    expect(m.workOrders.completed).toBe(1);
    expect(m.workOrders.overdue).toBe(1);
    expect(m.workOrders.urgent).toBe(1);
    expect(m.workOrders.highPriority).toBe(2);   // high + urgent
    expect(m.workOrders.unassignedOpen).toBe(2); // 2 of 3 open without owner
  });

  it('computes deterministic averages with injected now', () => {
    const rows: WorkOrderRow[] = [
      wo({ status: 'active', created_at: new Date(NOW - 2 * DAY).toISOString() }),
      wo({ status: 'active', created_at: new Date(NOW - 4 * DAY).toISOString() }),
      wo({ status: 'completed',
        created_at: new Date(NOW - 10 * DAY).toISOString(),
        completed_at: new Date(NOW - 2 * DAY).toISOString() }),
      wo({ status: 'completed',
        created_at: new Date(NOW - 6 * DAY).toISOString(),
        completed_at: new Date(NOW - DAY).toISOString() }),
    ];
    const m = computeOperationalMetrics({ workOrders: rows, now: NOW });
    expect(m.workOrders.avgOpenAgeMs).toBe(3 * DAY);
    expect(m.workOrders.avgCycleTimeMs).toBe(6.5 * DAY);
  });

  it('returns nulls when no eligible rows', () => {
    const m = computeOperationalMetrics({ workOrders: [], now: NOW });
    expect(m.workOrders.avgOpenAgeMs).toBeNull();
    expect(m.workOrders.avgCycleTimeMs).toBeNull();
  });
});

describe('BUSINESS-OPS-METRICS-1 — activity-driven metrics', () => {
  it('counts conversions by action suffix', () => {
    const events = [
      ev('lead.converted_to_work_order'),
      ev('lead.converted_to_work_order'),
      ev('quote.converted_to_work_order'),
      ev('contract.converted_to_work_order'),
      ev('booking.converted_to_work_order'),
      ev('booking.status_changed'),
    ];
    const m = computeOperationalMetrics({ activityEvents: events, now: NOW });
    expect(m.leadsQuotes.leadToWorkOrder).toBe(2);
    expect(m.leadsQuotes.quoteToWorkOrder).toBe(1);
    expect(m.contracts.contractToWorkOrder).toBe(1);
    expect(m.bookings.bookingToWorkOrder).toBe(1);
    expect(m.bookings.statusChanged).toBe(1);
    expect(m.activity.totalEvents).toBe(6);
  });

  it('counts lead/quote/contract/booking lifecycle actions', () => {
    const events = [
      ev('lead.created'), ev('lead.created'),
      ev('lead.status_changed'),
      ev('quote.responded'),
      ev('quote.response_submitted'),
      ev('contract.created'),
      ev('contract.status_changed'),
      ev('contract.signed'),
      ev('contract.activated'),
      ev('booking.created'),
    ];
    const m = computeOperationalMetrics({ activityEvents: events, now: NOW });
    expect(m.leadsQuotes.newLeads).toBe(2);
    expect(m.leadsQuotes.leadStatusChanged).toBe(1);
    expect(m.leadsQuotes.quoteResponded).toBe(2);
    expect(m.contracts.created).toBe(1);
    expect(m.contracts.statusChanged).toBe(1);
    expect(m.contracts.signed).toBe(2); // signed + activated
    expect(m.bookings.created).toBe(1);
  });
});

describe('BUSINESS-OPS-METRICS-1 — admin notes metrics', () => {
  it('counts open + critical + stale (>7d)', () => {
    const notes = [
      { severity: 'info' as const, status: 'open' as const,
        created_at: new Date(NOW - 2 * DAY).toISOString() },
      { severity: 'critical' as const, status: 'open' as const,
        created_at: new Date(NOW - 10 * DAY).toISOString() },
      { severity: 'warning' as const, status: 'open' as const,
        created_at: new Date(NOW - 8 * DAY).toISOString() },
      { severity: 'critical' as const, status: 'resolved' as const,
        created_at: new Date(NOW - 30 * DAY).toISOString() },
    ];
    const m = computeOperationalMetrics({ adminNotes: notes, now: NOW });
    expect(m.adminSupport.openNotes).toBe(3);
    expect(m.adminSupport.criticalNotes).toBe(1);
    expect(m.adminSupport.staleOpenNotes).toBe(2);
  });
});

describe('BUSINESS-OPS-METRICS-1 — formatDurationShort', () => {
  it('formats compactly', () => {
    expect(formatDurationShort(null)).toBe('—');
    expect(formatDurationShort(-1)).toBe('—');
    expect(formatDurationShort(30 * 1000)).toMatch(/s$/);
    expect(formatDurationShort(5 * 60 * 1000)).toMatch(/m$/);
    expect(formatDurationShort(3 * 60 * 60 * 1000)).toMatch(/h$/);
    expect(formatDurationShort(5 * DAY)).toMatch(/d$/);
  });
});

describe('BUSINESS-OPS-METRICS-1 — source hygiene', () => {
  const METRICS_FILE = readFileSync(
    resolve(__dirname, '../modules/operations/metrics/computeOperationalMetrics.ts'),
    'utf8',
  );
  const LABELS_FILE = readFileSync(
    resolve(__dirname, '../modules/operations/metrics/metricLabels.ts'),
    'utf8',
  );
  const COMPONENT = readFileSync(
    resolve(__dirname, '../components/admin/AdminOperationalMetricsCards.tsx'),
    'utf8',
  );
  const PAGE = readFileSync(
    resolve(__dirname, '../pages/admin/AdminOperationsConsole.tsx'),
    'utf8',
  );

  it('aggregator and labels are pure (no supabase / fetch / notifications)', () => {
    for (const src of [METRICS_FILE, LABELS_FILE]) {
      expect(src).not.toMatch(/supabase/);
      expect(src).not.toMatch(/fetch\(/);
      expect(src).not.toMatch(/@\/modules\/notifications/);
      expect(src).not.toMatch(/postgres_changes/);
    }
  });

  it('component does not access Supabase or notifications/realtime/cron', () => {
    expect(COMPONENT).not.toMatch(/supabase\.from\(/);
    expect(COMPONENT).not.toMatch(/supabase\.rpc\(/);
    expect(COMPONENT).not.toMatch(/supabase\.channel\(/);
    expect(COMPONENT).not.toMatch(/postgres_changes/);
    expect(COMPONENT).not.toMatch(/setInterval\(/);
    expect(COMPONENT).not.toMatch(/setTimeout\(/);
    expect(COMPONENT).not.toMatch(/@\/modules\/notifications/);
    expect(COMPONENT).not.toMatch(/@\/modules\/auth/);
    expect(COMPONENT).not.toMatch(/@\/modules\/payments/);
    expect(COMPONENT).not.toMatch(/@\/modules\/memberships/);
  });

  it('component never renders UUIDs/secrets/provider_intent_id/synthetic emails', () => {
    expect(COMPONENT).not.toMatch(/provider_intent_id/);
    expect(COMPONENT).not.toMatch(/access_token/);
    expect(COMPONENT).not.toMatch(/client_secret/);
    expect(COMPONENT).not.toMatch(/@phone\./);
    expect(COMPONENT).not.toMatch(/\.id[^a-zA-Z_]/);
  });

  it('AdminOperationsConsole imports the metrics component + aggregator', () => {
    expect(PAGE).toMatch(/AdminOperationalMetricsCards/);
    expect(PAGE).toMatch(/computeOperationalMetrics/);
    expect(PAGE).toMatch(/listAdminOperationalNotes/);
  });
});