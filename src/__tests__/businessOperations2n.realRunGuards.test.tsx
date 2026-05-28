/**
 * BUSINESS-OPERATIONS-2N — Real-run readiness guards & dashboard panel.
 *
 * Asserts that all real-run / notification-writes / cron gates default to
 * hard-disabled, that the readiness checker is read-only, that the
 * dashboard renders the readiness panel without any real-run controls,
 * and that the operations services module remains Supabase-free for the
 * new guards file.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: false,
    language: 'en',
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

import {
  OPERATIONS_REAL_RUN_FLAG,
  OPERATIONS_NOTIFICATION_WRITES_FLAG,
  OPERATIONS_CRON_FLAG,
  OPERATIONS_GUARD_REASONS,
  checkOperationsRealRunAllowed,
  checkOperationsNotificationWritesAllowed,
  checkOperationsCronAllowed,
  getOperationsRealRunReadiness,
  guardedDispatchSlaSweep,
} from '@/modules/operations';
import AdminOperations from '@/pages/admin/AdminOperations';

const SERVER = { context: 'server' as const };

describe('2N — real-run guards default DISABLED', () => {
  it('real-run is denied in browser context regardless of env', () => {
    const r = checkOperationsRealRunAllowed({
      context: 'browser',
      env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
      confirmationToken: 'whatever',
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(OPERATIONS_GUARD_REASONS.browserContext);
    expect(r.requiredFlags).toContain(OPERATIONS_REAL_RUN_FLAG);
  });

  it('real-run fails closed when env is missing', () => {
    const r = checkOperationsRealRunAllowed({ ...SERVER, env: {} });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(OPERATIONS_GUARD_REASONS.missingEnv);
    expect(r.missingFlags).toContain(OPERATIONS_REAL_RUN_FLAG);
  });

  it('real-run fails closed when env is malformed', () => {
    const r = checkOperationsRealRunAllowed({
      ...SERVER,
      env: { [OPERATIONS_REAL_RUN_FLAG]: 'yes' },
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(OPERATIONS_GUARD_REASONS.malformedEnv);
  });

  it('real-run fails closed when env is explicitly disabled', () => {
    const r = checkOperationsRealRunAllowed({
      ...SERVER,
      env: { [OPERATIONS_REAL_RUN_FLAG]: 'false' },
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(OPERATIONS_GUARD_REASONS.flagDisabled);
  });

  it('real-run requires confirmation token even when flag is enabled', () => {
    const r = checkOperationsRealRunAllowed({
      ...SERVER,
      env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(OPERATIONS_GUARD_REASONS.missingConfirmation);
  });

  it('real-run remains denied even when flag is enabled AND token is provided (phase 2N)', () => {
    const r = checkOperationsRealRunAllowed({
      ...SERVER,
      env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
      confirmationToken: 'production-approved-abc',
    });
    expect(r.allowed).toBe(false);
  });

  it('notification writes are denied by default', () => {
    expect(checkOperationsNotificationWritesAllowed({ ...SERVER, env: {} }).allowed).toBe(false);
    expect(
      checkOperationsNotificationWritesAllowed({
        ...SERVER,
        env: { [OPERATIONS_NOTIFICATION_WRITES_FLAG]: 'true' },
      }).allowed,
    ).toBe(false);
  });

  it('cron is denied by default', () => {
    expect(checkOperationsCronAllowed({ ...SERVER, env: {} }).allowed).toBe(false);
    expect(
      checkOperationsCronAllowed({
        ...SERVER,
        env: { [OPERATIONS_CRON_FLAG]: 'true' },
      }).allowed,
    ).toBe(false);
  });
});

describe('2N — getOperationsRealRunReadiness is read-only & reports disabled', () => {
  it('reports all gates disabled and recommends dry-run', () => {
    const r = getOperationsRealRunReadiness({ ...SERVER, env: {} });
    expect(r.realRun.allowed).toBe(false);
    expect(r.realRun.state).toBe('disabled');
    expect(r.notificationWrites.state).toBe('disabled');
    expect(r.cron.state).toBe('disabled');
    expect(r.uiControls.realRunButton).toBe('hidden');
    expect(r.uiControls.cronButton).toBe('hidden');
    expect(r.uiControls.notificationSendButton).toBe('hidden');
    expect(r.uiControls.alertMutationButton).toBe('hidden');
    expect(r.uiControls.dryRunPreview).toBe('enabled');
    expect(r.uiControls.manualPreviewLedger).toBe('enabled');
    expect(r.recommendation).toMatch(/dry-run/i);
  });

  it('reports capabilities without mutating anything', () => {
    const r = getOperationsRealRunReadiness({ ...SERVER, env: {} });
    expect(r.capabilities.alertWriterAvailable).toBe(true);
    expect(r.capabilities.notificationDispatcherAvailable).toBe(true);
    expect(r.capabilities.recipientResolverAvailable).toBe(true);
    expect(r.capabilities.loggerAvailable).toBe(true);
  });
});

describe('2N — guardedDispatchSlaSweep', () => {
  it('allows dry-run without any flags', async () => {
    const res = await guardedDispatchSlaSweep({
      candidates: [], existingAlerts: [], dryRun: true,
    });
    expect(res.ok).toBe(true);
    expect(res.guard).toBeNull();
    expect(res.result?.log.dryRun).toBe(true);
  });

  it('refuses non-dry-run when guard denies (no flag, server context)', async () => {
    const res = await guardedDispatchSlaSweep({
      candidates: [], existingAlerts: [], dryRun: false,
      guardEnv: { context: 'server', env: {} },
    });
    expect(res.ok).toBe(false);
    expect(res.guard?.allowed).toBe(false);
    expect(res.result).toBeUndefined();
  });

  it('refuses non-dry-run from browser context even with flag set', async () => {
    const res = await guardedDispatchSlaSweep({
      candidates: [], existingAlerts: [], dryRun: false,
      guardEnv: {
        context: 'browser',
        env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
        confirmationToken: 'whatever',
      },
    });
    expect(res.ok).toBe(false);
    expect(res.guard?.reason).toBe(OPERATIONS_GUARD_REASONS.browserContext);
  });
});

describe('2N — operationsRunGuards module purity', () => {
  const file = readFileSync(
    resolve(__dirname, '../modules/operations/services/operationsRunGuards.ts'),
    'utf-8',
  );

  it('does not import the supabase client', () => {
    expect(file).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does not wire any cron scheduler', () => {
    expect(file).not.toMatch(/cron\.schedule/);
    expect(file).not.toMatch(/pg_cron/);
  });
});

describe('2N — AdminOperations dashboard readiness panel', () => {
  function renderPage() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AdminOperations />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('renders the readiness panel', () => {
    renderPage();
    expect(screen.getByTestId('readiness-panel')).toBeInTheDocument();
    expect(screen.getByTestId('readiness-recommendation').textContent).toMatch(/dry-run|معاينة/i);
    const rows = screen.getAllByTestId('readiness-row');
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('does NOT render a real-run / cron / notification-send / mutation button', () => {
    renderPage();
    const forbidden = [
      /run real/i,
      /real[- ]?run/i,
      /run real dispatch/i,
      /schedule cron/i,
      /enable cron/i,
      /send notification/i,
      /mutate alert/i,
      /unlock/i,
    ];
    const buttons = screen.queryAllByRole('button');
    for (const b of buttons) {
      for (const re of forbidden) {
        expect(b.textContent ?? '').not.toMatch(re);
      }
    }
  });
});