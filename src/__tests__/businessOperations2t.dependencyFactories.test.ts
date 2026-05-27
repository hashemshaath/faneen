/**
 * BUSINESS-OPERATIONS-2T — Server-only dependency factory tests.
 *
 * Verifies that the audit writer, run logger, and alert writer
 * factories:
 *   - require an injected admin/service-role Supabase client (throw if
 *     missing),
 *   - never import the browser Supabase publishable client,
 *   - never import notification dispatchers / recipient resolvers /
 *     SMS/email/push/WhatsApp modules,
 *   - write only safe payloads,
 *   - forward idempotencyKey verbatim,
 *   - never forward skip-* actions (those are filtered by
 *     applySlaSweepPlan upstream and never reach the writer),
 *   - surface pre-run logger failure loudly (so the executor aborts),
 *   - surface post-run logger failure as a non-fatal `postRunLogError`,
 *   - can be composed with the harness in a test without auto-executing.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  createManualRunAuditWriter,
  createManualRunLogger,
  createManualRunAlertWriter,
  createManualRunDependencyBundle,
  invokeManualSlaRealRunHarness,
  MANUAL_REAL_RUN_SCOPE,
  OPERATIONS_REAL_RUN_FLAG,
  type ServerOnlyAdminClient,
  type ManualSlaRealRunHarnessInput,
  type OperationsProductionApproval,
  type ManualRealRunRequest,
  type SweepCandidate,
} from '@/modules/operations';

const FACTORY_FILE = resolve(
  __dirname,
  '../modules/operations/services/manualRealRunDependencies.ts',
);
const FACTORY_SOURCE = readFileSync(FACTORY_FILE, 'utf8');

// ── helpers ──────────────────────────────────────────────────────────────

function makeQueryBuilder(handlers: {
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.insert = chain;
  builder.update = chain;
  builder.eq = chain;
  builder.in = chain;
  builder.maybeSingle = handlers.maybeSingle;
  return builder as unknown as ReturnType<ServerOnlyAdminClient['from']>;
}

function makeAdminClient(over: Partial<ServerOnlyAdminClient> = {}): ServerOnlyAdminClient {
  return {
    rpc: vi.fn(async () => ({ data: 'rpc-id', error: null })),
    from: vi.fn(() =>
      makeQueryBuilder({
        maybeSingle: async () => ({ data: null, error: null }),
      }),
    ),
    ...over,
  };
}

// ── 1) Required-injection contract ───────────────────────────────────────

describe('2T: factories require an injected admin client', () => {
  it('audit writer throws synchronously when client missing', () => {
    expect(() =>
      createManualRunAuditWriter(undefined as unknown as never),
    ).toThrow(/admin Supabase client/);
    expect(() =>
      createManualRunAuditWriter({} as never),
    ).toThrow(/admin Supabase client/);
  });

  it('logger throws synchronously when client missing', () => {
    expect(() =>
      createManualRunLogger(undefined as unknown as never),
    ).toThrow(/admin Supabase client/);
  });

  it('alert writer throws synchronously when client missing', () => {
    expect(() =>
      createManualRunAlertWriter(undefined as unknown as never),
    ).toThrow(/admin Supabase client/);
  });

  it('bundle composer throws when client missing', () => {
    expect(() =>
      createManualRunDependencyBundle({} as never),
    ).toThrow(/admin Supabase client/);
  });
});

// ── 2) Audit writer behavior ─────────────────────────────────────────────

describe('2T: audit writer writes safe payload only', () => {
  it('forwards a sanitized summary via log_cron_run RPC', async () => {
    const rpc = vi.fn(async () => ({ data: 'audit-id', error: null }));
    const admin = makeAdminClient({ rpc });
    const writer = createManualRunAuditWriter({ supabaseAdmin: admin });

    const res = await writer({
      eventType: 'manual_real_run_requested',
      scope: 'manual_sla_real_run',
      status: 'accepted',
      reasonCode: 'OK',
      requestedBy: 'admin-uuid',
      requestedAt: '2026-05-27T00:00:00Z',
      approvalTicket: 'OPS-2T',
      expiresAt: '2026-05-27T01:00:00Z',
      dryRun: false,
      enableWrites: true,
      enableNotificationWrites: false,
      guardReason: null,
      context: 'server',
    });

    expect(res.ok).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    const call = rpc.mock.calls[0]!;
    const fn = call[0];
    const args = call[1] as Record<string, unknown> & {
      _summary: { scope: string };
    };
    expect(fn).toBe('log_cron_run');
    expect(args._function_name).toBe('operations-approval-audit');
    const summary = JSON.stringify(args._summary);
    // No PII / no notification body / no token leaks.
    expect(summary).not.toMatch(/phone|email|password|address|@/i);
    expect(args._summary.scope).toBe('manual_sla_real_run');
  });

  it('never throws on RPC failure — returns ok:false', async () => {
    const admin = makeAdminClient({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'db down' } })),
    });
    const writer = createManualRunAuditWriter({ supabaseAdmin: admin });
    const res = await writer({
      eventType: 'manual_real_run_rejected',
      scope: 'manual_sla_real_run',
      status: 'rejected',
      reasonCode: 'DENIED',
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('db down');
  });
});

// ── 3) Run logger behavior ───────────────────────────────────────────────

describe('2T: run logger pre/post semantics', () => {
  it('pre-run logger throws on RPC failure (so executor aborts)', async () => {
    const admin = makeAdminClient({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'log failed' } })),
    });
    const logger = createManualRunLogger({ supabaseAdmin: admin });
    await expect(
      logger({
        runType: 'sla-sweep',
        dryRun: false,
        startedAt: '2026-05-27T00:00:00Z',
        finishedAt: '2026-05-27T00:00:00Z',
        status: 'ok',
        totals: {
          candidates: 0, create: 0, escalate: 0, resolve: 0,
          skipped: 0, plannedNotifications: 0,
        },
      }),
    ).rejects.toThrow(/log failed/);
  });

  it('post-run logger failure is non-fatal at the executor boundary', async () => {
    // Logger itself throws — executor catches and surfaces it.
    // Here we just verify the logger throws cleanly (executor coverage
    // lives in 2R tests) so its contract matches `SlaRunLogger`.
    const admin = makeAdminClient({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'post failed' } })),
    });
    const logger = createManualRunLogger({ supabaseAdmin: admin });
    let caught: unknown;
    try {
      await logger({
        runType: 'sla-sweep',
        dryRun: false,
        startedAt: '2026-05-27T00:00:00Z',
        finishedAt: '2026-05-27T00:00:01Z',
        status: 'ok',
        totals: {
          candidates: 0, create: 0, escalate: 0, resolve: 0,
          skipped: 0, plannedNotifications: 0,
        },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
  });
});

// ── 4) Alert writer behavior ─────────────────────────────────────────────

describe('2T: alert writer forwards idempotency + safe outcomes', () => {
  it('preserves idempotencyKey verbatim in insert payload', async () => {
    let captured: unknown;
    const fromMock = vi.fn((_table: string) => {
      // First call: existence check returns null. Second call: insert.
      const calls = { stage: 0 };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.in = chain;
      builder.insert = (rows: unknown) => {
        captured = rows;
        calls.stage = 1;
        return builder;
      };
      builder.update = chain;
      builder.maybeSingle = async () => {
        if (calls.stage === 0) {
          calls.stage = 0.5; // existence-check resolved
          return { data: null, error: null };
        }
        return { data: { id: 'new-alert-id' }, error: null };
      };
      return builder as never;
    });
    const admin = makeAdminClient({ from: fromMock });
    const writer = createManualRunAlertWriter({ supabaseAdmin: admin });

    const out = await writer.create({
      domain: 'leads',
      entityType: 'quote_request',
      entityId: 'qr-1',
      conditionCode: 'lead_submitted_not_viewed_24h',
      severity: 'warning',
      idempotencyKey: 'leads:qr-1:lead_submitted_not_viewed_24h:2026-05-27',
      titleAr: 'x', titleEn: 'x', messageAr: 'x', messageEn: 'x',
    });
    expect(out.outcome).toBe('created');
    const inserted = (captured as Array<Record<string, unknown>>)[0];
    expect(inserted.idempotency_key).toBe(
      'leads:qr-1:lead_submitted_not_viewed_24h:2026-05-27',
    );
  });

  it('returns skipped when idempotencyKey already has an active alert', async () => {
    const admin = makeAdminClient({
      from: vi.fn(() =>
        makeQueryBuilder({
          maybeSingle: async () => ({
            data: { id: 'existing', status: 'open' },
            error: null,
          }),
        }),
      ),
    });
    const writer = createManualRunAlertWriter({ supabaseAdmin: admin });
    const out = await writer.create({
      domain: 'leads',
      entityType: 'quote_request',
      entityId: 'qr-1',
      conditionCode: 'lead_submitted_not_viewed_24h',
      severity: 'warning',
      idempotencyKey: 'dup-key',
      titleAr: 'x', titleEn: 'x', messageAr: 'x', messageEn: 'x',
    });
    expect(out.outcome).toBe('skipped');
    expect(out.alertId).toBe('existing');
  });

  it('refuses non-promoting severity changes (no DB call)', async () => {
    const fromSpy = vi.fn(() =>
      makeQueryBuilder({
        maybeSingle: async () => ({ data: { id: 'x', severity: 'critical' }, error: null }),
      }),
    );
    const admin = makeAdminClient({ from: fromSpy });
    const writer = createManualRunAlertWriter({ supabaseAdmin: admin });
    const out = await writer.escalate({
      alertId: 'a-1',
      currentSeverity: 'critical',
      targetSeverity: 'warning',
    });
    expect(out.outcome).toBe('skipped');
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('never throws on DB errors — returns failed envelope', async () => {
    const admin = makeAdminClient({
      from: vi.fn(() =>
        makeQueryBuilder({
          maybeSingle: async () => ({ data: null, error: { message: 'boom' } }),
        }),
      ),
    });
    const writer = createManualRunAlertWriter({ supabaseAdmin: admin });
    const out = await writer.resolve({ alertId: 'a-1' });
    expect(out.outcome).toBe('failed');
    expect(out.error).toBe('boom');
  });
});

// ── 5) Safety: no forbidden imports / no UI / no cron ────────────────────

describe('2T: factory module forbidden imports', () => {
  it('does not import the browser Supabase client', () => {
    expect(FACTORY_SOURCE).not.toMatch(/@\/integrations\/supabase\/client/);
  });

  it('does not import notification dispatchers, recipients, or content', () => {
    expect(FACTORY_SOURCE).not.toMatch(/notificationDispatcher/);
    expect(FACTORY_SOURCE).not.toMatch(/notificationRecipients/);
    expect(FACTORY_SOURCE).not.toMatch(/notificationContent/);
    expect(FACTORY_SOURCE).not.toMatch(/dispatchPlannedNotifications/);
  });

  it('does not import SMS/email/push/WhatsApp surfaces', () => {
    expect(FACTORY_SOURCE).not.toMatch(/whatsapp|twilio|sendgrid|resend|fcm|apns|webpush/i);
  });

  it('does not import UI/pages/admin code', () => {
    expect(FACTORY_SOURCE).not.toMatch(/@\/pages\//);
    expect(FACTORY_SOURCE).not.toMatch(/@\/components\//);
  });

  it('does not reference cron / scheduler primitives', () => {
    expect(FACTORY_SOURCE).not.toMatch(/cron\.schedule|pg_cron|setInterval|setTimeout\s*\(/);
  });
});

// ── 6) Composition with harness does not auto-execute ────────────────────

describe('2T: harness can be composed but stays gated', () => {
  const NOW = new Date('2026-05-27T12:00:00Z');
  const approval: OperationsProductionApproval = {
    approved: true,
    scope: MANUAL_REAL_RUN_SCOPE,
    approvedBy: 'ops-lead',
    approvedAt: new Date(NOW.getTime() - 60_000).toISOString(),
    approvalTicket: 'OPS-2T',
    expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
  };
  const request: ManualRealRunRequest = {
    requestedBy: 'admin-uuid',
    confirmationToken: 'I-UNDERSTAND-THE-RISK',
    reason: 'phase 2t smoke',
    dryRun: false,
    enableWrites: true,
    enableNotificationWrites: false,
  };
  const candidates: SweepCandidate[] = [];

  it('composes a bundle but stays denied without the real-run flag', async () => {
    const admin = makeAdminClient();
    const bundle = createManualRunDependencyBundle({ supabaseAdmin: admin });
    const input: ManualSlaRealRunHarnessInput = {
      request,
      approval,
      candidates,
      existingAlerts: [],
      context: { executionContext: 'server', role: 'admin' },
      alertWriter: bundle.alertWriter,
      preRunLogger: bundle.preRunLogger,
      postRunLogger: bundle.postRunLogger,
      auditWriter: bundle.auditWriter,
      guardEnv: { env: { [OPERATIONS_REAL_RUN_FLAG]: 'false' } },
      now: NOW,
    };
    const res = await invokeManualSlaRealRunHarness(input);
    expect(res.accepted).toBe(false);
    expect(res.reason).toBe('REAL_RUN_FLAG_DISABLED');
    // And critically: the alert writer's `from` was never called.
    expect((admin.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
});
