/**
 * BUSINESS-OPERATIONS-2H — Notification dispatch wrappers + safe delivery gate.
 *
 * Covers:
 *   - dispatchPlannedNotifications fails closed without the full gate
 *     (dryRun:false + enableNotificationWrites:true + dispatcher + resolver).
 *   - Happy path: planned notifications routed via injected dispatcher.
 *   - Per-run idempotency: duplicate notificationKey skipped.
 *   - Missing recipient → skipped (never failed).
 *   - Resolver throw → failed (no crash, no impact on other entries).
 *   - createInAppNotificationDispatcher uses an injected sink; failure
 *     surfaces as `outcome: 'failed'` without throwing.
 *   - dispatchSlaSweep wires notifications AFTER writes; gate is fully
 *     independent of `enableWrites`.
 *   - dispatchSlaSweep skips notifications when the notification gate
 *     prerequisites are missing.
 *   - No SMS / email / push / transactional surface is touched anywhere
 *     in the new files.
 *   - Source purity: the new files do not import the Supabase client
 *     directly, do not insert into `notifications` directly, and do not
 *     wire any cron scheduler.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildNotificationKey,
  createInAppNotificationDispatcher,
  defaultNotificationContent,
  dispatchPlannedNotifications,
  dispatchSlaSweep,
  NOTIFICATION_GATE_REQUIRES_DISPATCHER,
  NOTIFICATION_GATE_REQUIRES_ENABLE_NOTIFICATION_WRITES,
  NOTIFICATION_GATE_REQUIRES_NON_DRY_RUN,
  NOTIFICATION_GATE_REQUIRES_RESOLVER,
  planNotifications,
  evaluateSlaSweep,
  type AlertWriter,
  type InAppNotificationSink,
  type NotificationDispatcher,
  type NotificationPlan,
  type PlannedNotification,
  type SweepCandidate,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 36e5).toISOString();

function fakeWriter(): AlertWriter & { calls: number } {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async create(input) {
      calls++;
      return { outcome: 'created', alertId: 'alert-' + input.idempotencyKey };
    },
    async escalate(input) {
      calls++;
      return { outcome: 'escalated', alertId: input.alertId };
    },
    async resolve(input) {
      calls++;
      return { outcome: 'resolved', alertId: input.alertId };
    },
  } as AlertWriter & { calls: number };
}

function fakeDispatcher(): NotificationDispatcher & {
  calls: { planned: PlannedNotification; recipientUserId: string }[];
} {
  const calls: { planned: PlannedNotification; recipientUserId: string }[] = [];
  return {
    calls,
    async dispatch(planned, recipient, _content, notificationKey) {
      calls.push({ planned, recipientUserId: recipient.userId });
      return {
        outcome: 'sent',
        channel: 'in_app',
        notificationKey,
        recipientUserId: recipient.userId,
      };
    },
  };
}

function planFor(candidate: SweepCandidate): NotificationPlan {
  const plan = evaluateSlaSweep({
    now: NOW,
    candidates: [candidate],
    existingAlerts: [],
  });
  return planNotifications(plan);
}

const SAMPLE_CANDIDATE: SweepCandidate = {
  conditionCode: 'lead.submitted_not_viewed_24h',
  entityId: 'qr-1',
  conditionSince: hoursAgo(30),
  ownerUserId: 'user-1',
};

// ── Gate ───────────────────────────────────────────────────────────────────

describe('2H dispatchPlannedNotifications — gate', () => {
  const baseInput = () => ({
    plan: planFor(SAMPLE_CANDIDATE),
    dispatcher: fakeDispatcher(),
    recipientResolver: () => ({ userId: 'user-1' }),
    dryRun: false,
    enableNotificationWrites: true,
  });

  it('fails closed when dryRun is not false', async () => {
    const res = await dispatchPlannedNotifications({
      ...baseInput(),
      dryRun: true,
    });
    expect(res.dispatched).toBe(false);
    expect(res.reason).toBe(NOTIFICATION_GATE_REQUIRES_NON_DRY_RUN);
    expect(res.results).toEqual([]);
  });

  it('fails closed without enableNotificationWrites', async () => {
    const res = await dispatchPlannedNotifications({
      ...baseInput(),
      enableNotificationWrites: false,
    });
    expect(res.dispatched).toBe(false);
    expect(res.reason).toBe(NOTIFICATION_GATE_REQUIRES_ENABLE_NOTIFICATION_WRITES);
  });

  it('fails closed without a dispatcher', async () => {
    const res = await dispatchPlannedNotifications({
      ...baseInput(),
      dispatcher: undefined,
    });
    expect(res.dispatched).toBe(false);
    expect(res.reason).toBe(NOTIFICATION_GATE_REQUIRES_DISPATCHER);
  });

  it('fails closed without a recipientResolver', async () => {
    const res = await dispatchPlannedNotifications({
      ...baseInput(),
      recipientResolver: undefined,
    });
    expect(res.dispatched).toBe(false);
    expect(res.reason).toBe(NOTIFICATION_GATE_REQUIRES_RESOLVER);
  });
});

// ── Happy path / idempotency / recipient handling ─────────────────────────

describe('2H dispatchPlannedNotifications — behavior', () => {
  it('routes planned notifications via the injected dispatcher', async () => {
    const dispatcher = fakeDispatcher();
    const plan = planFor(SAMPLE_CANDIDATE);
    const res = await dispatchPlannedNotifications({
      plan,
      dispatcher,
      recipientResolver: () => ({ userId: 'user-1' }),
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.dispatched).toBe(true);
    expect(res.totals.sent).toBe(1);
    expect(res.totals.planned).toBe(plan.notifications.length);
    expect(dispatcher.calls).toHaveLength(1);
    expect(dispatcher.calls[0].recipientUserId).toBe('user-1');
  });

  it('skips when no recipient resolves (never marks failed)', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchPlannedNotifications({
      plan: planFor(SAMPLE_CANDIDATE),
      dispatcher,
      recipientResolver: () => null,
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.sent).toBe(0);
    expect(res.totals.skipped).toBe(1);
    expect(res.totals.failed).toBe(0);
    expect(dispatcher.calls).toHaveLength(0);
    expect(res.results[0].reason).toBe('no recipient resolved');
  });

  it('captures resolver throws as failed (does not crash the loop)', async () => {
    const dispatcher = fakeDispatcher();
    const plan: NotificationPlan = {
      totals: { planned: 2, byReason: { create: 2, escalate: 0, resolve: 0 } },
      notifications: [
        {
          channel: 'in_app',
          reason: 'create',
          conditionCode: 'lead.submitted_not_viewed_24h',
          entityId: 'qr-1',
          severity: 'warning',
          idempotencyKey: 'k-1',
        },
        {
          channel: 'in_app',
          reason: 'create',
          conditionCode: 'lead.submitted_not_viewed_24h',
          entityId: 'qr-2',
          severity: 'warning',
          idempotencyKey: 'k-2',
        },
      ],
    };
    const resolver = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('rls denied');
      })
      .mockImplementationOnce(() => ({ userId: 'user-2' }));
    const res = await dispatchPlannedNotifications({
      plan,
      dispatcher,
      recipientResolver: resolver,
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.failed).toBe(1);
    expect(res.totals.sent).toBe(1);
    expect(res.results[0].outcome).toBe('failed');
    expect(res.results[0].error).toContain('rls denied');
    expect(res.results[1].outcome).toBe('sent');
  });

  it('is idempotent within a run (duplicate keys skipped)', async () => {
    const dispatcher = fakeDispatcher();
    const dupe: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'qr-1',
      severity: 'warning',
      idempotencyKey: 'same-key',
    };
    const res = await dispatchPlannedNotifications({
      plan: {
        totals: { planned: 2, byReason: { create: 2, escalate: 0, resolve: 0 } },
        notifications: [dupe, { ...dupe }],
      },
      dispatcher,
      recipientResolver: () => ({ userId: 'user-1' }),
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(dispatcher.calls).toHaveLength(1);
    expect(res.totals.sent).toBe(1);
    expect(res.totals.skipped).toBe(1);
    expect(res.results[1].reason).toBe('duplicate notification key within run');
  });

  it('builds a stable per-run notification key', () => {
    const planned: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'qr-1',
      severity: 'warning',
      idempotencyKey: 'sla:leads:qr-1:foo:2026-05-27',
    };
    expect(buildNotificationKey(planned)).toBe(
      'notif:sla:leads:qr-1:foo:2026-05-27:create',
    );
  });

  it('default content carries no PII (only condition code + reason metadata)', () => {
    const planned: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'qr-1',
      severity: 'warning',
    };
    const c = defaultNotificationContent(planned);
    const text = JSON.stringify(c).toLowerCase();
    for (const k of ['name', 'phone', 'email', 'token', 'secret']) {
      expect(text).not.toContain(k);
    }
    expect(c.notificationType).toBe('operational_alert.create');
    expect(c.referenceType).toBe('operational_alert');
  });
});

// ── createInAppNotificationDispatcher (sink injection) ────────────────────

describe('2H createInAppNotificationDispatcher', () => {
  it('forwards a payload to the injected sink and reports sent', async () => {
    const sink: InAppNotificationSink = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const dispatcher = createInAppNotificationDispatcher({ sink });
    const planned: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'qr-1',
      severity: 'warning',
      alertId: 'a-1',
    };
    const res = await dispatcher.dispatch(
      planned,
      { userId: 'user-1' },
      defaultNotificationContent(planned),
      'notif:k:create',
    );
    expect(res.outcome).toBe('sent');
    expect(sink.insert).toHaveBeenCalledOnce();
    const payload = (sink.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.user_id).toBe('user-1');
    expect(payload.notification_type).toBe('operational_alert.create');
    expect(payload.reference_type).toBe('operational_alert');
    expect(payload.reference_id).toBe('a-1');
  });

  it('returns failed (no throw) when the sink reports an error', async () => {
    const sink: InAppNotificationSink = {
      insert: vi.fn().mockResolvedValue({ error: { message: 'rls' } }),
    };
    const dispatcher = createInAppNotificationDispatcher({ sink });
    const planned: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'x',
      entityId: 'y',
      severity: 'warning',
    };
    const res = await dispatcher.dispatch(
      planned,
      { userId: 'u' },
      defaultNotificationContent(planned),
      'k',
    );
    expect(res.outcome).toBe('failed');
    expect(res.error).toBe('rls');
  });

  it('returns failed (no throw) when the sink throws', async () => {
    const sink: InAppNotificationSink = {
      insert: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const dispatcher = createInAppNotificationDispatcher({ sink });
    const planned: PlannedNotification = {
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'x',
      entityId: 'y',
      severity: 'warning',
    };
    const res = await dispatcher.dispatch(
      planned,
      { userId: 'u' },
      defaultNotificationContent(planned),
      'k',
    );
    expect(res.outcome).toBe('failed');
    expect(res.error).toBe('boom');
  });
});

// ── dispatchSlaSweep wiring ───────────────────────────────────────────────

describe('2H dispatchSlaSweep — notification gate is independent of writes', () => {
  const baseCandidate: SweepCandidate = {
    conditionCode: 'lead.submitted_not_viewed_24h',
    entityId: 'qr-1',
    conditionSince: hoursAgo(30),
    ownerUserId: 'user-1',
  };

  it('does not dispatch notifications when notification gate is missing', async () => {
    const writer = fakeWriter();
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [baseCandidate],
      existingAlerts: [],
      dryRun: false,
      enableWrites: true,
      writer,
      // Note: enableNotificationWrites omitted
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => ({ userId: 'user-1' }),
    });
    expect(res.apply?.applied).toBe(true);
    expect(res.notificationsDispatch).toBeUndefined();
    expect(dispatcher.calls).toHaveLength(0);
    expect(res.log.totals.notificationsSent).toBeUndefined();
  });

  it('dispatches notifications when both gates + dispatcher + resolver are set', async () => {
    const writer = fakeWriter();
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [baseCandidate],
      existingAlerts: [],
      dryRun: false,
      enableWrites: true,
      writer,
      enableNotificationWrites: true,
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => ({ userId: 'user-1' }),
    });
    expect(res.apply?.applied).toBe(true);
    expect(res.notificationsDispatch?.dispatched).toBe(true);
    expect(res.notificationsDispatch?.totals.sent).toBe(1);
    expect(dispatcher.calls[0].recipientUserId).toBe('user-1');
    expect(res.log.totals.notificationsSent).toBe(1);
    expect(res.log.totals.notificationsFailed).toBe(0);
  });

  it('dry-run never dispatches notifications even when gate flags are set', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [baseCandidate],
      existingAlerts: [],
      // dryRun default = true
      enableNotificationWrites: true,
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => ({ userId: 'user-1' }),
    });
    expect(res.notificationsDispatch).toBeUndefined();
    expect(dispatcher.calls).toHaveLength(0);
    expect(res.log.dryRun).toBe(true);
  });
});

// ── Source purity ─────────────────────────────────────────────────────────

describe('2H source purity', () => {
  const dispatcherFile = resolve(
    __dirname,
    '../modules/operations/services/notificationDispatcher.ts',
  );
  const planFile = resolve(
    __dirname,
    '../modules/operations/services/dispatchPlannedNotifications.ts',
  );

  it('notificationDispatcher.ts does not import the Supabase client directly', () => {
    const src = readFileSync(dispatcherFile, 'utf-8');
    expect(src).not.toMatch(
      /from\s+['"]@\/integrations\/supabase\/client['"]/,
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.insert/);
  });

  it('dispatchPlannedNotifications.ts is pure (no supabase, no notification insert, no other channels)', () => {
    const src = readFileSync(planFile, 'utf-8');
    expect(src).not.toMatch(
      /from\s+['"]@\/integrations\/supabase\/client['"]/,
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)/);
    for (const banned of [
      'sendTransactionalEmail',
      'resend.com',
      'twilio',
      'pushNotification',
      'webhook',
    ]) {
      expect(src.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('neither new file wires any cron scheduler', () => {
    for (const f of [dispatcherFile, planFile]) {
      const src = readFileSync(f, 'utf-8');
      expect(src).not.toMatch(/cron\.schedule/);
      expect(src).not.toMatch(/pg_cron/);
      expect(src).not.toMatch(/sla-sweep/);
    }
  });
});