/**
 * BUSINESS-OPERATIONS-2L — Admin operations preview hardening.
 *
 * Covers:
 *   - Status badge variants (success / partial / failed / empty).
 *   - Safety panel renders, with no real-run controls.
 *   - Loader health summary counts render.
 *   - "Showing N of M" sample-cap text renders.
 *   - Empty state renders distinct copy.
 *   - Refresh failure keeps last successful data visible and shows banner.
 *   - Refresh debounce: overlapping clicks do not double-fire refetch.
 *   - Error banner does not expose unsafe details (no recipient IDs / PII).
 *   - Hook never enables polling/intervals.
 *   - Page sources data via the operations module only.
 *   - Preview DTO `status` derives correctly from log / partial / totals.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PreviewSlaSweepResult } from '@/modules/operations/services/previewSlaSweepForAdmin';
import { previewSlaSweepForAdmin as mockedPreviewExport } from '@/modules/operations/services/previewSlaSweepForAdmin';
import AdminOperations from '@/pages/admin/AdminOperations';

let mockIsRTL = false;
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: mockIsRTL,
    language: mockIsRTL ? 'ar' : 'en',
    setLanguage: vi.fn(),
    t: (k: string) => k,
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: () => {} }));
vi.mock('@/hooks/useNoIndex', () => ({ useNoIndex: () => {} }));
vi.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }) => children,
}));

vi.mock('@/modules/operations/services/previewSlaSweepForAdmin', async (orig) => {
  const actual = await orig() as Record<string, unknown>;
  return {
    ...actual,
    previewSlaSweepForAdmin: vi.fn(),
  };
});

const mockedPreview = mockedPreviewExport as unknown as ReturnType<typeof vi.fn>;

const NOW = new Date('2026-05-27T12:00:00.000Z');

function baseResult(overrides: Partial<PreviewSlaSweepResult> = {}): PreviewSlaSweepResult {
  return {
    dryRun: true,
    status: 'success',
    evaluatedAt: NOW.toISOString(),
    totals: {
      candidates: 10, create: 4, escalate: 2, resolve: 1, skipped: 3,
      plannedNotifications: 5, existingAlerts: 2,
    },
    actionCountsByKind: {
      create: 4, escalate: 2, resolve: 1,
      'skip-not-yet-due': 3, 'skip-idempotent': 0,
      'skip-unknown-condition': 0, 'skip-resolved-no-alert': 0,
    },
    loaderErrors: [],
    loaderErrorsCount: 0,
    log: {
      runType: 'sla-sweep', dryRun: true,
      startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(),
      status: 'ok',
      totals: { candidates: 10, create: 4, escalate: 2, resolve: 1, skipped: 3, plannedNotifications: 5 },
    },
    sampleActions: [
      { kind: 'create', conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'qr-1',
        severity: 'warning',
        idempotencyKey: 'sla:leads:qr-1:lead.submitted_not_viewed_24h:2026-05-27' },
    ],
    actionSampleCount: 1,
    totalActionCount: 7,
    sampleLimit: 25,
    partial: false,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminOperations />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('2L preview DTO status derivation', () => {
  it('derives success / partial / failed / empty from upstream signals', async () => {
    const actual = await vi.importActual<typeof import('@/modules/operations/services/previewSlaSweepForAdmin')>(
      '@/modules/operations/services/previewSlaSweepForAdmin',
    );

    // success
    const ok = await actual.previewSlaSweepForAdmin({
      now: NOW, persistLog: false,
      fetchers: { 'lead.submitted_not_viewed_24h': async () => [
        { id: 'qr-1', created_at: new Date(NOW.getTime() - 30 * 36e5).toISOString(), status: 'submitted' },
      ] },
      loadExistingAlerts: async () => [],
    });
    expect(ok.status).toBe('success');
    expect(ok.loaderErrorsCount).toBe(0);
    expect(ok.actionSampleCount).toBe(ok.sampleActions.length);

    // partial — loader throws
    const partial = await actual.previewSlaSweepForAdmin({
      now: NOW, persistLog: false,
      fetchers: { 'lead.submitted_not_viewed_24h': async () => { throw new Error('rls denied'); } },
      loadExistingAlerts: async () => [],
    });
    expect(partial.status).toBe('partial');
    expect(partial.loaderErrorsCount).toBeGreaterThan(0);

    // empty — no candidates, no existing alerts
    const empty = await actual.previewSlaSweepForAdmin({
      now: NOW, persistLog: false,
      fetchers: { 'lead.submitted_not_viewed_24h': async () => [] },
      loadExistingAlerts: async () => [],
    });
    expect(empty.status).toBe('empty');
  });
});

describe('2L AdminOperations dashboard hardening', () => {
  beforeEach(() => {
    mockIsRTL = false;
    mockedPreview.mockReset();
  });
  afterEach(() => {
    mockedPreview.mockReset();
  });

  it('renders the safety panel with all four guarantees', async () => {
    mockedPreview.mockResolvedValue(baseResult());
    renderPage();
    const panel = await screen.findByTestId('safety-panel');
    const text = panel.textContent ?? '';
    expect(text).toMatch(/Preview only/);
    expect(text).toMatch(/No alerts are changed/);
    expect(text).toMatch(/No notifications are sent/);
    expect(text).toMatch(/No cron job is running/);
  });

  it('renders success status badge for healthy preview', async () => {
    mockedPreview.mockResolvedValue(baseResult());
    renderPage();
    const badge = await screen.findByTestId('status-badge');
    expect(badge.getAttribute('data-status')).toBe('success');
  });

  it('renders partial status badge when loader errors present', async () => {
    mockedPreview.mockResolvedValue(baseResult({
      status: 'partial', partial: true,
      loaderErrors: [{ conditionCode: 'lead.submitted_not_viewed_24h', message: 'rls denied' }],
      loaderErrorsCount: 1,
    }));
    renderPage();
    const badge = await screen.findByTestId('status-badge');
    expect(badge.getAttribute('data-status')).toBe('partial');
  });

  it('renders empty status badge and empty-state copy when no candidates', async () => {
    mockedPreview.mockResolvedValue(baseResult({
      status: 'empty',
      totals: { candidates: 0, create: 0, escalate: 0, resolve: 0, skipped: 0, plannedNotifications: 0, existingAlerts: 0 },
      sampleActions: [], actionSampleCount: 0, totalActionCount: 0,
    }));
    renderPage();
    await screen.findByTestId('empty-state');
    expect(screen.getByTestId('status-badge').getAttribute('data-status')).toBe('empty');
  });

  it('renders sample cap text as "Showing N of M (cap L)"', async () => {
    mockedPreview.mockResolvedValue(baseResult({ actionSampleCount: 1, totalActionCount: 7, sampleLimit: 25 }));
    renderPage();
    await screen.findByText(/Showing 1 of 7/);
    expect(screen.getByTestId('sample-cap-text').textContent).toMatch(/cap 25/);
  });

  it('renders loader health summary counts', async () => {
    mockedPreview.mockResolvedValue(baseResult({
      loaderErrors: [{ conditionCode: 'quote.pending_provider_response_48h', message: 'rls denied' }],
      loaderErrorsCount: 1,
    }));
    renderPage();
    // ADMIN-OPS-TAB-CONSOLIDATION: detailed sections moved into tabs.
    // Loader health lives under the "Health" tab; switch to it first.
    await screen.findByTestId('status-badge');
    const tabs = screen.getAllByRole('tab');
    const healthTab = tabs.find((t) => /Health/i.test(t.textContent ?? ''))!;
    await act(async () => {
      fireEvent.pointerDown(healthTab, { button: 0, pointerType: 'mouse' });
      fireEvent.mouseDown(healthTab, { button: 0 });
      fireEvent.click(healthTab);
    });
    const summary = await screen.findByTestId('loader-health-summary');
    expect(summary.textContent).toMatch(/Healthy/);
    expect(summary.textContent).toMatch(/Failed/);
    expect(summary.textContent).toMatch(/1/);
  });

  it('keeps last successful data visible and shows error banner on refresh failure', async () => {
    mockedPreview.mockResolvedValueOnce(baseResult({ totals: {
      candidates: 42, create: 10, escalate: 5, resolve: 3, skipped: 1, plannedNotifications: 7, existingAlerts: 4,
    } }));
    renderPage();
    await screen.findByTestId('status-badge');
    // Stable distinctive number from the first success.
    expect(screen.getByTestId('totals-grid').textContent).toMatch(/42/);

    mockedPreview.mockRejectedValueOnce(new Error('transient network error'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('refresh-preview'));
    });

    await screen.findByTestId('preview-error');
    // Prior successful totals still visible — not cleared.
    expect(screen.getByTestId('totals-grid').textContent).toMatch(/42/);
    // Error banner text is generic and does not leak recipient IDs / PII.
    const banner = screen.getByTestId('preview-error').textContent ?? '';
    expect(banner).toMatch(/transient network error/);
    for (const banned of ['user_id', 'recipient', 'phone', 'email', '@', 'token', 'secret']) {
      expect(banner.toLowerCase()).not.toContain(banned);
    }
  });

  it('debounces refresh: overlapping clicks do not double-fire refetch', async () => {
    let resolveSecond: (v: PreviewSlaSweepResult) => void = () => {};
    mockedPreview
      .mockResolvedValueOnce(baseResult())
      .mockImplementationOnce(
        () => new Promise<PreviewSlaSweepResult>((res) => { resolveSecond = res; }),
      );
    renderPage();
    // Wait for initial success render (proves isFetching settled).
    await screen.findByTestId('status-badge');
    expect(mockedPreview).toHaveBeenCalledTimes(1);

    const btn = screen.getByTestId('refresh-preview');
    // First click starts the 2nd (held) fetch.
    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => expect(mockedPreview).toHaveBeenCalledTimes(2));
    // Spam more clicks while the 2nd call is pending.
    await act(async () => {
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    // Still exactly 2 — overlapping refreshes were ignored.
    expect(mockedPreview).toHaveBeenCalledTimes(2);
    // Release the pending fetch so React Query unwinds cleanly.
    await act(async () => { resolveSecond(baseResult()); });
  });

  it('contains no real-run, mutation, or notification-send controls', async () => {
    mockedPreview.mockResolvedValue(baseResult());
    const { container } = renderPage();
    await screen.findByTestId('status-badge');
    const text = (container.textContent ?? '').toLowerCase();
    for (const banned of [
      'run real dispatch', 'run real', 'تشغيل فعلي',
      'enable writes', 'delete alert', 'حذف تنبيه',
      'send sms', 'send email', 'send push',
    ]) {
      expect(text).not.toContain(banned.toLowerCase());
    }
    for (const btn of container.querySelectorAll('button')) {
      const t = (btn.textContent ?? '').toLowerCase();
      expect(t).not.toMatch(/dispatch|send|mutate|delete|escalate now|run real/);
    }
  });

  it('does not render recipient IDs or PII tokens anywhere on the page', async () => {
    mockedPreview.mockResolvedValue(baseResult());
    const { container } = renderPage();
    await screen.findByTestId('status-badge');
    const text = (container.textContent ?? '').toLowerCase();
    for (const banned of ['user_id', 'recipient', '@', 'phone', 'email', 'token', 'secret', 'customer']) {
      expect(text).not.toContain(banned);
    }
  });
});

describe('2L source purity & no-polling guarantees', () => {
  const hookSrc = readFileSync(
    resolve(__dirname, '../modules/operations/hooks/useAdminOperationsPreview.ts'),
    'utf-8',
  );
  const pageSrc = readFileSync(
    resolve(__dirname, '../pages/admin/AdminOperations.tsx'),
    'utf-8',
  );

  it('hook disables window-focus, reconnect, and interval refetch', () => {
    expect(hookSrc).toMatch(/refetchOnWindowFocus:\s*false/);
    expect(hookSrc).toMatch(/refetchOnReconnect:\s*false/);
    expect(hookSrc).toMatch(/refetchInterval:\s*false/);
  });

  it('hook contains no setInterval / setTimeout polling loops', () => {
    expect(hookSrc).not.toMatch(/setInterval\s*\(/);
    expect(hookSrc).not.toMatch(/setTimeout\s*\(.*refetch/);
  });

  it('page sources data only from the operations module', () => {
    expect(pageSrc).toMatch(/from ['"]@\/modules\/operations['"]/);
    expect(pageSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('page contains no cron / SMS / email / push / mutation surfaces', () => {
    for (const banned of [
      'cron.schedule', 'pg_cron', 'sendTransactionalEmail',
      'twilio', 'resend.com', 'pushnotification', 'webhook',
      'applySlaSweepPlan', 'dispatchPlannedNotifications',
    ]) {
      expect(pageSrc.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });
});