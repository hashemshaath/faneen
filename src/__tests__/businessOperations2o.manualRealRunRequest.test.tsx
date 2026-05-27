/**
 * BUSINESS-OPERATIONS-2O — Manual real-run skeleton + production approval contract.
 *
 * The manual real-run request MUST always be rejected in this phase. It must
 * never call dispatch/alert-writer/notification-dispatcher. Approval contract,
 * guard interplay, browser-context, dry-run preservation, dashboard read-only
 * status, and pure-module/no-Supabase guarantees are all covered.
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

import {
  requestManualRealRun,
  evaluateProductionApproval,
  MANUAL_REAL_RUN_SCOPE,
  MANUAL_REAL_RUN_REJECTION_REASONS,
  OPERATIONS_REAL_RUN_FLAG,
  OPERATIONS_NOTIFICATION_WRITES_FLAG,
  OPERATIONS_CRON_FLAG,
  guardedDispatchSlaSweep,
  type OperationsProductionApproval,
  type ManualRealRunRequest,
} from '@/modules/operations';
import AdminOperations from '@/pages/admin/AdminOperations';

const SERVER_ENV_ALL_FLAGS_TRUE = {
  context: 'server' as const,
  env: {
    [OPERATIONS_REAL_RUN_FLAG]: 'true',
    [OPERATIONS_NOTIFICATION_WRITES_FLAG]: 'true',
    [OPERATIONS_CRON_FLAG]: 'true',
  },
};

const baseRequest = (
  overrides: Partial<ManualRealRunRequest> = {},
): ManualRealRunRequest => ({
  requestedBy: 'admin-uuid',
  confirmationToken: 'I-UNDERSTAND-THE-RISK',
  reason: 'investigating SLA escalations',
  dryRun: false,
  enableWrites: true,
  enableNotificationWrites: true,
  guardEnv: SERVER_ENV_ALL_FLAGS_TRUE,
  ...overrides,
});

const validApproval = (
  overrides: Partial<OperationsProductionApproval> = {},
): OperationsProductionApproval => ({
  approved: true,
  approvedBy: 'cto@example.com',
  approvedAt: new Date().toISOString(),
  approvalTicket: 'OPS-2026-001',
  scope: MANUAL_REAL_RUN_SCOPE,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────
// Side-effect interception: spy on services that real-run MUST NOT invoke.
// ─────────────────────────────────────────────────────────────────────────

const dispatchSpy = vi.fn();
const alertWriterSpy = vi.fn();
const notificationDispatcherSpy = vi.fn();

vi.mock('@/modules/operations/services/dispatchSlaSweep', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/operations/services/dispatchSlaSweep')
  >('@/modules/operations/services/dispatchSlaSweep');
  return {
    ...actual,
    dispatchSlaSweep: (...args: unknown[]) => {
      dispatchSpy(...args);
      return actual.dispatchSlaSweep(args[0] as Parameters<typeof actual.dispatchSlaSweep>[0]);
    },
  };
});
vi.mock('@/modules/operations/services/alertWriters', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/operations/services/alertWriters')
  >('@/modules/operations/services/alertWriters');
  return {
    ...actual,
    createSupabaseAlertWriter: (...args: unknown[]) => {
      alertWriterSpy(...args);
      return actual.createSupabaseAlertWriter(
        args[0] as Parameters<typeof actual.createSupabaseAlertWriter>[0],
      );
    },
  };
});
vi.mock('@/modules/operations/services/notificationDispatcher', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/operations/services/notificationDispatcher')
  >('@/modules/operations/services/notificationDispatcher');
  return {
    ...actual,
    createInAppNotificationDispatcher: (...args: unknown[]) => {
      notificationDispatcherSpy(...args);
      return actual.createInAppNotificationDispatcher(
        args[0] as Parameters<typeof actual.createInAppNotificationDispatcher>[0],
      );
    },
  };
});

describe('2O — requestManualRealRun ALWAYS rejected', () => {
  it('rejects when nothing is provided (server context, no approval)', async () => {
    const r = await requestManualRealRun(baseRequest({ guardEnv: { context: 'server', env: {} } }));
    expect(r.accepted).toBe(false);
    expect(r.scope).toBe(MANUAL_REAL_RUN_SCOPE);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalMissing);
  });

  it('rejects even with env flags + confirmation + valid approval', async () => {
    const r = await requestManualRealRun(baseRequest({ approval: validApproval() }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.productionApprovalRequired);
  });

  it('env flags alone are insufficient (no approval, no confirmation)', async () => {
    const r = await requestManualRealRun(
      baseRequest({ confirmationToken: '', approval: undefined }),
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.confirmationMissing);
  });

  it('confirmation token alone is insufficient (no approval)', async () => {
    const r = await requestManualRealRun(baseRequest({ approval: undefined }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalMissing);
  });

  it('approval with wrong scope is rejected', async () => {
    const r = await requestManualRealRun(
      baseRequest({
        approval: validApproval({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scope: 'something_else' as any,
        }),
      }),
    );
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalWrongScope);
  });

  it('expired approval is rejected', async () => {
    const r = await requestManualRealRun(
      baseRequest({
        approval: validApproval({
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      }),
    );
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalExpired);
  });

  it('approval with approved=false is rejected', async () => {
    const r = await requestManualRealRun(
      baseRequest({ approval: validApproval({ approved: false }) }),
    );
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalNotApproved);
  });

  it('browser context always rejects, even with everything provided', async () => {
    const r = await requestManualRealRun(
      baseRequest({
        guardEnv: { ...SERVER_ENV_ALL_FLAGS_TRUE, context: 'browser' },
        approval: validApproval(),
      }),
    );
    expect(r.context).toBe('browser');
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.browserContext);
  });

  it('does NOT call dispatchSlaSweep / alertWriter / notificationDispatcher', async () => {
    dispatchSpy.mockClear();
    alertWriterSpy.mockClear();
    notificationDispatcherSpy.mockClear();
    await requestManualRealRun(baseRequest({ approval: validApproval() }));
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(alertWriterSpy).not.toHaveBeenCalled();
    expect(notificationDispatcherSpy).not.toHaveBeenCalled();
  });
});

describe('2O — evaluateProductionApproval contract', () => {
  it('rejects undefined', () => {
    expect(evaluateProductionApproval(undefined).valid).toBe(false);
  });
  it('rejects malformed approved flag', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(evaluateProductionApproval({ approved: 'yes' as any, scope: MANUAL_REAL_RUN_SCOPE }).valid).toBe(false);
  });
  it('rejects malformed expiresAt', () => {
    const r = evaluateProductionApproval(validApproval({ expiresAt: 'not-a-date' }));
    expect(r.valid).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalMalformed);
  });
  it('accepts a fully valid approval', () => {
    expect(evaluateProductionApproval(validApproval()).valid).toBe(true);
  });
  it('accepts a valid approval without expiresAt', () => {
    const r = evaluateProductionApproval(
      validApproval({ expiresAt: undefined }),
    );
    expect(r.valid).toBe(true);
  });
});

describe('2O — dry-run path preserved through guardedDispatchSlaSweep', () => {
  it('still allows dry-run with no flags / no approval', async () => {
    const res = await guardedDispatchSlaSweep({
      candidates: [], existingAlerts: [], dryRun: true,
    });
    expect(res.ok).toBe(true);
    expect(res.result?.log.dryRun).toBe(true);
  });
});

describe('2O — manualRealRunRequest module purity', () => {
  const file = readFileSync(
    resolve(__dirname, '../modules/operations/services/manualRealRunRequest.ts'),
    'utf-8',
  );
  it('does not import the supabase client', () => {
    expect(file).not.toMatch(/@\/integrations\/supabase\/client/);
  });
  it('does not import alert writers / notification dispatcher / dispatch directly for execution', () => {
    // It may type-import guard helpers, but must not perform side-effect work.
    expect(file).not.toMatch(/createSupabaseAlertWriter\s*\(/);
    expect(file).not.toMatch(/createInAppNotificationDispatcher\s*\(/);
    expect(file).not.toMatch(/dispatchSlaSweep\s*\(/);
  });
  it('does not wire any cron scheduler', () => {
    expect(file).not.toMatch(/cron\.schedule/);
    expect(file).not.toMatch(/pg_cron/);
  });
  it('hard-codes a structural deny path', () => {
    expect(file).toMatch(/PRODUCTION_APPROVAL_REQUIRED/);
    expect(file).toMatch(/accepted:\s*false/);
  });
});

describe('2O — AdminOperations dashboard reflects designed-disabled status', () => {
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

  it('shows manual real-run + production approval + server-only rows', () => {
    renderPage();
    const panel = screen.getByTestId('readiness-panel');
    expect(panel.textContent ?? '').toMatch(/manual real-run/i);
    expect(panel.textContent ?? '').toMatch(/production approval/i);
    expect(panel.textContent ?? '').toMatch(/server-only execution/i);
    expect(panel.textContent ?? '').toMatch(/designed, disabled/i);
    expect(panel.textContent ?? '').toMatch(/required/i);
  });

  it('does NOT render real-run / cron / notification-send / mutation / unlock buttons', () => {
    renderPage();
    const forbidden = [
      /run real/i,
      /real[- ]?run/i,
      /schedule cron/i,
      /enable cron/i,
      /send notification/i,
      /mutate alert/i,
      /unlock/i,
      /approve production/i,
    ];
    const buttons = screen.queryAllByRole('button');
    for (const b of buttons) {
      for (const re of forbidden) {
        expect(b.textContent ?? '').not.toMatch(re);
      }
    }
  });

  it('readiness panel has at least 9 rows (6 existing + 3 new 2O rows)', () => {
    renderPage();
    const rows = screen.getAllByTestId('readiness-row');
    expect(rows.length).toBeGreaterThanOrEqual(9);
  });
});