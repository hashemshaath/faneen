import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeOperationalMetrics,
  formatDurationShort,
} from '@/modules/operations/metrics/computeOperationalMetrics';
import type { WorkOrderRow } from '@/modules/workOrders';

/**
 * BUSINESS-OPS-METRICS-2 — Provider operational metrics on Work Orders
 * Overview. Verifies the new shared component is wired in, that the
 * Overview page loads business-scoped activity events for the
 * aggregator, and that no forbidden imports/PII leak in.
 */

const ROOT = path.resolve(__dirname, '..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const COMPONENT = 'components/workOrders/ProviderOperationalMetricsCards.tsx';
const PAGE = 'pages/dashboard/DashboardWorkOrdersOverview.tsx';

describe('BUSINESS-OPS-METRICS-2 — ProviderOperationalMetricsCards', () => {
  const src = read(COMPONENT);

  it('exists and exports the component', () => {
    expect(src).toContain('export function ProviderOperationalMetricsCards');
  });

  it('uses pickMetricLabel + formatDurationShort from the shared aggregator', () => {
    expect(src).toContain("from '@/modules/operations/metrics/computeOperationalMetrics'");
    expect(src).toContain("from '@/modules/operations/metrics/metricLabels'");
    expect(src).toContain('formatDurationShort');
    expect(src).toContain('pickMetricLabel');
  });

  it('renders the approximate/current-window hint', () => {
    expect(src).toContain("data-testid=\"provider-ops-approx-hint\"");
    expect(src).toContain("approxHint");
  });

  it('renders the required provider metrics tiles', () => {
    expect(src).toContain("woOpen");
    expect(src).toContain("woOverdue");
    expect(src).toContain("woHigh");
    expect(src).toContain("woUnassigned");
    expect(src).toContain("woCompleted");
    expect(src).toContain("woAvgAge");
    expect(src).toContain("woAvgCycle");
    expect(src).toMatch(/Recent activity|recentLabel/);
  });

  it('does not import notifications/cron/realtime/supabase/fetch', () => {
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/notifications?/i);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/\bcron\b/i);
  });

  it('does not render UUIDs, provider_intent_id, tokens, or synthetic emails', () => {
    const uuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    expect(src).not.toMatch(uuid);
    expect(src).not.toContain('provider_intent_id');
    expect(src).not.toMatch(/phone-[^@]+@/);
    expect(src).not.toMatch(/token/i);
  });

  it('is mobile-safe — uses a responsive grid and small/medium tile classes', () => {
    expect(src).toMatch(/grid-cols-2/);
    expect(src).toMatch(/sm:grid-cols-\d/);
  });
});

describe('BUSINESS-OPS-METRICS-2 — Overview page wiring', () => {
  const src = read(PAGE);

  it('loads business-scoped activity for the aggregator', () => {
    expect(src).toContain('listBusinessActivityTimeline');
    expect(src).toContain('activityEvents: activity');
  });

  it('renders the ProviderOperationalMetricsCards', () => {
    expect(src).toContain('ProviderOperationalMetricsCards');
    expect(src).toContain('metrics={opsMetrics}');
    expect(src).toContain('recentActivityCount={activity.length}');
  });

  it('still uses computeOperationalMetrics directly (no admin notes)', () => {
    expect(src).toContain('computeOperationalMetrics');
    expect(src).not.toMatch(/adminNotes\s*:/);
    expect(src).not.toContain('listAdminOperationalNotes');
  });

  it('no direct supabase.from, no notifications/cron/realtime/AI imports', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/notifications?/i);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/\bcron\b/i);
  });
});

describe('BUSINESS-OPS-METRICS-2 — aggregator behavior used by provider tiles', () => {
  const now = Date.UTC(2026, 4, 28, 12, 0, 0);
  const day = 24 * 60 * 60 * 1000;

  function wo(over: Partial<WorkOrderRow>): WorkOrderRow {
    return {
      id: over.id ?? 'x',
      ref_id: over.ref_id ?? 'WO-1000001',
      business_id: 'b1',
      title: 't',
      status: 'active',
      priority: 'medium',
      owner_user_id: null,
      due_at: null,
      created_at: new Date(now - 2 * day).toISOString(),
      completed_at: null,
      source_type: null,
      source_ref_id: null,
      customer_name: null,
      ...over,
    } as WorkOrderRow;
  }

  it('counts open / overdue / high / unassigned / completed correctly', () => {
    const rows: WorkOrderRow[] = [
      wo({ id: '1', status: 'active', priority: 'urgent', owner_user_id: null, due_at: new Date(now - day).toISOString() }),
      wo({ id: '2', status: 'active', priority: 'high', owner_user_id: 'u1' }),
      wo({ id: '3', status: 'on_hold', priority: 'medium', owner_user_id: null }),
      wo({ id: '4', status: 'completed', priority: 'medium', completed_at: new Date(now).toISOString(), created_at: new Date(now - 3 * day).toISOString() }),
      wo({ id: '5', status: 'draft', priority: 'low', owner_user_id: null }),
    ];
    const m = computeOperationalMetrics({ workOrders: rows, now });
    expect(m.workOrders.open).toBe(4);
    expect(m.workOrders.overdue).toBe(1);
    expect(m.workOrders.highPriority).toBe(2);
    expect(m.workOrders.unassignedOpen).toBe(3);
    expect(m.workOrders.completed).toBe(1);
    expect(m.workOrders.avgOpenAgeMs).not.toBeNull();
    expect(m.workOrders.avgCycleTimeMs).toBe(3 * day);
  });

  it('formatDurationShort handles null and human units', () => {
    expect(formatDurationShort(null)).toBe('—');
    expect(formatDurationShort(30_000)).toBe('30s');
    expect(formatDurationShort(5 * 60_000)).toBe('5m');
    expect(formatDurationShort(3 * 60 * 60_000)).toBe('3h');
    expect(formatDurationShort(5 * 24 * 60 * 60_000)).toBe('5d');
  });
});