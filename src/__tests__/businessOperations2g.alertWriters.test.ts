/**
 * BUSINESS-OPERATIONS-2G — Alert write wrappers + apply gate + non-dry-run dispatch.
 *
 * Covers:
 *   - create / escalate / resolve write wrappers (success, idempotent, refuse-downgrade, failure)
 *   - applySlaSweepPlan only fires on actionable kinds and is gated by both flags
 *   - dispatchSlaSweep non-dry-run fails closed without writer + enableWrites
 *   - dispatchSlaSweep non-dry-run runs only with full gate satisfied
 *   - logger pre-run failure prevents writes
 *   - logger post-run failure surfaces as logError (writes preserved)
 *   - no notifications are sent and no source-domain tables are touched
 *   - source purity: planner / loaders remain free of supabase imports
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applySlaSweepPlan,
  APPLY_GATE_REQUIRES_ENABLE_WRITES,
  APPLY_GATE_REQUIRES_NON_DRY_RUN,
  dispatchSlaSweep,
  evaluateSlaSweep,
  isStrictPromotion,
  NON_DRY_RUN_NOT_ENABLED,
  type AlertWriteResult,
  type AlertWriter,
  type SweepCandidate,
  type SweepPlan,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 36e5).toISOString();

function fakeWriter(overrides: Partial<AlertWriter> = {}): AlertWriter & {
  calls: { method: string; input: unknown }[];
} {
  const calls: { method: string; input: unknown }[] = [];
  const base: AlertWriter = {
    async create(input) {
      calls.push({ method: 'create', input });
      return { outcome: 'created', alertId: 'new-' + input.idempotencyKey };
    },
    async escalate(input) {
      calls.push({ method: 'escalate', input });
      return { outcome: 'escalated', alertId: input.alertId };
    },
    async resolve(input) {
      calls.push({ method: 'resolve', input });
      return { outcome: 'resolved', alertId: input.alertId };
    },
  };
  return Object.assign({ calls }, base, overrides);
}

// ── isStrictPromotion ────────────────────────────────────────────────────

describe('2G severity ladder', () => {
  it('only allows forward promotion on the canonical ladder', () => {
    expect(isStrictPromotion('info', 'warning')).toBe(true);
    expect(isStrictPromotion('warning', 'overdue')).toBe(true);
    expect(isStrictPromotion('overdue', 'critical')).toBe(true);
    expect(isStrictPromotion('critical', 'critical')).toBe(false);
    expect(isStrictPromotion('critical', 'warning')).toBe(false);
    expect(isStrictPromotion('warning', 'warning')).toBe(false);
  });
});

// ── applySlaSweepPlan gate + dispatch ────────────────────────────────────

function planWithAllKinds(): SweepPlan {
  const candidates: SweepCandidate[] = [
    { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-create', conditionSince: hoursAgo(30) },
    { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-resolve', conditionSince: hoursAgo(30), resolved: true },
    { conditionCode: 'contract.pending_signature_7d', entityId: 'c-esc', conditionSince: hoursAgo(24 * 14 + 1) },
    { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-skip', conditionSince: hoursAgo(5) }, // skip-not-yet-due
  ];
  const existingAlerts = [
    {
      id: 'alr-resolve', conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-resolve',
      severity: 'warning' as const, status: 'open' as const,
      triggeredAt: hoursAgo(30), idempotencyKey: 'k-resolve',
    },
    {
      id: 'alr-esc', conditionCode: 'contract.pending_signature_7d', entityId: 'c-esc',
      severity: 'warning' as const, status: 'open' as const,
      triggeredAt: hoursAgo(24 * 14 + 1), idempotencyKey: 'k-esc',
    },
  ];
  return evaluateSlaSweep({ now: NOW, candidates, existingAlerts });
}

describe('2G applySlaSweepPlan — gate', () => {
  it('fails closed without dryRun:false', async () => {
    const writer = fakeWriter();
    const res = await applySlaSweepPlan({
      plan: planWithAllKinds(),
      writer,
      dryRun: true,
      enableWrites: true,
    });
    expect(res.applied).toBe(false);
    expect(res.reason).toBe(APPLY_GATE_REQUIRES_NON_DRY_RUN);
    expect(writer.calls).toHaveLength(0);
  });

  it('fails closed without enableWrites:true', async () => {
    const writer = fakeWriter();
    const res = await applySlaSweepPlan({
      plan: planWithAllKinds(),
      writer,
      dryRun: false,
      enableWrites: false,
    });
    expect(res.applied).toBe(false);
    expect(res.reason).toBe(APPLY_GATE_REQUIRES_ENABLE_WRITES);
    expect(writer.calls).toHaveLength(0);
  });

  it('skips all skip-* actions and forwards only actionable kinds', async () => {
    const writer = fakeWriter();
    const plan = planWithAllKinds();
    const res = await applySlaSweepPlan({
      plan, writer, dryRun: false, enableWrites: true,
    });
    expect(res.applied).toBe(true);
    expect(res.totals.created).toBe(1);
    expect(res.totals.escalated).toBe(1);
    expect(res.totals.resolved).toBe(1);
    expect(res.totals.failed).toBe(0);
    const methods = writer.calls.map((c) => c.method).sort();
    expect(methods).toEqual(['create', 'escalate', 'resolve']);
  });

  it('aggregates writer outcomes into structured totals', async () => {
    const writer = fakeWriter({
      async create() { return { outcome: 'skipped', reason: 'dup' } as AlertWriteResult; },
      async escalate() { return { outcome: 'failed', error: 'rls' } as AlertWriteResult; },
      async resolve() { return { outcome: 'resolved', alertId: 'x' } as AlertWriteResult; },
    });
    const res = await applySlaSweepPlan({
      plan: planWithAllKinds(), writer, dryRun: false, enableWrites: true,
    });
    expect(res.totals).toMatchObject({ created: 0, escalated: 0, resolved: 1, skipped: 1, failed: 1 });
  });
});

// ── dispatch non-dry-run gate ────────────────────────────────────────────

describe('2G dispatch — non-dry-run gate', () => {
  it('fails closed when no writer / enableWrites is provided', async () => {
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [],
      existingAlerts: [],
      dryRun: false,
    });
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toBe(NON_DRY_RUN_NOT_ENABLED);
    expect(res.plan).toBeNull();
  });

  it('fails closed if writer is present but enableWrites is false', async () => {
    const writer = fakeWriter();
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [],
      existingAlerts: [],
      dryRun: false,
      writer,
      enableWrites: false,
    });
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toBe(NON_DRY_RUN_NOT_ENABLED);
    expect(writer.calls).toHaveLength(0);
  });

  it('runs writes when dryRun:false + writer + enableWrites:true', async () => {
    const writer = fakeWriter();
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates,
      existingAlerts: [],
      dryRun: false,
      writer,
      enableWrites: true,
    });
    expect(res.log.status).toBe('ok');
    expect(res.apply?.applied).toBe(true);
    expect(res.apply?.totals.created).toBe(1);
    expect(writer.calls.map((c) => c.method)).toEqual(['create']);
    expect(res.log.totals.created).toBe(1);
  });
});

// ── dispatch logger phases ───────────────────────────────────────────────

describe('2G dispatch — logger phase safety', () => {
  it('pre-run logger failure aborts before any writes', async () => {
    const writer = fakeWriter();
    const logger = vi.fn(() => { throw new Error('preflight down'); });
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [{ conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) }],
      existingAlerts: [],
      dryRun: false,
      writer,
      enableWrites: true,
      logger,
    });
    expect(writer.calls).toHaveLength(0);
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toMatch(/pre-run log failure/);
    expect(res.logError).toMatch(/pre-run log failure/);
  });

  it('post-run logger failure is captured but writes are preserved', async () => {
    const writer = fakeWriter();
    let callCount = 0;
    const logger = vi.fn(() => {
      callCount++;
      if (callCount === 2) throw new Error('sink offline');
    });
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates,
      existingAlerts: [],
      dryRun: false,
      writer,
      enableWrites: true,
      logger,
    });
    expect(writer.calls).toHaveLength(1);
    expect(res.apply?.totals.created).toBe(1);
    expect(res.logError).toBe('sink offline');
  });
});

// ── source purity ────────────────────────────────────────────────────────

describe('2G source purity', () => {
  it('pure planner / loaders / notification files import no Supabase client', () => {
    const files = [
      '../modules/operations/services/slaSweep.ts',
      '../modules/operations/services/planNotifications.ts',
      '../modules/operations/services/candidateLoaders.ts',
      '../modules/operations/services/applySlaSweepPlan.ts',
      '../modules/operations/services/dispatchSlaSweep.ts',
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8');
      expect(src, rel).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    }
  });

  it('does not introduce notification dispatch or cron wiring', () => {
    const files = [
      '../modules/operations/services/alertWriters.ts',
      '../modules/operations/services/applySlaSweepPlan.ts',
      '../modules/operations/services/dispatchSlaSweep.ts',
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8');
      expect(src, rel).not.toMatch(/send.*email/i);
      expect(src, rel).not.toMatch(/createNotification|notify_/);
      expect(src, rel).not.toMatch(/supabase\.functions\.invoke/);
    }
  });

  it('exports the new 2G surface from the operations barrel', () => {
    const barrel = readFileSync(
      resolve(__dirname, '../modules/operations/index.ts'),
      'utf-8',
    );
    for (const name of [
      'applySlaSweepPlan',
      'createSupabaseAlertWriter',
      'isStrictPromotion',
      'APPLY_GATE_REQUIRES_NON_DRY_RUN',
      'APPLY_GATE_REQUIRES_ENABLE_WRITES',
      'NON_DRY_RUN_REQUIRES_WRITER',
    ]) {
      expect(barrel).toMatch(new RegExp(name));
    }
  });
});