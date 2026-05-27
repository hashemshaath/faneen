/**
 * BUSINESS-OPERATIONS-2K — Multi-recipient notification fan-out.
 *
 * Covers:
 *   - One planned notification fans out to multiple recipients.
 *   - Duplicate recipients within a planned notification are deduped.
 *   - Duplicate planned notifications are deduped per recipient via the
 *     per-recipient idempotency key.
 *   - `buildRecipientNotificationKey` embeds the recipient userId.
 *   - Unsupported channels are skipped (not dispatched).
 *   - Missing recipients (resolver returns empty array) are skipped.
 *   - Resolver throw → one failed result; loop continues for other plans.
 *   - Dispatcher sink throw on one recipient → that delivery is failed
 *     while remaining recipients still get delivered.
 *   - Notification failures do not rollback alert writes inside
 *     `dispatchSlaSweep`.
 *   - Alert writes do not implicitly enable notification writes.
 *   - Dry-run never dispatches notifications even when flags are set.
 *   - Admin dashboard preview source does not surface recipient
 *     identifiers, PII, or notification bodies.
 *   - Pure source files (planner, content builder, dispatchers) remain
 *     Supabase-free.
 *   - No cron / SMS / email / push / WhatsApp surfaces introduced.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildNotificationKey,
  buildRecipientNotificationKey,
  dispatchPlannedNotifications,
  dispatchSlaSweep,
  evaluateSlaSweep,
  planNotifications,
  type AlertWriter,
  type NotificationDispatcher,
  type NotificationPlan,
  type NotificationRecipient,
  type PlannedNotification,
  type SweepCandidate,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');
const hoursAgo = (h: number) =>
  new Date(NOW.getTime() - h * 36e5).toISOString();

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
  calls: { recipientUserId: string; notificationKey: string }[];
} {
  const calls: { recipientUserId: string; notificationKey: string }[] = [];
  return {
    calls,
    async dispatch(_planned, recipient, _content, notificationKey) {
      calls.push({ recipientUserId: recipient.userId, notificationKey });
      return {
        outcome: 'sent',
        channel: 'in_app',
        notificationKey,
        recipientUserId: recipient.userId,
      };
    },
  };
}

const BASE_CANDIDATE: SweepCandidate = {
  conditionCode: 'lead.submitted_not_viewed_24h',
  entityId: 'qr-1',
  conditionSince: hoursAgo(30),
  ownerUserId: 'user-1',
};

function planFor(candidate: SweepCandidate): NotificationPlan {
  const plan = evaluateSlaSweep({
    now: NOW,
    candidates: [candidate],
    existingAlerts: [],
  });
  return planNotifications(plan);
}

const SAMPLE_PLANNED: PlannedNotification = {
  channel: 'in_app',
  reason: 'create',
  conditionCode: 'lead.submitted_not_viewed_24h',
  entityId: 'qr-1',
  severity: 'warning',
  idempotencyKey: 'sla:leads:qr-1:lead.submitted_not_viewed_24h:2026-05-27',
  alertId: 'alert-1',
};

// ── Per-recipient idempotency key ─────────────────────────────────────────

describe('2K buildRecipientNotificationKey', () => {
  it('embeds the recipient userId after the base key', () => {
    const base = buildNotificationKey(SAMPLE_PLANNED);
    expect(buildRecipientNotificationKey(SAMPLE_PLANNED, 'user-1')).toBe(
      `${base}:user:user-1`,
    );
  });

  it('produces distinct keys for distinct recipients', () => {
    expect(buildRecipientNotificationKey(SAMPLE_PLANNED, 'user-1')).not.toBe(
      buildRecipientNotificationKey(SAMPLE_PLANNED, 'user-2'),
    );
  });

  it('produces stable keys for the same (planned × user) pair across calls', () => {
    expect(buildRecipientNotificationKey(SAMPLE_PLANNED, 'user-1')).toBe(
      buildRecipientNotificationKey(SAMPLE_PLANNED, 'user-1'),
    );
  });
});

// ── Fan-out behavior ──────────────────────────────────────────────────────

describe('2K dispatchPlannedNotifications — fan-out', () => {
  it('fans out one planned notification to multiple unique recipients', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchPlannedNotifications({
      plan: planFor(BASE_CANDIDATE),
      dispatcher,
      recipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ],
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.dispatched).toBe(true);
    expect(res.totals.deliveriesAttempted).toBe(3);
    expect(res.totals.sent).toBe(3);
    expect(res.totals.failed).toBe(0);
    expect(dispatcher.calls.map((c) => c.recipientUserId).sort()).toEqual([
      'user-1',
      'user-2',
      'user-3',
    ]);
    // Per-recipient keys distinct.
    expect(new Set(dispatcher.calls.map((c) => c.notificationKey)).size).toBe(3);
  });

  it('deduplicates duplicate recipients within a planned notification', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchPlannedNotifications({
      plan: planFor(BASE_CANDIDATE),
      dispatcher,
      recipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.sent).toBe(2);
    expect(res.totals.duplicateSkipped).toBeGreaterThanOrEqual(1);
    expect(dispatcher.calls.map((c) => c.recipientUserId).sort()).toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('deduplicates duplicate planned notifications per recipient (idempotent within run)', async () => {
    const dispatcher = fakeDispatcher();
    const dupe: PlannedNotification = { ...SAMPLE_PLANNED };
    const res = await dispatchPlannedNotifications({
      plan: {
        totals: { planned: 2, byReason: { create: 2, escalate: 0, resolve: 0 } },
        notifications: [dupe, { ...dupe }],
      },
      dispatcher,
      recipientResolver: () => [{ userId: 'user-1' }, { userId: 'user-2' }],
      dryRun: false,
      enableNotificationWrites: true,
    });
    // 2 planned × 2 recipients = 4 candidates, but each (planned × user) pair
    // is deduped → only 2 unique deliveries.
    expect(res.totals.sent).toBe(2);
    expect(res.totals.duplicateSkipped).toBe(2);
    expect(dispatcher.calls).toHaveLength(2);
  });

  it('skips unsupported channels (e.g., email) and never dispatches', async () => {
    const dispatcher = fakeDispatcher();
    const planned: PlannedNotification = {
      ...SAMPLE_PLANNED,
      // Force a non-in_app channel via a type-safe cast to test the guard.
      channel: 'email' as unknown as PlannedNotification['channel'],
    };
    const res = await dispatchPlannedNotifications({
      plan: {
        totals: { planned: 1, byReason: { create: 1, escalate: 0, resolve: 0 } },
        notifications: [planned],
      },
      dispatcher,
      recipientResolver: () => [{ userId: 'user-1' }],
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.unsupportedChannelSkipped).toBe(1);
    expect(res.totals.sent).toBe(0);
    expect(res.totals.deliveriesAttempted).toBe(0);
    expect(dispatcher.calls).toHaveLength(0);
    expect(res.results[0].reason).toMatch(/unsupported channel/i);
  });

  it('counts missing recipients (empty array) under missingRecipientSkipped', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchPlannedNotifications({
      plan: planFor(BASE_CANDIDATE),
      dispatcher,
      recipientResolver: () => [],
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.missingRecipientSkipped).toBe(1);
    expect(res.totals.sent).toBe(0);
    expect(res.results[0].reason).toBe('no recipient resolved');
  });

  it('resolver throw produces one failed result and loop continues', async () => {
    const dispatcher = fakeDispatcher();
    const plan: NotificationPlan = {
      totals: { planned: 2, byReason: { create: 2, escalate: 0, resolve: 0 } },
      notifications: [
        { ...SAMPLE_PLANNED, entityId: 'qr-A', idempotencyKey: 'k-A', alertId: 'a-A' },
        { ...SAMPLE_PLANNED, entityId: 'qr-B', idempotencyKey: 'k-B', alertId: 'a-B' },
      ],
    };
    const resolver = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('rls denied');
      })
      .mockImplementationOnce(() => [{ userId: 'user-2' }]);
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
  });

  it('dispatcher throw on one recipient still delivers the others', async () => {
    const calls: string[] = [];
    const dispatcher: NotificationDispatcher = {
      async dispatch(_planned, recipient, _content, notificationKey) {
        calls.push(recipient.userId);
        if (recipient.userId === 'user-2') {
          throw new Error('sink boom');
        }
        return {
          outcome: 'sent',
          channel: 'in_app',
          notificationKey,
          recipientUserId: recipient.userId,
        };
      },
    };
    const res = await dispatchPlannedNotifications({
      plan: planFor(BASE_CANDIDATE),
      dispatcher,
      recipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ],
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(calls.sort()).toEqual(['user-1', 'user-2', 'user-3']);
    expect(res.totals.sent).toBe(2);
    expect(res.totals.failed).toBe(1);
    const failed = res.results.find((r) => r.outcome === 'failed');
    expect(failed?.recipientUserId).toBe('user-2');
    expect(failed?.error).toContain('sink boom');
  });

  it('back-compat: single-recipient resolver result still fans out to 1 delivery', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchPlannedNotifications({
      plan: planFor(BASE_CANDIDATE),
      dispatcher,
      recipientResolver: () => ({ userId: 'user-1' }),
      dryRun: false,
      enableNotificationWrites: true,
    });
    expect(res.totals.sent).toBe(1);
    expect(res.totals.deliveriesAttempted).toBe(1);
    expect(dispatcher.calls[0].recipientUserId).toBe('user-1');
    expect(dispatcher.calls[0].notificationKey).toBe(
      buildRecipientNotificationKey(
        planFor(BASE_CANDIDATE).notifications[0],
        'user-1',
      ),
    );
  });
});

// ── dispatchSlaSweep integration ──────────────────────────────────────────

describe('2K dispatchSlaSweep — fan-out integration', () => {
  it('notification failures do not rollback alert writes', async () => {
    const writer = fakeWriter();
    const dispatcher: NotificationDispatcher = {
      async dispatch(_p, recipient, _c, notificationKey) {
        return {
          outcome: 'failed',
          channel: 'in_app',
          notificationKey,
          recipientUserId: recipient.userId,
          error: 'rls',
        };
      },
    };
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [BASE_CANDIDATE],
      existingAlerts: [],
      dryRun: false,
      enableWrites: true,
      writer,
      enableNotificationWrites: true,
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });
    expect(res.apply?.applied).toBe(true);
    expect(res.apply?.totals.created).toBe(1);
    expect(res.notificationsDispatch?.totals.failed).toBe(2);
    expect(res.notificationsDispatch?.totals.sent).toBe(0);
    expect(res.log.totals.created).toBe(1);
    expect(res.log.totals.notificationsFailed).toBe(2);
  });

  it('alert writes do not implicitly enable notification writes', async () => {
    const writer = fakeWriter();
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [BASE_CANDIDATE],
      existingAlerts: [],
      dryRun: false,
      enableWrites: true,
      writer,
      // enableNotificationWrites omitted on purpose.
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });
    expect(res.apply?.applied).toBe(true);
    expect(res.notificationsDispatch).toBeUndefined();
    expect(dispatcher.calls).toHaveLength(0);
  });

  it('dry-run never dispatches notifications even with fan-out resolver', async () => {
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [BASE_CANDIDATE],
      existingAlerts: [],
      // dryRun defaults to true
      enableNotificationWrites: true,
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });
    expect(res.notificationsDispatch).toBeUndefined();
    expect(dispatcher.calls).toHaveLength(0);
    expect(res.log.dryRun).toBe(true);
  });

  it('fan-out integrates: alert created then notification sent per recipient', async () => {
    const writer = fakeWriter();
    const dispatcher = fakeDispatcher();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [BASE_CANDIDATE],
      existingAlerts: [],
      dryRun: false,
      enableWrites: true,
      writer,
      enableNotificationWrites: true,
      notificationDispatcher: dispatcher,
      notificationRecipientResolver: () => [
        { userId: 'user-1' },
        { userId: 'user-2' },
      ],
    });
    expect(res.apply?.applied).toBe(true);
    expect(res.notificationsDispatch?.totals.sent).toBe(2);
    expect(res.notificationsDispatch?.totals.deliveriesAttempted).toBe(2);
    expect(res.log.totals.notificationsSent).toBe(2);
  });
});

// ── Admin dashboard preview safety (no recipient leakage) ─────────────────

describe('2K admin preview source — no recipient or PII leakage', () => {
  const adminFile = resolve(__dirname, '../pages/admin/AdminOperations.tsx');
  const src = readFileSync(adminFile, 'utf-8').toLowerCase();

  it('does not render recipient userId fields', () => {
    expect(src).not.toContain('recipientuserid');
    expect(src).not.toContain('recipient.userid');
  });

  it('does not render notification bodies', () => {
    for (const banned of ['bodyar', 'bodyen', 'notificationbody', '.body_ar', '.body_en']) {
      expect(src).not.toContain(banned);
    }
  });

  it('does not import the recipient resolver into the page', () => {
    expect(src).not.toContain('resolveslanotificationrecipients');
    expect(src).not.toContain('createsafeslarecipientresolver');
    expect(src).not.toContain('createsafeslamultirecipientresolver');
  });

  it('does not import the dispatcher into the page', () => {
    expect(src).not.toContain('dispatchplannednotifications');
    expect(src).not.toContain('dispatchslasweep');
    expect(src).not.toContain('createinappnotificationdispatcher');
  });
});

// ── Source purity for 2K ──────────────────────────────────────────────────

describe('2K source purity (no cron / sms / email / push / whatsapp)', () => {
  const files = [
    'src/modules/operations/services/dispatchPlannedNotifications.ts',
    'src/modules/operations/services/notificationDispatcher.ts',
    'src/modules/operations/services/notificationContent.ts',
    'src/modules/operations/services/planNotifications.ts',
    'src/modules/operations/services/slaSweep.ts',
  ];
  for (const rel of files) {
    it(`${rel} stays free of banned channels / cron wiring`, () => {
      const abs = resolve(__dirname, '..', rel.replace(/^src\//, ''));
      const text = readFileSync(abs, 'utf-8').toLowerCase();
      for (const banned of [
        'cron.schedule',
        'pg_cron',
        'sendtransactionalemail',
        'resend.com',
        'twilio',
        'whatsapp',
        'pushnotification',
        'webpush',
      ]) {
        expect(text).not.toContain(banned);
      }
    });
  }

  it('planNotifications.ts and slaSweep.ts do not import the Supabase client', () => {
    for (const rel of [
      'src/modules/operations/services/planNotifications.ts',
      'src/modules/operations/services/slaSweep.ts',
      'src/modules/operations/services/dispatchPlannedNotifications.ts',
    ]) {
      const abs = resolve(__dirname, '..', rel.replace(/^src\//, ''));
      const text = readFileSync(abs, 'utf-8');
      expect(text).not.toMatch(
        /from\s+['"]@\/integrations\/supabase\/client['"]/,
      );
    }
  });
});