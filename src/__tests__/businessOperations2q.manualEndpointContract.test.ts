/**
 * BUSINESS-OPERATIONS-2Q — Server-only manual real-run endpoint contract.
 *
 * Endpoint must ALWAYS reject in this phase. It must never call
 * dispatch / alert writer / notification dispatcher. Structural guard
 * order is exercised, audit integration is exercised, and module purity
 * + isolation allowlists are re-asserted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  handleManualRealRunEndpoint,
  validateManualRealRunEndpointRequest,
  MANUAL_REAL_RUN_ENDPOINT_DISABLED_REASON,
  MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS,
  MANUAL_REAL_RUN_SCOPE,
  type ManualRealRunEndpointRequest,
  type ManualRealRunEndpointContext,
  type ManualRealRunEndpointAuditWriter,
  type OperationsProductionApproval,
} from '@/modules/operations';

const validApproval = (
  o: Partial<OperationsProductionApproval> = {},
): OperationsProductionApproval => ({
  approved: true,
  approvedBy: 'cto@example.com',
  approvedAt: new Date().toISOString(),
  approvalTicket: 'OPS-2026-002',
  scope: MANUAL_REAL_RUN_SCOPE,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...o,
});

const baseRequest = (
  o: Partial<ManualRealRunEndpointRequest> = {},
): ManualRealRunEndpointRequest => ({
  requestedBy: 'admin-uuid',
  reason: 'investigating escalations',
  confirmationToken: 'I-UNDERSTAND-THE-RISK',
  dryRun: false,
  enableWrites: true,
  enableNotificationWrites: false,
  productionApproval: validApproval(),
  ...o,
});

const serverAdminCtx: ManualRealRunEndpointContext = {
  executionContext: 'server',
  role: 'admin',
  source: 'server_job',
  requestId: 'req-1',
};

function captureAudit() {
  const calls: Parameters<ManualRealRunEndpointAuditWriter>[0][] = [];
  const writer: ManualRealRunEndpointAuditWriter = async (input) => {
    calls.push(input);
    return { ok: true, id: 'audit-id' };
  };
  return { writer, calls };
}

describe('2Q — validateManualRealRunEndpointRequest guard chain order', () => {
  it('server context required', () => {
    expect(
      validateManualRealRunEndpointRequest(baseRequest(), {
        ...serverAdminCtx,
        executionContext: 'browser',
      }),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.serverContextRequired);
    expect(
      validateManualRealRunEndpointRequest(baseRequest(), {
        ...serverAdminCtx,
        executionContext: 'test',
      }),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.serverContextRequired);
  });

  it('admin / service_role required', () => {
    for (const role of ['user', 'anonymous'] as const) {
      expect(
        validateManualRealRunEndpointRequest(baseRequest(), {
          ...serverAdminCtx,
          role,
        }),
      ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.adminRoleRequired);
    }
  });

  it('confirmation token required', () => {
    expect(
      validateManualRealRunEndpointRequest(
        baseRequest({ confirmationToken: '' }),
        serverAdminCtx,
      ),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.confirmationMissing);
  });

  it('reason required', () => {
    expect(
      validateManualRealRunEndpointRequest(baseRequest({ reason: '   ' }), serverAdminCtx),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.reasonMissing);
  });

  it('approval required + must be valid', () => {
    expect(
      validateManualRealRunEndpointRequest(
        baseRequest({ productionApproval: undefined }),
        serverAdminCtx,
      ),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.approvalMissing);
    expect(
      validateManualRealRunEndpointRequest(
        baseRequest({ productionApproval: validApproval({ approved: false }) }),
        serverAdminCtx,
      ),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.approvalInvalid);
  });

  it('dryRun must be false + enableWrites must be true', () => {
    expect(
      validateManualRealRunEndpointRequest(baseRequest({ dryRun: true }), serverAdminCtx),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.dryRunMustBeFalse);
    expect(
      validateManualRealRunEndpointRequest(
        baseRequest({ enableWrites: false }),
        serverAdminCtx,
      ),
    ).toBe(MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.writesMustBeEnabled);
  });

  it('returns null when every structural check passes', () => {
    expect(
      validateManualRealRunEndpointRequest(baseRequest(), serverAdminCtx),
    ).toBeNull();
  });
});

describe('2Q — handleManualRealRunEndpoint ALWAYS rejected', () => {
  it('returns ENDPOINT_DISABLED for a fully-valid request', async () => {
    const { writer, calls } = captureAudit();
    const r = await handleManualRealRunEndpoint(baseRequest(), serverAdminCtx, {
      logAudit: writer,
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(MANUAL_REAL_RUN_ENDPOINT_DISABLED_REASON);
    expect(r.scope).toBe(MANUAL_REAL_RUN_SCOPE);
    expect(r.requestId).toBe('req-1');
    expect(r.context).toEqual({
      executionContext: 'server',
      role: 'admin',
      source: 'server_job',
    });
    expect(calls.length).toBe(1);
    expect(calls[0].reasonCode).toBe(MANUAL_REAL_RUN_ENDPOINT_DISABLED_REASON);
  });

  it('reports the most specific structural reason when present', async () => {
    const { writer, calls } = captureAudit();
    const r = await handleManualRealRunEndpoint(baseRequest(), {
      ...serverAdminCtx,
      executionContext: 'browser',
    }, { logAudit: writer });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(
      MANUAL_REAL_RUN_ENDPOINT_REJECTION_REASONS.serverContextRequired,
    );
    expect(calls[0].context).toBe('browser');
  });

  it('flags-alone / approval-alone / confirmation-alone all stay rejected', async () => {
    const cases: Array<Partial<ManualRealRunEndpointRequest>> = [
      { productionApproval: undefined, confirmationToken: '' },
      { productionApproval: undefined },
      { confirmationToken: '' },
    ];
    for (const o of cases) {
      const r = await handleManualRealRunEndpoint(baseRequest(o), serverAdminCtx);
      expect(r.accepted).toBe(false);
    }
  });

  it('audit failure does NOT enable execution', async () => {
    const failing: ManualRealRunEndpointAuditWriter = async () => {
      throw new Error('audit down');
    };
    const r = await handleManualRealRunEndpoint(baseRequest(), serverAdminCtx, {
      logAudit: failing,
    });
    expect(r.accepted).toBe(false);
    expect(r.audit?.ok).toBe(false);
  });

  it('response never echoes raw request body', async () => {
    const r = await handleManualRealRunEndpoint(
      baseRequest({ reason: 'SECRET-NOTE-DO-NOT-LEAK' }),
      serverAdminCtx,
    );
    expect(JSON.stringify(r)).not.toMatch(/SECRET-NOTE-DO-NOT-LEAK/);
    expect(JSON.stringify(r)).not.toMatch(/I-UNDERSTAND-THE-RISK/);
  });
});

describe('2Q — module purity & isolation', () => {
  const file = readFileSync(
    resolve(__dirname, '../modules/operations/services/manualRealRunEndpointContract.ts'),
    'utf-8',
  );

  it('does not import the supabase client', () => {
    expect(file).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does not call alert writers, dispatcher, dispatch, or cron', () => {
    expect(file).not.toMatch(/createSupabaseAlertWriter\s*\(/);
    expect(file).not.toMatch(/createInAppNotificationDispatcher\s*\(/);
    expect(file).not.toMatch(/dispatchSlaSweep\s*\(/);
    expect(file).not.toMatch(/cron\.schedule|pg_cron/);
  });

  it('hard-codes a structural deny path', () => {
    expect(file).toMatch(/ENDPOINT_DISABLED/);
    expect(file).toMatch(/accepted:\s*false/);
  });

  it('operations services Supabase-import allowlist remains narrow', () => {
    const dir = resolve(__dirname, '../modules/operations/services');
    const supaImports: string[] = [];
    for (const f of readdirSync(dir)) {
      const src = readFileSync(resolve(dir, f), 'utf-8');
      if (/from\s+['"]@\/integrations\/supabase\/client['"]/.test(src)) {
        supaImports.push(f);
      }
    }
    // The new endpoint contract MUST NOT add itself to the Supabase
    // import set — it remains pure and DI-driven.
    expect(supaImports).not.toContain('manualRealRunEndpointContract.ts');
  });
});