/**
 * BUSINESS-OPERATIONS-2C — Dry-run SLA sweep evaluator tests.
 *
 * Verifies the pure planner under
 * `src/modules/operations/services/slaSweep.ts`:
 *
 *  - no-op when there are no candidates
 *  - creates an alert for an aged, uncovered candidate
 *  - skips creation when an existing alert already covers it
 *  - skips creation when the idempotency key collides
 *  - escalates an existing alert when promotion is earned
 *  - resolves an existing open/ack alert when condition no longer holds
 *  - records skip-resolved-no-alert when nothing to resolve
 *  - records skip-unknown-condition for unsupported codes
 *  - performs **no** Supabase imports (RLS-safe by construction)
 *  - is exported from the canonical operations module barrel
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateSlaSweep,
  buildIdempotencyKey,
  isKnownSlaCondition,
  SLA_CONDITIONS,
  type SweepCandidate,
  type ExistingAlert,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 36e5).toISOString();
}

describe('BUSINESS-OPERATIONS-2C SLA sweep — catalog', () => {
  it('exposes the documented conditions', () => {
    expect(isKnownSlaCondition('lead.submitted_not_viewed_24h')).toBe(true);
    expect(isKnownSlaCondition('contract.pending_signature_7d')).toBe(true);
    expect(isKnownSlaCondition('not.a.real.condition')).toBe(false);
  });

  it('every catalog condition has a domain in the canonical domains list', () => {
    for (const c of Object.values(SLA_CONDITIONS)) {
      expect(typeof c.thresholdHours).toBe('number');
      expect(c.thresholdHours).toBeGreaterThan(0);
    }
  });

  it('buildIdempotencyKey uses domain + entity + code + bucket', () => {
    const cond = SLA_CONDITIONS['lead.submitted_not_viewed_24h'];
    const k = buildIdempotencyKey(cond, 'ent-1', NOW);
    expect(k).toBe('sla:leads:ent-1:lead.submitted_not_viewed_24h:2026-05-27');
    const hourly = SLA_CONDITIONS['payment.intent_pending_1h'];
    const kh = buildIdempotencyKey(hourly, 'pi-1', NOW);
    expect(kh).toBe('sla:payments:pi-1:payment.intent_pending_1h:2026-05-27T12');
  });
});

describe('BUSINESS-OPERATIONS-2C SLA sweep — evaluator', () => {
  it('returns a no-op plan when there are no candidates', () => {
    const plan = evaluateSlaSweep({ now: NOW, candidates: [], existingAlerts: [] });
    expect(plan.dryRun).toBe(true);
    expect(plan.totals).toEqual({ candidates: 0, create: 0, escalate: 0, resolve: 0, skipped: 0 });
    expect(plan.actions).toEqual([]);
  });

  it('plans a create for an aged candidate with no existing alert', () => {
    const candidates: SweepCandidate[] = [
      {
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-1',
        conditionSince: hoursAgo(30),
      },
    ];
    const plan = evaluateSlaSweep({ now: NOW, candidates, existingAlerts: [] });
    expect(plan.totals.create).toBe(1);
    const a = plan.actions[0];
    expect(a.kind).toBe('create');
    expect(a.severity).toBe('warning');
    expect(a.idempotencyKey).toContain('sla:leads:lead-1:');
  });

  it('skips a candidate that has not reached the threshold yet', () => {
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-2',
        conditionSince: hoursAgo(5),
      }],
      existingAlerts: [],
    });
    expect(plan.totals.create).toBe(0);
    expect(plan.actions[0].kind).toBe('skip-not-yet-due');
  });

  it('skips when an open alert already covers the condition', () => {
    const existingAlerts: ExistingAlert[] = [{
      id: 'alr-1',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'lead-1',
      severity: 'warning',
      status: 'open',
      triggeredAt: hoursAgo(2),
      idempotencyKey: 'sla:leads:lead-1:lead.submitted_not_viewed_24h:2026-05-26',
    }];
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-1',
        conditionSince: hoursAgo(30),
      }],
      existingAlerts,
    });
    expect(plan.totals.create).toBe(0);
    expect(plan.totals.escalate).toBe(0);
    expect(plan.actions[0].kind).toBe('skip-idempotent');
  });

  it('escalates an existing alert when promotion threshold is earned', () => {
    // 24h initial threshold; alert triggered 50h ago → next ladder step.
    const existingAlerts: ExistingAlert[] = [{
      id: 'alr-2',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'lead-3',
      severity: 'warning',
      status: 'open',
      triggeredAt: hoursAgo(50),
      idempotencyKey: 'old-key',
    }];
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-3',
        conditionSince: hoursAgo(50),
      }],
      existingAlerts,
    });
    expect(plan.totals.escalate).toBe(1);
    const a = plan.actions[0];
    expect(a.kind).toBe('escalate');
    expect(a.fromSeverity).toBe('warning');
    expect(a.severity).toBe('overdue');
  });

  it('resolves an existing open alert when condition no longer holds', () => {
    const existingAlerts: ExistingAlert[] = [{
      id: 'alr-3',
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'lead-4',
      severity: 'warning',
      status: 'open',
      triggeredAt: hoursAgo(30),
      idempotencyKey: 'k',
    }];
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-4',
        conditionSince: hoursAgo(30),
        resolved: true,
      }],
      existingAlerts,
    });
    expect(plan.totals.resolve).toBe(1);
    expect(plan.actions[0].kind).toBe('resolve');
    expect(plan.actions[0].alertId).toBe('alr-3');
  });

  it('records skip-resolved-no-alert when resolution has nothing to close', () => {
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'lead.submitted_not_viewed_24h',
        entityId: 'lead-5',
        conditionSince: hoursAgo(30),
        resolved: true,
      }],
      existingAlerts: [],
    });
    expect(plan.totals.resolve).toBe(0);
    expect(plan.totals.skipped).toBe(1);
    expect(plan.actions[0].kind).toBe('skip-resolved-no-alert');
  });

  it('records skip-unknown-condition for unsupported codes', () => {
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: 'totally.unknown.code',
        entityId: 'x',
        conditionSince: hoursAgo(999),
      }],
      existingAlerts: [],
    });
    expect(plan.actions[0].kind).toBe('skip-unknown-condition');
    expect(plan.totals.skipped).toBe(1);
  });

  it('honors a prior-day idempotency collision via key index', () => {
    const cond = SLA_CONDITIONS['lead.submitted_not_viewed_24h'];
    const key = buildIdempotencyKey(cond, 'lead-6', NOW);
    const plan = evaluateSlaSweep({
      now: NOW,
      candidates: [{
        conditionCode: cond.code,
        entityId: 'lead-6',
        conditionSince: hoursAgo(30),
      }],
      existingAlerts: [{
        id: 'alr-key',
        conditionCode: 'other.code',
        entityId: 'other-entity',
        severity: 'warning',
        status: 'resolved',
        triggeredAt: hoursAgo(40),
        idempotencyKey: key,
      }],
    });
    expect(plan.actions[0].kind).toBe('skip-idempotent');
  });
});

describe('BUSINESS-OPERATIONS-2C SLA sweep — RLS-safe purity', () => {
  it('does not import the Supabase client (pure evaluator)', () => {
    const src = readFileSync(
      resolve(__dirname, '../modules/operations/services/slaSweep.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/\.from\(\s*['"]operational_alerts['"]\s*\)/);
  });

  it('is re-exported from the operations module barrel', () => {
    const barrel = readFileSync(
      resolve(__dirname, '../modules/operations/index.ts'),
      'utf-8',
    );
    expect(barrel).toMatch(/evaluateSlaSweep/);
    expect(barrel).toMatch(/SLA_CONDITIONS/);
  });
});