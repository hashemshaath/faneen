/**
 * BUSINESS-OPERATIONS-2R — Controlled server-only manual SLA real-run.
 *
 * Verifies the full guard chain, alert-write execution, notification
 * deferral, idempotency, audit/run-log integration, and confirms no UI,
 * cron, notification, SMS/email/push/WhatsApp, or PII surfaces are
 * introduced. The executor must never throw and never call notification
 * dispatchers in this phase.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  executeManualSlaRealRun,
  EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS,
  NOTIFICATION_WRITES_DEFERRED_REASON,
  MANUAL_REAL_RUN_SCOPE,
  OPERATIONS_REAL_RUN_FLAG,
  type ExecuteManualSlaRealRunInput,
  type ExecuteManualSlaRealRunContext,
  type OperationsProductionApproval,
  type ManualRealRunRequest,
  type AlertWriter,
  type AlertWriteResult,
  type CreateOperationalAlertInput,
  type SweepCandidate,
  type ExistingAlert,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00Z');
const TWO_DAYS_AGO = new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString();

const validApproval: OperationsProductionApproval = {
  approved: true,
  scope: MANUAL_REAL_RUN_SCOPE,
  approvedBy: 'ops-lead-uuid',
  approvedAt: new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(),
  approvalTicket: 'OPS-1234',
  expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
};

const baseRequest = (
  o: Partial<ManualRealRunRequest> = {},
): ManualRealRunRequest => ({
  requestedBy: 'admin-uuid',
  confirmationToken: 'I-UNDERSTAND-THE-RISK',
  reason: 'investigating SLA escalations',
  dryRun: false,
  enableWrites: true,
  enableNotificationWrites: false,
  ...o,
});

const serverAdmin: ExecuteManualSlaRealRunContext = {
  executionContext: 'server',
  role: 'admin',
};

const SERVER_ENV_REAL_RUN_TRUE = {
  context: 'server' as const,
  env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
};

const candidate: SweepCandidate = {
  conditionCode: 'lead.submitted_not_viewed_24h',
  entityId: 'quote-req-1',
  conditionSince: TWO_DAYS_AGO,
};

/**
 * In-memory alert writer that mimics idempotent_key behavior. Tracks calls
 * for assertions and refuses duplicate creates with the same key.
 */
function createInMemoryWriter() {
  const created = new Map<string, { id: string; severity: string }>();
  const calls: { kind: 'create' | 'escalate' | 'resolve'; input: unknown }[] = [];
  let counter = 0;
  const writer: AlertWriter = {
    async create(input: CreateOperationalAlertInput): Promise<AlertWriteResult> {
      calls.push({ kind: 'create', input });
      const existing = created.get(input.idempotencyKey);
      if (existing) {
        return {
          outcome: 'skipped',
          alertId: existing.id,
          reason: 'idempotency_key already used',
        };
      }
      counter += 1;
      const id = `alert-${counter}`;
      created.set(input.idempotencyKey, { id, severity: input.severity });
      return { outcome: 'created', alertId: id };
    },
    async escalate(input) {
      calls.push({ kind: 'escalate', input });
      return { outcome: 'escalated', alertId: input.alertId };
    },
    async resolve(input) {
      calls.push({ kind: 'resolve', input });
      return { outcome: 'resolved', alertId: input.alertId };
    },
  };
  return { writer, calls, created };
}

function makeInput(
  overrides: Partial<ExecuteManualSlaRealRunInput> = {},
): ExecuteManualSlaRealRunInput {
  const { writer } = createInMemoryWriter();
  return {
    request: baseRequest(),
    context: serverAdmin,
    approval: validApproval,
    candidates: [candidate],
    existingAlerts: [],
    alertWriter: writer,
    preRunLogger: vi.fn(async () => {}),
    postRunLogger: vi.fn(async () => {}),
    auditWriter: vi.fn(async () => ({ ok: true, id: 'audit-1' })),
    guardEnv: SERVER_ENV_REAL_RUN_TRUE,
    now: NOW,
    ...overrides,
  };
}

