/**
 * BUSINESS-OPERATIONS-2P — Production approval audit log.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false, language: 'en', setLanguage: vi.fn(), t: (k: string) => k }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: () => {} }));
vi.mock('@/hooks/useNoIndex', () => ({ useNoIndex: () => {} }));
vi.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }) => children,
}));

import {
  requestManualRealRun,
  logOperationsApprovalAudit,
  buildApprovalAuditSummary,
  listOperationsApprovalAudit,
  OPERATIONS_APPROVAL_AUDIT_JOB_NAME,
  OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME,
  OPERATIONS_APPROVAL_AUDIT_CAP,
  MANUAL_REAL_RUN_SCOPE,
  MANUAL_REAL_RUN_REJECTION_REASONS,
  OPERATIONS_REAL_RUN_FLAG,
  OPERATIONS_NOTIFICATION_WRITES_FLAG,
  OPERATIONS_CRON_FLAG,
  type ManualRealRunRequest,
  type OperationsProductionApproval,
  type OperationsApprovalAuditWriter,
} from '@/modules/operations';
import AdminOperations from '@/pages/admin/AdminOperations';

const SERVER_ENV_ALL_TRUE = {
  context: 'server' as const,
  env: {
    [OPERATIONS_REAL_RUN_FLAG]: 'true',
    [OPERATIONS_NOTIFICATION_WRITES_FLAG]: 'true',
    [OPERATIONS_CRON_FLAG]: 'true',
  },
};

const baseRequest = (o: Partial<ManualRealRunRequest> = {}): ManualRealRunRequest => ({
  requestedBy: 'admin-uuid',
  confirmationToken: 'I-UNDERSTAND-THE-RISK',
  reason: 'investigation',
  dryRun: false,
  enableWrites: true,
  enableNotificationWrites: true,
  guardEnv: SERVER_ENV_ALL_TRUE,
  ...o,
});

const validApproval = (o: Partial<OperationsProductionApproval> = {}): OperationsProductionApproval => ({
  approved: true,
  approvedBy: 'cto@example.com',
  approvedAt: new Date().toISOString(),
  approvalTicket: 'OPS-2026-001',
  scope: MANUAL_REAL_RUN_SCOPE,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...o,
});

function captureAudit() {
  const calls: Array<Parameters<OperationsApprovalAuditWriter>[0]> = [];
  const writer: OperationsApprovalAuditWriter = async (input) => {
    calls.push(input);
    return { ok: true, id: 'audit-id' };
  };
  return { writer, calls };
}

describe('2P — buildApprovalAuditSummary sanitizes payload', () => {
  it('whitelists keys and drops PII-shaped inputs', () => {
    const s = buildApprovalAuditSummary({
      eventType: 'manual_real_run_rejected',
      scope: MANUAL_REAL_RUN_SCOPE,
      status: 'rejected',
      reasonCode: 'APPROVAL_MISSING',
      requestedBy: 'admin-uuid-123',
      requestedAt: new Date().toISOString(),
      approvalTicket: 'OPS-1',
      expiresAt: new Date().toISOString(),
      dryRun: false,
      enableWrites: true,
      enableNotificationWrites: true,
      guardReason: 'flag disabled',
      context: 'server',
    });
    expect(Object.keys(s).sort()).toEqual([
      'approvalTicket', 'context', 'dryRun', 'enableNotificationWrites',
      'enableWrites', 'eventType', 'expiresAt', 'guardReason', 'reasonCode',
      'requestedAt', 'requestedBy', 'scope', 'status',
    ]);
    expect(JSON.stringify(s)).not.toMatch(/@example|phone|email|password|token/i);
  });

  it('drops malformed reasonCode / requestedBy / ticket', () => {
    const s = buildApprovalAuditSummary({
      eventType: 'guard_denied',
      scope: MANUAL_REAL_RUN_SCOPE,
      status: 'denied',
      reasonCode: '"<script>alert(1)</script>"',
      requestedBy: 'name with spaces!@#',
      approvalTicket: '<bad>',
    });
    expect(s.reasonCode).toBeNull();
    expect(s.requestedBy).toBeNull();
    expect(s.approvalTicket).toBeNull();
  });
});

describe('2P — logOperationsApprovalAudit', () => {
  it('uses correct job & function names and never throws', async () => {
    let captured: any = null;
    const r = await logOperationsApprovalAudit(
      { eventType: 'production_approval_rejected', scope: MANUAL_REAL_RUN_SCOPE, status: 'rejected', reasonCode: 'APPROVAL_EXPIRED' },
      { rpc: async (a) => { captured = a; return { data: 'id-1', error: null }; } },
    );
    expect(r.ok).toBe(true);
    expect(captured._job_name).toBe(OPERATIONS_APPROVAL_AUDIT_JOB_NAME);
    expect(captured._function_name).toBe(OPERATIONS_APPROVAL_AUDIT_FUNCTION_NAME);
  });

  it('returns ok:false on RPC error without throwing', async () => {
    const r = await logOperationsApprovalAudit(
      { eventType: 'guard_denied', scope: MANUAL_REAL_RUN_SCOPE, status: 'denied' },
      { rpc: async () => { throw new Error('boom'); } },
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/boom/);
  });
});

describe('2P — requestManualRealRun integrates audit and stays denied', () => {
  it('writes audit and returns rejected for missing approval', async () => {
    const { writer, calls } = captureAudit();
    const r = await requestManualRealRun(baseRequest({ approval: undefined }), { logAudit: writer });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_REJECTION_REASONS.approvalMissing);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1].reasonCode).toBe('APPROVAL_MISSING');
    expect(r.audit?.ok).toBe(true);
  });

  it('audit writes for wrong scope, expired, env-only, confirmation-only', async () => {
    const cases: Array<[Partial<ManualRealRunRequest>, string]> = [
      [{ approval: validApproval({ scope: 'x' as any }) }, 'APPROVAL_WRONG_SCOPE'],
      [{ approval: validApproval({ expiresAt: new Date(Date.now() - 1000).toISOString() }) }, 'APPROVAL_EXPIRED'],
      [{ confirmationToken: '', approval: undefined }, 'CONFIRMATION_TOKEN_MISSING'],
      [{ approval: validApproval() }, 'PRODUCTION_APPROVAL_REQUIRED'],
    ];
    for (const [o, expected] of cases) {
      const { writer, calls } = captureAudit();
      const r = await requestManualRealRun(baseRequest(o), { logAudit: writer });
      expect(r.accepted).toBe(false);
      expect(calls.at(-1)?.reasonCode).toBe(expected);
    }
  });

  it('audit failure does not enable execution', async () => {
    const failing: OperationsApprovalAuditWriter = async () => { throw new Error('audit down'); };
    const r = await requestManualRealRun(baseRequest({ approval: validApproval() }), { logAudit: failing });
    expect(r.accepted).toBe(false);
    expect(r.audit?.ok).toBe(false);
  });
});

describe('2P — listOperationsApprovalAudit caps & sanitizes', () => {
  it('caps at OPERATIONS_APPROVAL_AUDIT_CAP and sanitizes unknown keys', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `id-${i}`, job_name: OPERATIONS_APPROVAL_AUDIT_JOB_NAME, started_at: '2026-01-01T00:00:00Z',
      finished_at: null, ok: false, status: 'rejected', duration_ms: 5, error_code: null,
      summary: {
        eventType: 'manual_real_run_rejected', status: 'rejected', reasonCode: 'APPROVAL_MISSING',
        approvalTicket: 'OPS-1', dryRun: false, enableWrites: true, enableNotificationWrites: true,
        guardReason: 'flag disabled', context: 'server',
        // unsafe extras that must be dropped:
        email: 'a@b.com', phone: '+966500000000', rawRow: { id: 'x' }, notificationBody: 'hi',
      },
    }));
    const r = await listOperationsApprovalAudit(9999, {
      read: async () => ({ data: rows, error: null }),
    });
    expect(r.ok).toBe(true);
    expect(r.entries.length).toBe(OPERATIONS_APPROVAL_AUDIT_CAP);
    for (const e of r.entries) {
      expect(JSON.stringify(e)).not.toMatch(/a@b\.com|\+966|notificationBody|rawRow/);
    }
  });
});

describe('2P — manualRealRunRequest module purity (no Supabase, no dispatch)', () => {
  const file = readFileSync(
    resolve(__dirname, '../modules/operations/services/manualRealRunRequest.ts'),
    'utf-8',
  );
  it('does not import supabase client', () => {
    expect(file).not.toMatch(/@\/integrations\/supabase\/client/);
  });
  it('does not call alert writer / dispatcher / cron', () => {
    expect(file).not.toMatch(/createSupabaseAlertWriter\s*\(/);
    expect(file).not.toMatch(/createInAppNotificationDispatcher\s*\(/);
    expect(file).not.toMatch(/dispatchSlaSweep\s*\(/);
    expect(file).not.toMatch(/cron\.schedule|pg_cron/);
  });
});

describe('2P — AdminOperations dashboard exposes approval audit logging', () => {
  function renderPage() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AdminOperations /></MemoryRouter>
      </QueryClientProvider>,
    );
  }
  it('shows "Approval audit logging: Enabled" row', () => {
    renderPage();
    const panel = screen.getByTestId('readiness-panel');
    expect(panel.textContent ?? '').toMatch(/approval audit logging/i);
    expect(panel.textContent ?? '').toMatch(/enabled/i);
  });
  it('renders approval audit section', async () => {
    renderPage();
    // ADMIN-OPS-TAB-CONSOLIDATION: detailed sections moved into tabs.
    // The approval audit lives under the "Audit" tab; switch to it first.
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: /Audit/i }));
    });
    expect(await screen.findByTestId('approval-audit')).toBeTruthy();
  });
  it('does not render real-run / approval / unlock / cron buttons', () => {
    renderPage();
    const forbidden = [/run real/i, /real[- ]?run/i, /unlock/i, /approve production/i, /enable cron/i, /schedule cron/i, /send notification/i];
    for (const b of screen.queryAllByRole('button')) {
      for (const re of forbidden) expect(b.textContent ?? '').not.toMatch(re);
    }
  });
});