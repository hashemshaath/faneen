/**
 * BUSINESS-OPERATIONS-2F — Production fetchers + admin preview tests.
 *
 * Covers:
 *   - production fetcher source selects only safe columns (no PII)
 *   - existing-alert snapshot loader maps to ExistingAlert shape
 *   - admin preview returns totals, action counts, capped samples
 *   - admin preview handles loader partial failures
 *   - admin preview handles existing-alerts loader failure
 *   - admin preview handles logger failure → logError
 *   - sample is capped to default 25 and respects custom limit
 *   - non-dry-run still fails closed at the dispatch layer
 *   - PRODUCTION_ROW_FETCHERS exports all 5 seeded conditions
 *   - isolation audit allowlists are narrow and explicit
 *   - no cron wiring introduced in operations module
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  previewSlaSweepForAdmin,
  PRODUCTION_ROW_FETCHERS,
  DEFAULT_PREVIEW_SAMPLE_LIMIT,
  dispatchSlaSweep,
  NON_DRY_RUN_NOT_ENABLED,
  type RowFetchers,
  type ExistingAlert,
  type SweepCandidate,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');
function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 36e5).toISOString();
}

const FETCHERS_SRC = readFileSync(
  resolve(__dirname, '../modules/operations/services/productionFetchers.ts'),
  'utf-8',
);

describe('2F — production fetchers source guards', () => {
  it('exports a fetcher for each of the 5 seeded conditions', () => {
    expect(Object.keys(PRODUCTION_ROW_FETCHERS).sort()).toEqual([
      'contract.pending_signature_7d',
      'invitation.pending_7d',
      'lead.contacted_no_quote_72h',
      'lead.submitted_not_viewed_24h',
      'payment.intent_pending_1h',
    ]);
    for (const fn of Object.values(PRODUCTION_ROW_FETCHERS)) {
      expect(typeof fn).toBe('function');
    }
  });

  it('never selects PII columns from any source table', () => {
    // SELECT statements only — we approximate by scanning the .select(...) literals.
    const selectLiterals = [...FETCHERS_SRC.matchAll(/\.select\(\s*['"]([^'"]+)['"]/g)].map(
      (m) => m[1],
    );
    expect(selectLiterals.length).toBeGreaterThanOrEqual(6); // 5 fetchers + alert snapshot
    const PII_TOKENS = [
      'name',
      'phone',
      'email',
      'address',
      'note',
      'message',
      'description',
      'title',
      'terms',
      'amount',
      'provider_payload',
      'payload',
      'metadata',
    ];
    for (const literal of selectLiterals) {
      const lc = literal.toLowerCase();
      for (const token of PII_TOKENS) {
        expect(lc, `select "${literal}" must not include "${token}"`).not.toContain(token);
      }
    }
  });

  it('never issues a write/upsert/RPC mutation from production fetchers', () => {
    expect(FETCHERS_SRC).not.toMatch(/\.insert\(/);
    expect(FETCHERS_SRC).not.toMatch(/\.update\(/);
    expect(FETCHERS_SRC).not.toMatch(/\.delete\(/);
    expect(FETCHERS_SRC).not.toMatch(/\.upsert\(/);
    expect(FETCHERS_SRC).not.toMatch(/\.rpc\(/);
  });

  it('caps every query with a hard row limit', () => {
    // Every .from(...).select(...) chain ends with .limit(HARD_ROW_CAP).
    const limitCount = (FETCHERS_SRC.match(/\.limit\(HARD_ROW_CAP\)/g) ?? []).length;
    expect(limitCount).toBe(6); // 5 fetchers + existing-alerts loader
  });

  it('targets only the documented domain tables', () => {
    const tables = new Set(
      [...FETCHERS_SRC.matchAll(/\.from\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
    );
    expect([...tables].sort()).toEqual(
      [
        'business_staff_invitations',
        'contracts',
        'membership_payment_intents',
        'operational_alerts',
        'quote_requests',
      ].sort(),
    );
  });
});

describe('2F — admin preview (dry-run only)', () => {
  const fakeFetchers: RowFetchers = {
    'lead.submitted_not_viewed_24h': async () => [
      { id: 'qr-1', created_at: hoursAgo(30), status: 'submitted' },
      { id: 'qr-2', created_at: hoursAgo(2), status: 'submitted' }, // skip-not-yet-due
    ],
    'invitation.pending_7d': async () => [
      { id: 'inv-1', created_at: hoursAgo(200), status: 'pending', business_id: 'b-1' },
    ],
  };
  const fakeAlerts: ExistingAlert[] = [];

  it('returns totals, counts, capped samples without PII', async () => {
    const res = await previewSlaSweepForAdmin({
      now: NOW,
      fetchers: fakeFetchers,
      loadExistingAlerts: async () => fakeAlerts,
      persistLog: false,
    });
    expect(res.dryRun).toBe(true);
    expect(res.totals.candidates).toBe(3);
    expect(res.totals.create).toBe(2);
    expect(res.totals.skipped).toBe(1);
    expect(res.totals.plannedNotifications).toBe(2);
    expect(res.totals.existingAlerts).toBe(0);
    expect(res.actionCountsByKind.create).toBe(2);
    expect(res.actionCountsByKind['skip-not-yet-due']).toBe(1);
    expect(res.sampleLimit).toBe(DEFAULT_PREVIEW_SAMPLE_LIMIT);
    expect(res.sampleActions.length).toBe(3);
    for (const a of res.sampleActions) {
      // No PII fields leak into samples.
      const keys = Object.keys(a);
      for (const forbidden of ['name', 'phone', 'email', 'address', 'message', 'title']) {
        expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
      }
    }
    expect(res.loaderErrors).toEqual([]);
    expect(res.existingAlertsError).toBeUndefined();
    expect(res.log.status).toBe('ok');
    expect(res.logError).toBeUndefined();
    expect(res.partial).toBe(false);
  });

  it('caps sampleActions at the requested limit', async () => {
    const manyCandidates: SweepCandidate[] = Array.from({ length: 60 }, (_, i) => ({
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: `qr-${i}`,
      conditionSince: hoursAgo(30),
    }));
    const res = await previewSlaSweepForAdmin({
      now: NOW,
      sampleLimit: 10,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () =>
          manyCandidates.map((c) => ({ id: c.entityId, created_at: c.conditionSince, status: 'submitted' })),
      },
      loadExistingAlerts: async () => [],
      persistLog: false,
    });
    expect(res.sampleLimit).toBe(10);
    expect(res.sampleActions.length).toBe(10);
    expect(res.totals.create).toBe(60);
  });

  it('surfaces loader partial failure without blocking the preview', async () => {
    const res = await previewSlaSweepForAdmin({
      now: NOW,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () => [
          { id: 'qr-1', created_at: hoursAgo(30), status: 'submitted' },
        ],
        'invitation.pending_7d': async () => {
          throw new Error('rls denied');
        },
      },
      loadExistingAlerts: async () => [],
      persistLog: false,
    });
    expect(res.partial).toBe(true);
    expect(res.loaderErrors).toEqual([{ conditionCode: 'invitation.pending_7d', message: 'rls denied' }]);
    expect(res.totals.create).toBe(1);
    expect(res.log.status).toBe('ok');
  });

  it('captures existing-alerts loader failure as existingAlertsError', async () => {
    const res = await previewSlaSweepForAdmin({
      now: NOW,
      fetchers: fakeFetchers,
      loadExistingAlerts: async () => {
        throw new Error('alerts rls denied');
      },
      persistLog: false,
    });
    expect(res.existingAlertsError).toBe('alerts rls denied');
    expect(res.partial).toBe(true);
    // Sweep still proceeds with empty existing alerts.
    expect(res.totals.create).toBe(2);
  });

  it('captures logger failure as logError without blocking the plan', async () => {
    const res = await previewSlaSweepForAdmin({
      now: NOW,
      fetchers: fakeFetchers,
      loadExistingAlerts: async () => [],
      logger: () => {
        throw new Error('log sink offline');
      },
    });
    expect(res.logError).toBe('log sink offline');
    expect(res.totals.create).toBe(2);
  });
});

describe('2F — non-dry-run still fails closed at dispatch layer', () => {
  it('dispatchSlaSweep refuses non-dry-run regardless of caller', async () => {
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [],
      existingAlerts: [],
      dryRun: false,
    });
    expect(res.plan).toBeNull();
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toBe(NON_DRY_RUN_NOT_ENABLED);
  });
});

describe('2F — isolation audit allowlist narrowness', () => {
  it('each domain audit allowlists only the productionFetchers file (no broad ops dir)', () => {
    for (const rel of [
      '../../scripts/leads-quotes-isolation-audit.mjs',
      '../../scripts/contracts-isolation-audit.mjs',
      '../../scripts/memberships-isolation-audit.mjs',
    ]) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8');
      expect(src).toContain('src/modules/operations/services/productionFetchers.ts');
      // Must NOT widen to entire operations module.
      expect(src).not.toMatch(/['"]src\/modules\/operations\/['"]/);
      expect(src).not.toMatch(/['"]src\/modules\/operations\/services\/['"]/);
    }
  });

  it('preview service does not import the Supabase client directly', () => {
    const src = readFileSync(
      resolve(__dirname, '../modules/operations/services/previewSlaSweepForAdmin.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    // It also must not wire any cron.
    expect(src).not.toMatch(/cron\.schedule/);
    expect(src).not.toMatch(/pg_cron/);
  });

  it('exports preview helpers from the operations barrel', () => {
    const barrel = readFileSync(
      resolve(__dirname, '../modules/operations/index.ts'),
      'utf-8',
    );
    for (const sym of [
      'previewSlaSweepForAdmin',
      'PRODUCTION_ROW_FETCHERS',
      'loadExistingAlertSnapshots',
      'DEFAULT_PREVIEW_SAMPLE_LIMIT',
    ]) {
      expect(barrel).toContain(sym);
    }
  });
});