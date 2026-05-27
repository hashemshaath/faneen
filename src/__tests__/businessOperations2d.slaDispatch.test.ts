/**
 * BUSINESS-OPERATIONS-2D — SLA dispatch orchestrator + plan logger tests.
 *
 * Covers:
 *   - dry-run orchestrator returns the same plan as evaluateSlaSweep
 *   - run-log envelope contains run type, dryRun, timestamps, totals, status
 *   - logger failure surfaces as logError WITHOUT mutating the plan/notifications
 *   - notification planning for create/escalate/resolve and not for skips
 *   - duplicate idempotency keys produce only one planned notification
 *   - non-dry-run requests fail closed with the documented error
 *   - dispatch + planner files do not import the Supabase client
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  dispatchSlaSweep,
  evaluateSlaSweep,
  planNotifications,
  NON_DRY_RUN_NOT_ENABLED,
  type SweepCandidate,
  type ExistingAlert,
  type SlaRunLogRecord,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 36e5).toISOString();
}

describe('2D dispatch orchestrator — dry-run equivalence', () => {
  it('returns a plan matching evaluateSlaSweep for the same input', async () => {
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-2', conditionSince: hoursAgo(5) },
    ];
    const expected = evaluateSlaSweep({ now: NOW, candidates, existingAlerts: [] });
    const res = await dispatchSlaSweep({ now: NOW, candidates, existingAlerts: [] });
    expect(res.plan).toEqual(expected);
    expect(res.plan?.dryRun).toBe(true);
  });

  it('produces a notification plan and totals match', async () => {
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({ now: NOW, candidates, existingAlerts: [] });
    expect(res.notifications?.totals.planned).toBe(1);
    expect(res.notifications?.notifications[0]).toMatchObject({
      channel: 'in_app',
      reason: 'create',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'l-1',
    });
    expect(res.log.totals.plannedNotifications).toBe(1);
  });

  it('emits a structured run-log record to the injected logger', async () => {
    const logs: SlaRunLogRecord[] = [];
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates,
      existingAlerts: [],
      logger: (r) => { logs.push(r); },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].runType).toBe('sla-sweep');
    expect(logs[0].dryRun).toBe(true);
    expect(logs[0].status).toBe('ok');
    expect(logs[0].totals.candidates).toBe(1);
    expect(logs[0].totals.create).toBe(1);
    expect(logs[0].totals.plannedNotifications).toBe(1);
    expect(typeof logs[0].startedAt).toBe('string');
    expect(typeof logs[0].finishedAt).toBe('string');
    expect(res.logError).toBeUndefined();
  });
});

describe('2D dispatch — logger failure isolation', () => {
  it('captures logger errors as logError without losing the plan', async () => {
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-9', conditionSince: hoursAgo(30) },
    ];
    const logger = vi.fn(() => { throw new Error('sink offline'); });
    const res = await dispatchSlaSweep({ now: NOW, candidates, existingAlerts: [], logger });
    expect(logger).toHaveBeenCalledOnce();
    expect(res.plan?.totals.create).toBe(1);
    expect(res.notifications?.totals.planned).toBe(1);
    expect(res.logError).toBe('sink offline');
  });
});

describe('2D notification planner — reasons & idempotency', () => {
  it('plans notifications for create/escalate/resolve only (no skips)', () => {
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-a', conditionSince: hoursAgo(30) },
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-b', conditionSince: hoursAgo(5) }, // skip-not-yet-due
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-c', conditionSince: hoursAgo(30), resolved: true },
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-d', conditionSince: hoursAgo(50) }, // escalate target
    ];
    const existingAlerts: ExistingAlert[] = [
      {
        id: 'alr-c', conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-c',
        severity: 'warning', status: 'open', triggeredAt: hoursAgo(30), idempotencyKey: 'k-c',
      },
      {
        id: 'alr-d', conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-d',
        severity: 'warning', status: 'open', triggeredAt: hoursAgo(50), idempotencyKey: 'k-d',
      },
    ];
    const plan = evaluateSlaSweep({ now: NOW, candidates, existingAlerts });
    const notif = planNotifications(plan);
    expect(notif.totals.byReason).toEqual({ create: 1, escalate: 1, resolve: 1 });
    expect(notif.totals.planned).toBe(3);
    for (const n of notif.notifications) {
      expect(['create', 'escalate', 'resolve']).toContain(n.reason);
    }
  });

  it('deduplicates by idempotency key across actions', () => {
    const plan = {
      dryRun: true as const,
      evaluatedAt: NOW.toISOString(),
      totals: { candidates: 2, create: 2, escalate: 0, resolve: 0, skipped: 0 },
      actions: [
        { kind: 'create' as const, conditionCode: 'x', entityId: 'e', idempotencyKey: 'dup', severity: 'warning' as const },
        { kind: 'create' as const, conditionCode: 'x', entityId: 'e', idempotencyKey: 'dup', severity: 'warning' as const },
      ],
    };
    const notif = planNotifications(plan);
    expect(notif.totals.planned).toBe(1);
  });
});

describe('2D dispatch — non-dry-run fails closed', () => {
  it('refuses to run and logs status=failed when dryRun=false', async () => {
    const logs: SlaRunLogRecord[] = [];
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [{ conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-x', conditionSince: hoursAgo(30) }],
      existingAlerts: [],
      dryRun: false,
      logger: (r) => { logs.push(r); },
    });
    expect(res.plan).toBeNull();
    expect(res.notifications).toBeNull();
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toBe(NON_DRY_RUN_NOT_ENABLED);
    expect(res.log.dryRun).toBe(false);
    expect(logs[0].status).toBe('failed');
  });
});

describe('2D source purity', () => {
  it('dispatch and notification planner do not import the Supabase client', () => {
    const files = [
      '../modules/operations/services/dispatchSlaSweep.ts',
      '../modules/operations/services/planNotifications.ts',
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8');
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
      expect(src).not.toMatch(/\.from\(\s*['"]operational_alerts['"]\s*\)/);
    }
  });

  it('exports the orchestrator from the operations barrel', () => {
    const barrel = readFileSync(
      resolve(__dirname, '../modules/operations/index.ts'),
      'utf-8',
    );
    expect(barrel).toMatch(/dispatchSlaSweep/);
    expect(barrel).toMatch(/planNotifications/);
    expect(barrel).toMatch(/NON_DRY_RUN_NOT_ENABLED/);
  });
});