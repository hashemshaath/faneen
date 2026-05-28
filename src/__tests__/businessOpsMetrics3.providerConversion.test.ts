import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * BUSINESS-OPS-METRICS-3 — Provider source conversion breakdown.
 * Verifies the new component is wired in, uses existing metrics only,
 * shows all four source chips, and obeys safety rules.
 */

const ROOT = path.resolve(__dirname, '..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const COMPONENT = 'components/workOrders/ProviderConversionBreakdown.tsx';
const PAGE = 'pages/dashboard/DashboardWorkOrdersOverview.tsx';

describe('BUSINESS-OPS-METRICS-3 — ProviderConversionBreakdown component', () => {
  const src = read(COMPONENT);

  it('exists and exports the component', () => {
    expect(src).toContain('export function ProviderConversionBreakdown');
  });

  it('uses pickMetricLabel from the shared labels module', () => {
    expect(src).toContain("from '@/modules/operations/metrics/metricLabels'");
    expect(src).toContain('pickMetricLabel');
  });

  it('uses OperationalMetrics type from the shared aggregator', () => {
    expect(src).toContain("from '@/modules/operations/metrics/computeOperationalMetrics'");
    expect(src).toContain('OperationalMetrics');
  });

  it('renders all four source chips', () => {
    expect(src).toContain("key: 'ledToWo'");
    expect(src).toContain("key: 'qteToWo'");
    expect(src).toContain("key: 'cntToWo'");
    expect(src).toContain("key: 'bkgToWo'");
  });

  it('reads leadToWorkOrder from metrics.leadsQuotes', () => {
    expect(src).toContain('metrics.leadsQuotes.leadToWorkOrder');
  });

  it('reads quoteToWorkOrder from metrics.leadsQuotes', () => {
    expect(src).toContain('metrics.leadsQuotes.quoteToWorkOrder');
  });

  it('reads contractToWorkOrder from metrics.contracts', () => {
    expect(src).toContain('metrics.contracts.contractToWorkOrder');
  });

  it('reads bookingToWorkOrder from metrics.bookings', () => {
    expect(src).toContain('metrics.bookings.bookingToWorkOrder');
  });

  it('has the approximate/current-window hint', () => {
    expect(src).toContain('data-testid="provider-conversion-approx-hint"');
    expect(src).toContain("L('approxHint'");
  });

  it('uses lucide source icons (Inbox, FileText, FileSignature, CalendarDays)', () => {
    expect(src).toContain('Inbox');
    expect(src).toContain('FileText');
    expect(src).toContain('FileSignature');
    expect(src).toContain('CalendarDays');
  });

  it('is mobile-safe with responsive grid', () => {
    expect(src).toMatch(/grid-cols-2/);
    expect(src).toMatch(/sm:grid-cols-4/);
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
});

describe('BUSINESS-OPS-METRICS-3 — Overview page wiring', () => {
  const src = read(PAGE);

  it('renders ProviderConversionBreakdown below ProviderOperationalMetricsCards', () => {
    expect(src).toContain('ProviderConversionBreakdown');
    const metricsIdx = src.indexOf('ProviderOperationalMetricsCards');
    const convIdx = src.indexOf('ProviderConversionBreakdown');
    expect(convIdx).toBeGreaterThan(metricsIdx);
  });

  it('passes metrics={opsMetrics} and isRTL to ProviderConversionBreakdown', () => {
    expect(src).toMatch(/ProviderConversionBreakdown\s+metrics=\{opsMetrics\}\s+isRTL=\{isRTL\}/s);
  });

  it('no direct supabase.from, no notifications/cron/realtime/AI imports', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/notifications?/i);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/\bcron\b/i);
  });
});