describe('2R — executeManualSlaRealRun guard chain', () => {
  it('denies when executionContext is not server', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        context: { executionContext: 'browser', role: 'admin' },
      }),
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.serverContextRequired,
    );
  });

  it('denies when role is not admin/service_role', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        context: { executionContext: 'server', role: 'user' },
      }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.adminRoleRequired,
    );
  });

  it('denies when OPERATIONS_REAL_RUN_ENABLED is not true', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        guardEnv: { context: 'server', env: {} },
      }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.realRunFlagDisabled,
    );
  });

  it('denies when production approval is invalid', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        approval: { ...validApproval, approved: false },
      }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.approvalInvalid,
    );
  });

  it('denies when confirmation token is missing', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        request: baseRequest({ confirmationToken: '' }),
      }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.confirmationMissing,
    );
  });

  it('denies when alert writer is missing', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({ alertWriter: undefined }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.alertWriterMissing,
    );
  });

  it('denies when pre-run log fails and never calls writer', async () => {
    const { writer, calls } = createInMemoryWriter();
    const r = await executeManualSlaRealRun(
      makeInput({
        alertWriter: writer,
        preRunLogger: vi.fn(async () => {
          throw new Error('boom');
        }),
      }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.preRunLogFailed,
    );
    expect(calls).toHaveLength(0);
  });

  it('denies dryRun:true requests', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({ request: baseRequest({ dryRun: true }) }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.dryRunMustBeFalse,
    );
  });

  it('denies enableWrites:false requests', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({ request: baseRequest({ enableWrites: false }) }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.writesMustBeEnabled,
    );
  });
});

