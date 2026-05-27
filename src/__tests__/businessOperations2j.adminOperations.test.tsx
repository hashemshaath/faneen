/**
 * BUSINESS-OPERATIONS-2J — Admin operations dashboard preview.
 *
 * Covers:
 *   - Preview DTO excludes PII and raw rows.
 *   - Sample cap is enforced.
 *   - Loader error summary is safe (no PII).
 *   - Dashboard renders totals, dry-run badge, loader health, samples.
 *   - No real-run / mutation / notification-send controls exist.
 *   - Idempotency keys are masked.
 *   - Page sources the preview service only (no direct Supabase writes).
 *   - Page file is free of cron / SMS / email / push surfaces.
 *   - i18n: Arabic + English copy renders.
 *   - Empty + error states render.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PreviewSlaSweepResult } from '@/modules/operations/services/previewSlaSweepForAdmin';
import { previewSlaSweepForAdmin as mockedPreviewExport } from '@/modules/operations/services/previewSlaSweepForAdmin';
import AdminOperations, {
  maskIdempotencyKey,
} from '@/pages/admin/AdminOperations';

// ── Mock the LanguageContext to control isRTL between renders ──────────────
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

const NOW = new Date('2026-05-27T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 36e5).toISOString();

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

// ── Pure helpers ──────────────────────────────────────────────────────────

describe('2J maskIdempotencyKey', () => {
  it('returns dash for empty key', () => {
    expect(maskIdempotencyKey(undefined)).toBe('—');
  });
  it('masks long key keeping last two segments', () => {
    expect(maskIdempotencyKey('sla:leads:qr-1:lead.submitted_not_viewed_24h:2026-05-27'))
      .toBe('••••:lead.submitted_not_viewed_24h:2026-05-27');
  });
  it('fully masks short keys', () => {
    expect(maskIdempotencyKey('a:b')).toBe('••••');
  });
});

// ── Preview service DTO safety ────────────────────────────────────────────

describe('2J previewSlaSweepForAdmin — DTO safety', () => {
  it('excludes PII and raw rows; respects sample cap', async () => {
    const candidates = Array.from({ length: 30 }).map((_, i) => ({
      id: `qr-${i}`,
      created_at: hoursAgo(30),
      status: 'submitted',
    }));
    const actual = await vi.importActual<typeof import('@/modules/operations/services/previewSlaSweepForAdmin')>('@/modules/operations/services/previewSlaSweepForAdmin');
    const res = await actual.previewSlaSweepForAdmin({
      now: NOW,
      sampleLimit: 25,
      persistLog: false,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () => candidates,
      },
      loadExistingAlerts: async () => [],
    });
    expect(res.dryRun).toBe(true);
    expect(res.sampleLimit).toBe(25);
    expect(res.sampleActions.length).toBeLessThanOrEqual(25);
    expect(res.totals.candidates).toBe(30);
    expect(res.totals.create).toBe(30);

    const text = JSON.stringify(res).toLowerCase();
    for (const banned of ['name', 'phone', 'email', '@', 'token', 'secret', 'customer']) {
      expect(text).not.toContain(banned);
    }
    for (const s of res.sampleActions) {
      // No raw row payload — only the safe action projection.
      expect(Object.keys(s).sort()).toEqual(
        ['alertId', 'conditionCode', 'entityId', 'fromSeverity', 'idempotencyKey', 'kind', 'severity'].sort(),
      );
    }
  });

  it('surfaces loader errors as plain strings without raw row leakage', async () => {
    const actual = await vi.importActual<typeof import('@/modules/operations/services/previewSlaSweepForAdmin')>('@/modules/operations/services/previewSlaSweepForAdmin');
    const res = await actual.previewSlaSweepForAdmin({
      now: NOW,
      persistLog: false,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () => {
          throw new Error('rls denied');
        },
      },
      loadExistingAlerts: async () => [],
    });
    expect(res.partial).toBe(true);
    expect(res.loaderErrors[0]).toEqual({
      conditionCode: 'lead.submitted_not_viewed_24h',
      message: 'rls denied',
    });
  });
});

// ── Page rendering ────────────────────────────────────────────────────────

function sampleResult(overrides: Partial<PreviewSlaSweepResult> = {}): PreviewSlaSweepResult {
  return {
    dryRun: true,
    status: 'success',
    evaluatedAt: NOW.toISOString(),
    totals: {
      candidates: 4,
      create: 2,
      escalate: 1,
      resolve: 0,
      skipped: 1,
      plannedNotifications: 3,
      existingAlerts: 1,
    },
    actionCountsByKind: {
      create: 2, escalate: 1, resolve: 0,
      'skip-not-yet-due': 1, 'skip-idempotent': 0,
      'skip-unknown-condition': 0, 'skip-resolved-no-alert': 0,
    },
    loaderErrors: [],
    loaderErrorsCount: 0,
    log: {
      runType: 'sla-sweep',
      dryRun: true,
      startedAt: NOW.toISOString(),
      finishedAt: NOW.toISOString(),
      status: 'ok',
      totals: {
        candidates: 4, create: 2, escalate: 1, resolve: 0, skipped: 1, plannedNotifications: 3,
      },
    },
    sampleActions: [
      {
        kind: 'create',
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'qr-1',
        severity: 'warning',
        idempotencyKey: 'sla:leads:qr-1:lead.submitted_not_viewed_24h:2026-05-27',
      },
    ],
    actionSampleCount: 1,
    totalActionCount: 1,
    sampleLimit: 25,
    partial: false,
    ...overrides,
  };
}

vi.mock('@/modules/operations/services/previewSlaSweepForAdmin', async (orig) => {
  const actual = await orig() as Record<string, unknown>;
  return {
    ...actual,
    previewSlaSweepForAdmin: vi.fn(),
  };
});

const mockedPreview = mockedPreviewExport as unknown as ReturnType<typeof vi.fn>;

describe('2J AdminOperations page', () => {
  beforeEach(() => {
    mockIsRTL = false;
    mockedPreview.mockReset();
  });
  afterEach(() => {
    mockedPreview.mockReset();
  });

  it('renders dry-run badge, totals, and masked idempotency key (EN)', async () => {
    mockedPreview.mockResolvedValue(sampleResult());
    renderPage();
    await screen.findByText('Candidates');
    expect(screen.getByTestId('dry-run-badge').textContent).toMatch(/Dry-run preview only/);
    expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('totals-grid').textContent).toMatch(/Planned notifications/);
    await screen.findByText(/••••/);
    expect(screen.getByTestId('action-samples').textContent).not.toContain('sla:leads:qr-1:');
  });

  it('renders Arabic copy when isRTL is true', async () => {
    mockIsRTL = true;
    mockedPreview.mockResolvedValue(sampleResult());
    renderPage();
    await waitFor(() => expect(screen.getByTestId('action-samples')).toBeInTheDocument());
    expect(screen.getByText('لوحة العمليات')).toBeInTheDocument();
    expect(screen.getByTestId('dry-run-badge').textContent).toMatch(/معاينة/);
  });

  it('contains no real-run / mutation / notification-send controls', async () => {
    mockedPreview.mockResolvedValue(sampleResult());
    const { container } = renderPage();
    await waitFor(() => expect(screen.getByTestId('action-samples')).toBeInTheDocument());
    const text = container.textContent ?? '';
    for (const banned of [
      'Run real dispatch',
      'Run real',
      'تشغيل فعلي',
      'Send notification',
      'إرسال إشعار',
      'Delete alert',
      'حذف تنبيه',
    ]) {
      expect(text).not.toContain(banned);
    }
    // No button claims to mutate.
    for (const btn of container.querySelectorAll('button')) {
      const t = (btn.textContent ?? '').toLowerCase();
      expect(t).not.toMatch(/dispatch|send|mutate|delete|escalate/);
    }
  });

  it('refresh button triggers refetch', async () => {
    mockedPreview.mockResolvedValue(sampleResult());
    renderPage();
    // Wait for initial fetch to fully settle so the debounced refetch is unblocked.
    await screen.findByTestId('status-badge');
    const before = mockedPreview.mock.calls.length;
    fireEvent.click(screen.getByTestId('refresh-preview'));
    await waitFor(() => expect(mockedPreview.mock.calls.length).toBeGreaterThan(before));
  });

  it('renders error state when preview throws', async () => {
    mockedPreview.mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByTestId('preview-error')).toBeInTheDocument());
    expect(screen.getByTestId('preview-error').textContent).toMatch(/boom/);
  });

  it('renders empty state when no samples', async () => {
    mockedPreview.mockResolvedValue(sampleResult({
      sampleActions: [], loaderErrors: [], actionSampleCount: 0, totalActionCount: 0,
    }));
    renderPage();
    await screen.findByTestId('empty-state');
  });
});

// ── Source purity ─────────────────────────────────────────────────────────

describe('2J source purity', () => {
  const pageSrc = readFileSync(
    resolve(__dirname, '../pages/admin/AdminOperations.tsx'),
    'utf-8',
  );
  const hookSrc = readFileSync(
    resolve(__dirname, '../modules/operations/hooks/useAdminOperationsPreview.ts'),
    'utf-8',
  );

  it('admin page does not import the Supabase client directly', () => {
    expect(pageSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });

  it('admin page does not insert into notifications or operational_alerts', () => {
    expect(pageSrc).not.toMatch(/\.from\(\s*['"](notifications|operational_alerts)['"]\s*\)/);
  });

  it('admin page contains no cron / SMS / email / push surfaces', () => {
    for (const banned of ['cron.schedule', 'pg_cron', 'sendTransactionalEmail', 'twilio', 'resend.com', 'pushnotification', 'webhook']) {
      expect(pageSrc.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('admin page sources data only from the operations module', () => {
    expect(pageSrc).toMatch(/from ['"]@\/modules\/operations['"]/);
  });

  it('hook does not enable polling / auto refetch', () => {
    expect(hookSrc).toMatch(/refetchOnWindowFocus:\s*false/);
    expect(hookSrc).toMatch(/refetchOnReconnect:\s*false/);
    expect(hookSrc).toMatch(/refetchInterval:\s*false/);
  });
});