/**
 * BUSINESS-OPERATIONS-2S — Server-only manual SLA real-run invocation
 * harness tests.
 *
 * Verifies that `invokeManualSlaRealRunHarness`:
 *   - is denied by default and in browser context,
 *   - refuses without admin/service_role,
 *   - refuses without the real-run flag,
 *   - refuses without production approval / confirmation token,
 *   - refuses without an injected alert writer / pre-run logger / audit writer,
 *   - never throws,
 *   - succeeds only with the full server-only alert-write gates AND an
 *     injected writer,
 *   - keeps notification writes deferred and never calls a dispatcher,
 *   - preserves idempotency (re-runs return skipped, not duplicated),
 *   - does not introduce cron, UI run controls, SMS/email/push/WhatsApp
 *     surfaces, source mutations, or PII.
 *   - the optional script skeleton defaults to denied/preview only.
 *
 * The harness file itself must remain Supabase-free.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  invokeManualSlaRealRunHarness,
  MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS,
  EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS,
  NOTIFICATION_WRITES_DEFERRED_REASON,
  MANUAL_REAL_RUN_SCOPE,
  OPERATIONS_REAL_RUN_FLAG,
  type ManualSlaRealRunHarnessInput,
  type OperationsProductionApproval,
  type ManualRealRunRequest,
  type AlertWriter,
  type AlertWriteResult,
  type CreateOperationalAlertInput,
  type SweepCandidate,
  type ExecuteManualSlaRealRunContext,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00Z');
const TWO_DAYS_AGO = new Date(NOW.getTime() - 48 * 60 * 60 * 1000).toISOString();

const approval: OperationsProductionApproval = {
  approved: true,
  scope: MANUAL_REAL_RUN_SCOPE,
  approvedBy: 'ops-lead-uuid',
  approvedAt: new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(),
  approvalTicket: 'OPS-2S',
  expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
};

const baseRequest = (
  o: Partial<ManualRealRunRequest> = {},
): ManualRealRunRequest => ({
  requestedBy: 'admin-uuid',
  confirmationToken: 'I-UNDERSTAND-THE-RISK',
  reason: '2S harness verification',
  dryRun: false,
  enableWrites: true,
  enableNotificationWrites: false,
  ...o,
});

const serverAdmin: ExecuteManualSlaRealRunContext = {
  executionContext: 'server',
  role: 'admin',
};

const guardEnvServerEnabled = {
  context: 'server' as const,
  env: { [OPERATIONS_REAL_RUN_FLAG]: 'true' },
};

const candidate: SweepCandidate = {
  conditionCode: 'lead.submitted_not_viewed_24h',
  entityId: 'quote-req-1',
  conditionSince: TWO_DAYS_AGO,
};

function createInMemoryWriter() {
  const created = new Map<string, { id: string }>();
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
      created.set(input.idempotencyKey, { id });
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
  return { writer, calls };
}

function makeInput(
  overrides: Partial<ManualSlaRealRunHarnessInput> = {},
): ManualSlaRealRunHarnessInput {
  const { writer } = createInMemoryWriter();
  return {
    request: baseRequest(),
    context: serverAdmin,
    approval,
    candidates: [candidate],
    existingAlerts: [],
    alertWriter: writer,
    preRunLogger: vi.fn(async () => {}),
    postRunLogger: vi.fn(async () => {}),
    auditWriter: vi.fn(async () => ({ ok: true, id: 'audit-s-1' })),
    guardEnv: guardEnvServerEnabled,
    now: NOW,
    ...overrides,
  };
}

describe('2S — invokeManualSlaRealRunHarness fail-closed gates', () => {
  it('denies when input bag is missing', async () => {
    const r = await invokeManualSlaRealRunHarness(undefined as never);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.inputMissing,
    );
    expect(r.notificationsDeferredReason).toBe(NOTIFICATION_WRITES_DEFERRED_REASON);
    expect(typeof r.requestId).toBe('string');
    expect(r.requestId.length).toBeGreaterThan(0);
  });

  it('denies in browser context', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({
        context: { executionContext: 'browser', role: 'admin' },
      }),
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.serverContextRequired,
    );
    expect(r.context).toBe('browser');
  });

  it('denies without admin/service_role', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({
        context: { executionContext: 'server', role: 'user' },
      }),
    );
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.adminRoleRequired,
    );
  });

  it('denies without pre-run logger', async () => {
    const r = await invokeManualSlaRealRunHarness(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeInput({ preRunLogger: undefined as any }),
    );
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.preRunLoggerMissing,
    );
  });

  it('denies without audit writer', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ auditWriter: undefined }),
    );
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.auditWriterMissing,
    );
  });

  it('denies without alert writer', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ alertWriter: undefined }),
    );
    expect(r.reason).toBe(
      MANUAL_SLA_REAL_RUN_HARNESS_REJECTION_REASONS.alertWriterMissing,
    );
  });

  it('denies when OPERATIONS_REAL_RUN_ENABLED is not true', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ guardEnv: { context: 'server', env: {} } }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.realRunFlagDisabled,
    );
  });

  it('denies without valid production approval', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ approval: { ...approval, approved: false } }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.approvalInvalid,
    );
  });

  it('denies without confirmation token', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ request: baseRequest({ confirmationToken: '' }) }),
    );
    expect(r.reason).toBe(
      EXECUTE_MANUAL_REAL_RUN_REJECTION_REASONS.confirmationMissing,
    );
  });

  it('denies when pre-run log fails and never calls writer', async () => {
    const { writer, calls } = createInMemoryWriter();
    const r = await invokeManualSlaRealRunHarness(
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
    expect(calls).toEqual([]);
  });
});

describe('2S — successful server-only invocation', () => {
  it('accepts when every gate is satisfied and a writer is injected', async () => {
    const { writer, calls } = createInMemoryWriter();
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ alertWriter: writer }),
    );
    expect(r.accepted).toBe(true);
    expect(r.reason).toBeUndefined();
    expect(r.scope).toBe(MANUAL_REAL_RUN_SCOPE);
    expect(r.context).toBe('server');
    expect(r.runLog).toBeDefined();
    expect(r.executionSummary).toBeDefined();
    expect(r.executionSummary?.notificationsDeferred).toBe(true);
    expect(r.executionSummary?.notificationsDeferredReason).toBe(
      NOTIFICATION_WRITES_DEFERRED_REASON,
    );
    // At least the candidate created path was attempted.
    expect(calls.some((c) => c.kind === 'create')).toBe(true);
    expect(calls.some((c) => c.kind === 'escalate')).toBe(false);
    expect(calls.some((c) => c.kind === 'resolve')).toBe(false);
  });

  it('forces notificationsDeferred even when caller requests notification writes', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({
        request: baseRequest({ enableNotificationWrites: true }),
      }),
    );
    expect(r.accepted).toBe(true);
    expect(r.notificationsDeferredReason).toBe(
      NOTIFICATION_WRITES_DEFERRED_REASON,
    );
    expect(r.executionSummary?.notificationsDeferred).toBe(true);
  });

  it('idempotent re-run does not duplicate alerts', async () => {
    const { writer, calls } = createInMemoryWriter();
    const first = await invokeManualSlaRealRunHarness(
      makeInput({ alertWriter: writer }),
    );
    expect(first.accepted).toBe(true);
    const createdFirst = first.executionSummary?.created ?? 0;
    expect(createdFirst).toBeGreaterThan(0);

    const second = await invokeManualSlaRealRunHarness(
      makeInput({ alertWriter: writer }),
    );
    expect(second.accepted).toBe(true);
    // Second run must NOT create new alerts — idempotency_key collisions
    // route the writer to `skipped`.
    expect(second.executionSummary?.created ?? 0).toBe(0);
    expect((second.executionSummary?.skipped ?? 0)).toBeGreaterThan(0);
    // Writer was called both times but never produced duplicates.
    const totalCreateCalls = calls.filter((c) => c.kind === 'create').length;
    expect(totalCreateCalls).toBeGreaterThanOrEqual(2);
  });

  it('public function never throws on unexpected dep failure', async () => {
    const explodingWriter: AlertWriter = {
      async create() {
        throw new Error('writer exploded');
      },
      async escalate() {
        throw new Error('writer exploded');
      },
      async resolve() {
        throw new Error('writer exploded');
      },
    };
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ alertWriter: explodingWriter }),
    );
    // alertWriters' Supabase impl catches; injected writer here throws.
    // The harness must surface a structured envelope, never reject.
    expect(r).toBeDefined();
    expect(typeof r.accepted).toBe('boolean');
  });

  it('returns a deterministic requestId when caller provides one', async () => {
    const r = await invokeManualSlaRealRunHarness(
      makeInput({ requestId: 'rid-2s-fixed' }),
    );
    expect(r.requestId).toBe('rid-2s-fixed');
  });
});

describe('2S — file-level safety contract', () => {
  const harnessPath = resolve(
    __dirname,
    '..',
    'modules/operations/services/manualSlaRealRunHarness.ts',
  );
  const harnessSrc = readFileSync(harnessPath, 'utf-8');

  it('harness module is Supabase-free', () => {
    expect(harnessSrc).not.toMatch(/@\/integrations\/supabase\/client/);
    expect(harnessSrc).not.toMatch(/from\s+['"]@supabase\/supabase-js['"]/);
  });

  it('harness does NOT import notification dispatcher / channel surfaces', () => {
    expect(harnessSrc).not.toMatch(/dispatchPlannedNotifications/);
    expect(harnessSrc).not.toMatch(/notificationDispatcher/);
    expect(harnessSrc).not.toMatch(/sendSms|sendEmail|sendWhatsApp|sendPush/i);
  });

  it('harness does NOT introduce cron scheduling', () => {
    expect(harnessSrc).not.toMatch(/cron\.schedule|setInterval\(/);
  });

  it('harness does NOT expose PII fields in its return envelope', () => {
    // Defensive grep — the result type must not surface raw rows, phones,
    // emails, addresses, recipient ids, or notification bodies.
    expect(harnessSrc).not.toMatch(/phone|email|address|recipientId|notificationBody/i);
  });
});

describe('2S — admin UI placeholder remains read-only', () => {
  const uiPath = resolve(__dirname, '..', 'pages/admin/AdminOperations.tsx');
  const uiSrc = readFileSync(uiPath, 'utf-8');

  it('exposes "Server-only" and "Disabled" / "Deferred" labels', () => {
    expect(uiSrc).toMatch(/Server-only/);
    expect(uiSrc).toMatch(/Disabled/);
    expect(uiSrc).toMatch(/Deferred/);
  });

  it('does NOT add a real-run / unlock / approval button or modal', () => {
    // Allow neutral words in copy/labels, but forbid handler-style bindings
    // that would wire a mutation from the UI in this phase.
    expect(uiSrc).not.toMatch(/onClick=\{[^}]*invokeManualSlaRealRunHarness/);
    expect(uiSrc).not.toMatch(/onClick=\{[^}]*executeManualSlaRealRun/);
    expect(uiSrc).not.toMatch(/onClick=\{[^}]*requestManualRealRun/);
    expect(uiSrc).not.toMatch(/onClick=\{[^}]*confirmationToken/);
  });

  it('does NOT introduce SMS/Email/WhatsApp/Push send surfaces', () => {
    expect(uiSrc).not.toMatch(/sendSms|sendEmail|sendWhatsApp|sendPush/i);
  });
});

describe('2S — script skeleton defaults to denied/preview', () => {
  const scriptPath = resolve(
    __dirname,
    '..',
    '..',
    'scripts/operations-manual-sla-real-run.mjs',
  );

  it('exits non-zero with denied report when no flags are set', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: { PATH: process.env.PATH ?? '' },
      encoding: 'utf-8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toMatch(/"mode": "denied"/);
    expect(result.stdout).toMatch(/"notifications": "deferred"/);
    expect(result.stdout).toMatch(/"cron": "disabled"/);
    expect(result.stdout).toMatch(/"uiExecution": "disabled"/);
    // Never leak env values verbatim.
    expect(result.stdout).not.toMatch(/OPERATIONS_MANUAL_HARNESS_APPROVAL_JSON":\s*"\{/);
  });

  it('still refuses to execute even when every flag is satisfied (2S skeleton stays a no-op)', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      env: {
        PATH: process.env.PATH ?? '',
        OPERATIONS_REAL_RUN_ENABLED: 'true',
        OPERATIONS_MANUAL_HARNESS_CONFIRM: 'I-UNDERSTAND-THE-RISK',
        OPERATIONS_MANUAL_HARNESS_APPROVAL_JSON: '{"approved":true,"scope":"manual_sla_real_run"}',
        OPERATIONS_EXEC_CONTEXT: 'server',
      },
      encoding: 'utf-8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toMatch(/"mode": "gates_open_no_op"/);
    expect(result.stdout).toMatch(/Refusing to execute/);
  });

  // Sanity: also assert path layout so this test fails loudly if the
  // script is renamed/removed without updating documentation.
  it('lives at scripts/operations-manual-sla-real-run.mjs', () => {
    const src = readFileSync(scriptPath, 'utf-8');
    expect(src).toMatch(/BUSINESS-OPERATIONS-2S/);
    expect(src).toMatch(/DEFAULTS FAIL CLOSED/);
  });
});

describe('2S — operations isolation allowlist remains narrow', () => {
  it('operations-isolation-audit allowlist unchanged for 2S', () => {
    const auditSrc = readFileSync(
      resolve(__dirname, '..', '..', 'scripts/operations-isolation-audit.mjs'),
      'utf-8',
    );
    expect(auditSrc).toMatch(/src\/modules\/operations\//);
    expect(auditSrc).toMatch(/src\/integrations\/supabase\//);
    // No new allowed roots were silently added.
    const allowedMatches = auditSrc.match(/ALLOWED_DIR_PREFIXES\s*=\s*\[[\s\S]*?\];/);
    expect(allowedMatches).not.toBeNull();
    const list = allowedMatches![0];
    const count = (list.match(/'src\//g) || []).length;
    expect(count).toBe(2);
  });
});