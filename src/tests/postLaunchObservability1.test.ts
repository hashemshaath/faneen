import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeSystemHealthSnapshot,
  computeEmailDeliveryMetrics,
  computeCustomerUsageMetrics,
  computeHelpCenterMetrics,
  computeSeoMetrics,
  computeDataIntegrityMetrics,
  computeOperationsMetrics,
  computeObservabilityAlerts,
  alertCountsBySeverity,
  summarizeIntegrityReport,
  RUN_TYPES,
} from '@/modules/observability';

const READ = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('POST-LAUNCH-OBSERVABILITY-1', () => {
  describe('module surface', () => {
    it('exposes the observability files', () => {
      for (const f of ['health.ts', 'alerts.ts', 'metrics.ts', 'diagnostics.ts', 'reports.ts', 'index.ts', 'types.ts']) {
        expect(fs.existsSync(path.join('src/modules/observability', f))).toBe(true);
      }
    });
    it('lists the expected run types', () => {
      expect(RUN_TYPES).toContain('daily_integrity');
      expect(RUN_TYPES).toContain('manual_check');
      expect(RUN_TYPES).toContain('provider_growth');
      expect(RUN_TYPES).toContain('customer_usage');
      expect(RUN_TYPES).toContain('seo_check');
      expect(RUN_TYPES).toContain('email_health');
    });
  });

  describe('health scoring', () => {
    it('returns healthy when every section is healthy', () => {
      const snap = computeSystemHealthSnapshot({});
      expect(snap.status).toBe('healthy');
      expect(snap.score).toBeGreaterThanOrEqual(90);
      expect(Object.keys(snap.sections)).toHaveLength(7);
    });
    it('downgrades to warning on amber integrity', () => {
      const integrity = computeDataIntegrityMetrics({ totalIssues: 6, redCount: 0, amberCount: 6 });
      const snap = computeSystemHealthSnapshot({ integrity });
      expect(snap.status === 'warning' || snap.status === 'healthy').toBe(true);
      expect(snap.score).toBeLessThanOrEqual(95);
    });
    it('caps score when any section is critical', () => {
      const integrity = computeDataIntegrityMetrics({ totalIssues: 1, redCount: 1, amberCount: 0 });
      const snap = computeSystemHealthSnapshot({ integrity });
      expect(snap.score).toBeLessThanOrEqual(65);
      expect(snap.status === 'warning' || snap.status === 'critical').toBe(true);
    });
  });

  describe('email observability', () => {
    it('flags critical on >20% failure', () => {
      const m = computeEmailDeliveryMetrics({ pending: 0, sent: 70, failed: 30 });
      expect(m.status).toBe('critical');
      expect(m.metrics.failure_rate_pct).toBe(30);
    });
    it('is healthy with all sent', () => {
      const m = computeEmailDeliveryMetrics({ pending: 0, sent: 50, failed: 0 });
      expect(m.status).toBe('healthy');
    });
  });

  describe('customer metrics aggregated, no PII', () => {
    const m = computeCustomerUsageMetrics({
      trackingLinksCreated: 12,
      portalViews: 80,
      quotationApprovals: 5,
      appointmentConfirmations: 3,
      rescheduleRequests: 0,
      completionConfirmations: 2,
      feedbackSubmissions: 4,
      npsResponses: 3,
    });
    it('produces numeric aggregates only', () => {
      for (const v of Object.values(m.metrics)) expect(typeof v).toBe('number');
    });
    it('never exposes recipient identifiers', () => {
      const json = JSON.stringify(m);
      expect(json).not.toMatch(/email|phone|user_id|customer_id/i);
    });
  });

  describe('help center metrics', () => {
    it('warns on high zero-result rate', () => {
      const m = computeHelpCenterMetrics({
        searches: 20, zeroResultSearches: 12, openIssueReports: 0, openFeatureRequests: 0,
      });
      expect(m.status).toBe('warning');
    });
  });

  describe('seo observability', () => {
    it('all-green produces healthy', () => {
      const m = computeSeoMetrics({ sitemapOk: true, robotsOk: true, jsonLdOk: true, publicAssetsOk: true });
      expect(m.status).toBe('healthy');
    });
    it('marks manual GSC connection', () => {
      const m = computeSeoMetrics({ gscConnected: 'manual' });
      expect(m.metrics.gsc_connected).toBe('manual');
    });
  });

  describe('alert engine', () => {
    it('emits critical alerts for the documented triggers', () => {
      const alerts = computeObservabilityAlerts({
        emailFailureRatePct: 25,
        publishedProviders: 0,
        registeredProviders: 4,
        draftProviders: 4,
        dataIntegrityCritical: 2,
        zeroResultSearches: 1,
        pendingCustomerConfirmations: 1,
        customerPortalSnapshotFailures: 1,
      });
      const counts = alertCountsBySeverity(alerts);
      expect(counts.critical).toBeGreaterThanOrEqual(3);
      expect(alerts.find((a) => a.code === 'email_failure_rate_high')).toBeDefined();
      expect(alerts.find((a) => a.code === 'no_published_providers')).toBeDefined();
      expect(alerts.find((a) => a.code === 'data_integrity_critical')).toBeDefined();
    });
    it('emits warning + info alerts as expected', () => {
      const alerts = computeObservabilityAlerts({
        emailFailureRatePct: 2,
        publishedProviders: 10,
        registeredProviders: 30,
        draftProviders: 40,
        dataIntegrityCritical: 0,
        zeroResultSearches: 99,
        pendingCustomerConfirmations: 99,
        seoCheckRun: false,
        gscConnected: false,
        contentGaps: 3,
        lowNpsCount: 2,
      });
      expect(alerts.find((a) => a.code === 'zero_result_searches_high')?.severity).toBe('warning');
      expect(alerts.find((a) => a.code === 'gsc_not_connected')?.severity).toBe('warning');
      expect(alerts.find((a) => a.code === 'new_content_gaps')?.severity).toBe('info');
    });
  });

  describe('integrity bridge', () => {
    it('summarises integrity report into the metrics input shape', () => {
      const summary = summarizeIntegrityReport([
        { key: 'expired_warranties', label_ar: '', label_en: '', count: 3, tone: 'red' as const },
        { key: 'work_orders_without_due_date', label_ar: '', label_en: '', count: 4, tone: 'amber' as const },
      ] as never);
      expect(summary).toEqual({ totalIssues: 7, redCount: 3, amberCount: 4 });
    });
  });

  describe('operations metrics', () => {
    it('downgrades when work orders overdue', () => {
      const m = computeOperationsMetrics({ overdueWorkOrders: 12, pendingCustomerConfirmations: 0, awardedRfqsWithoutPo: 0 });
      expect(m.status).toBe('critical');
    });
  });

  describe('observability log + RPC contract', () => {
    const migration = READ('supabase/migrations/20260529212123_831659de-2682-4728-a29e-78253a16a4d6.sql');
    it('migration declares the table with RLS + grants', () => {
      expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.operations_observability_log/);
      expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
      expect(migration).toMatch(/GRANT SELECT ON public\.operations_observability_log TO authenticated/);
      expect(migration).not.toMatch(/TO anon/);
    });
    it('RPC is SECURITY DEFINER and admin-gated', () => {
      expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.run_operations_observability_check/);
      expect(migration).toMatch(/SECURITY DEFINER/);
      expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.run_operations_observability_check\(text\) FROM PUBLIC, anon/);
    });
    it('RPC does not mutate business tables', () => {
      const fn = migration.split('run_operations_observability_check')[1] ?? '';
      expect(fn).not.toMatch(/\bUPDATE\s+public\.(contracts|work_orders|rfqs|quotations|customer_)/i);
      expect(fn).not.toMatch(/\bDELETE\s+FROM\s+public\.(contracts|work_orders|rfqs|quotations|customer_)/i);
    });
  });

  describe('operations center wiring', () => {
    const page = READ('src/pages/dashboard/DashboardOperationsCenter.tsx');
    it('renders the system health card and history list', () => {
      expect(page).toMatch(/system-health-section/);
      expect(page).toMatch(/observability-history-section/);
    });
    it('exposes the manual run trigger inline (no modal)', () => {
      expect(page).toMatch(/run-observability-check/);
      expect(page).not.toMatch(/<Dialog\b/);
    });
  });

  describe('scope guards', () => {
    const files = [
      'src/modules/observability/health.ts',
      'src/modules/observability/metrics.ts',
      'src/modules/observability/alerts.ts',
      'src/modules/observability/diagnostics.ts',
    ];
    it('no inventory / accounting / supplier payments / sms scope leaks', () => {
      for (const f of files) {
        const src = READ(f);
        expect(src).not.toMatch(/inventory|accounting|supplier_payment|whatsapp|\bsms\b/i);
      }
    });
    it('pure helpers do not import supabase', () => {
      for (const f of files) {
        expect(READ(f)).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
      }
    });
  });
});