describe('2R — executeManualSlaRealRun alert writes', () => {
  it('accepts and calls alert writer for create action', async () => {
    const { writer, calls } = createInMemoryWriter();
    const preLog = vi.fn(async () => {});
    const postLog = vi.fn(async () => {});
    const audit = vi.fn(async () => ({ ok: true, id: 'aud' }));
    const r = await executeManualSlaRealRun(
      makeInput({
        alertWriter: writer,
        preRunLogger: preLog,
        postRunLogger: postLog,
        auditWriter: audit,
      }),
    );
    expect(r.accepted).toBe(true);
    expect(r.apply?.applied).toBe(true);
    expect(r.apply?.totals.created).toBe(1);
    expect(calls.filter((c) => c.kind === 'create')).toHaveLength(1);
    expect(preLog).toHaveBeenCalledTimes(1);
    expect(postLog).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalled();
  });

  it('calls escalate writer for promotion candidates', async () => {
    const { writer, calls } = createInMemoryWriter();
    // Candidate that already has a warning-level alert older than the
    // promotion tick → should escalate.
    const FOUR_DAYS_AGO = new Date(
      NOW.getTime() - 4 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const existing: ExistingAlert = {
      id: 'alert-existing-1',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'quote-req-1',
      severity: 'warning',
      status: 'open',
      triggeredAt: FOUR_DAYS_AGO,
      idempotencyKey: 'k1',
    };
    const r = await executeManualSlaRealRun(
      makeInput({
        alertWriter: writer,
        candidates: [{ ...candidate, conditionSince: FOUR_DAYS_AGO }],
        existingAlerts: [existing],
      }),
    );
    expect(r.accepted).toBe(true);
    expect(calls.some((c) => c.kind === 'escalate')).toBe(true);
  });

  it('calls resolve writer when candidate is resolved', async () => {
    const { writer, calls } = createInMemoryWriter();
    const existing: ExistingAlert = {
      id: 'alert-existing-2',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'quote-req-1',
      severity: 'warning',
      status: 'open',
      triggeredAt: TWO_DAYS_AGO,
      idempotencyKey: 'k2',
    };
    const r = await executeManualSlaRealRun(
      makeInput({
        alertWriter: writer,
        candidates: [{ ...candidate, resolved: true }],
        existingAlerts: [existing],
      }),
    );
    expect(r.accepted).toBe(true);
    expect(calls.some((c) => c.kind === 'resolve')).toBe(true);
  });

  it('is idempotent on repeated execution (no duplicate create)', async () => {
    const { writer, calls, created } = createInMemoryWriter();
    const r1 = await executeManualSlaRealRun(makeInput({ alertWriter: writer }));
    const r2 = await executeManualSlaRealRun(makeInput({ alertWriter: writer }));
    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(true);
    expect(created.size).toBe(1);
    const createCalls = calls.filter((c) => c.kind === 'create');
    expect(createCalls).toHaveLength(2);
    // Second create returns skipped (no duplicate), surfaced in totals.
    expect(r2.apply?.totals.created).toBe(0);
    expect(r2.apply?.totals.skipped).toBeGreaterThanOrEqual(1);
  });
});

describe('2R — executeManualSlaRealRun notification deferral', () => {
  it('defers notification writes even when requested', async () => {
    const r = await executeManualSlaRealRun(
      makeInput({
        request: baseRequest({ enableNotificationWrites: true }),
      }),
    );
    expect(r.accepted).toBe(true);
    expect(r.notificationsDeferredReason).toBe(
      NOTIFICATION_WRITES_DEFERRED_REASON,
    );
  });

  it('does not import or call any notification dispatcher in the service file', () => {
    const src = readFileSync(
      resolve(
        __dirname,
        '..',
        'modules/operations/services/executeManualSlaRealRun.ts',
      ),
      'utf-8',
    );
    expect(src).not.toMatch(/notificationDispatcher/);
    expect(src).not.toMatch(/notificationRecipients/);
    expect(src).not.toMatch(/dispatchPlannedNotifications/);
    expect(src).not.toMatch(/\bsms\b/i);
    expect(src).not.toMatch(/whatsapp/i);
    expect(src).not.toMatch(/\bpush\b/i);
    expect(src).not.toMatch(/sendgrid|resend|twilio/i);
  });
});

describe('2R — executeManualSlaRealRun audit / log behavior', () => {
  it('audit failure does NOT enable execution when guards already fail', async () => {
    const audit = vi.fn(async () => ({ ok: false, error: 'audit down' }));
    const r = await executeManualSlaRealRun(
      makeInput({
        context: { executionContext: 'browser', role: 'admin' },
        auditWriter: audit,
      }),
    );
    expect(r.accepted).toBe(false);
    expect(audit).toHaveBeenCalled();
  });

  it('post-run log failure surfaces postRunLogError but keeps writes applied', async () => {
    const { writer } = createInMemoryWriter();
    const r = await executeManualSlaRealRun(
      makeInput({
        alertWriter: writer,
        postRunLogger: vi.fn(async () => {
          throw new Error('post boom');
        }),
      }),
    );
    expect(r.accepted).toBe(true);
    expect(r.apply?.totals.created).toBe(1);
    expect(r.postRunLogError).toMatch(/post boom/);
  });

  it('never throws, even when every dep throws', async () => {
    const writer: AlertWriter = {
      create: async () => {
        throw new Error('writer create boom');
      },
      escalate: async () => ({ outcome: 'failed', error: 'x' }),
      resolve: async () => ({ outcome: 'failed', error: 'x' }),
    };
    let result: unknown;
    await expect(
      (async () => {
        result = await executeManualSlaRealRun(
          makeInput({
            alertWriter: writer,
            preRunLogger: vi.fn(async () => {}),
            postRunLogger: vi.fn(async () => {
              throw new Error('post boom');
            }),
            auditWriter: vi.fn(async () => {
              throw new Error('audit boom');
            }),
          }),
        );
      })(),
    ).resolves.not.toThrow();
    expect(result).toBeDefined();
  });
});

describe('2R — service file isolation', () => {
  const src = readFileSync(
    resolve(
      __dirname,
      '..',
      'modules/operations/services/executeManualSlaRealRun.ts',
    ),
    'utf-8',
  );

  it('contains no Supabase imports (pure module)', () => {
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
  });

  it('contains no cron wiring or scheduler references', () => {
    expect(src).not.toMatch(/cron\.schedule|setInterval|setTimeout\(/);
  });

  it('contains no source-domain table writes', () => {
    expect(src).not.toMatch(/quote_requests|contracts|payment_intents|business_staff_invitations/);
  });
});

describe('2R — AdminOperations dashboard remains safe', () => {
  const src = readFileSync(
    resolve(__dirname, '..', 'pages/admin/AdminOperations.tsx'),
    'utf-8',
  );

  it('does not introduce real-run / cron / notification-send / unlock controls', () => {
    // Allow descriptive labels in readiness rows but forbid action wiring.
    expect(src).not.toMatch(/onClick=\{[^}]*executeManualSlaRealRun/);
    expect(src).not.toMatch(/onClick=\{[^}]*requestManualRealRun/);
    expect(src).not.toMatch(/onClick=\{[^}]*handleManualRealRunEndpoint/);
    expect(src).not.toMatch(/Schedule cron|Enable cron/i);
    expect(src).not.toMatch(/Send notification|Send SMS|Send email|Send push/i);
    expect(src).not.toMatch(/Unlock real-run|Approve production/i);
  });

  it('does not import the controlled executor (UI must stay disabled)', () => {
    expect(src).not.toMatch(/executeManualSlaRealRun/);
  });
});

describe('2R — public API contract', () => {
  it('exports executor + rejection reasons + notification deferred constant', async () => {
    const mod = await import('@/modules/operations');
    expect(typeof mod.executeManualSlaRealRun).toBe('function');
    expect(mod.EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS).toBeDefined();
    expect(mod.NOTIFICATION_WRITES_DEFERRED_REASON).toBe(
      'NOTIFICATION_WRITES_DEFERRED',
    );
  });
});