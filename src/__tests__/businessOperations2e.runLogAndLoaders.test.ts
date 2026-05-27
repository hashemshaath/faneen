/**
 * BUSINESS-OPERATIONS-2E — Run-log persistence + candidate loader tests.
 *
 * Covers:
 *   - buildSafeRunLogSummary strips anything beyond whitelisted totals
 *   - persistSlaRunLog success and failure envelopes
 *   - createSupabaseSlaRunLogger throws on failure (→ logError on dispatch)
 *   - dispatchSlaSweep uses an injected real-shape logger correctly
 *   - per-condition normalizers map raw rows to SweepCandidate shape
 *   - loaders exclude terminal/ineligible rows
 *   - loadSlaSweepCandidates handles empty + partial failure
 *   - no PII in log payload (no name/phone/email keys)
 *   - non-dry-run still fails closed even with real logger wired
 *   - evaluator + loader sources do not import the Supabase client
 *   - operations module does not wire cron strings
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  dispatchSlaSweep,
  NON_DRY_RUN_NOT_ENABLED,
  buildSafeRunLogSummary,
  persistSlaRunLog,
  createSupabaseSlaRunLogger,
  loadSlaSweepCandidates,
  normalizeLeadSubmittedNotViewed24h,
  normalizeLeadContactedNoQuote72h,
  normalizeInvitationPending7d,
  normalizeContractPendingSignature7d,
  normalizePaymentIntentPending1h,
  type SlaRunLogRecord,
  type SweepCandidate,
} from '@/modules/operations';

const NOW = new Date('2026-05-27T12:00:00.000Z');
function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 36e5).toISOString();
}

function baseRecord(overrides: Partial<SlaRunLogRecord> = {}): SlaRunLogRecord {
  return {
    runType: 'sla-sweep',
    dryRun: true,
    startedAt: NOW.toISOString(),
    finishedAt: NOW.toISOString(),
    status: 'ok',
    totals: {
      candidates: 2,
      create: 1,
      escalate: 0,
      resolve: 0,
      skipped: 1,
      plannedNotifications: 1,
    },
    ...overrides,
  };
}

describe('2E — buildSafeRunLogSummary', () => {
  it('keeps only whitelisted totals + runType + dryRun', () => {
    const summary = buildSafeRunLogSummary(baseRecord());
    expect(summary.runType).toBe('sla-sweep');
    expect(summary.dryRun).toBe(true);
    expect(Object.keys(summary.totals).sort()).toEqual(
      ['candidates', 'create', 'escalate', 'plannedNotifications', 'resolve', 'skipped'].sort(),
    );
  });

  it('coerces missing/invalid totals to 0', () => {
    const summary = buildSafeRunLogSummary(
      baseRecord({
        totals: {
          candidates: Number.NaN as unknown as number,
          create: 1,
          escalate: 0,
          resolve: 0,
          skipped: 0,
          plannedNotifications: 0,
        },
      }),
    );
    expect(summary.totals.candidates).toBe(0);
    expect(summary.totals.create).toBe(1);
  });

  it('contains no PII keys', () => {
    const json = JSON.stringify(buildSafeRunLogSummary(baseRecord()));
    for (const forbidden of ['name', 'phone', 'email', 'customer', 'lead', 'contract', 'payment', 'token', 'secret']) {
      expect(json.toLowerCase()).not.toContain(forbidden);
    }
  });
});

describe('2E — persistSlaRunLog', () => {
  it('returns ok=true with id on success', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'log-uuid-1', error: null });
    const res = await persistSlaRunLog(baseRecord(), { rpc });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('log-uuid-1');
    expect(rpc).toHaveBeenCalledOnce();
    const args = rpc.mock.calls[0][0];
    expect(args._job_name).toBe('sla-sweep');
    expect(args._function_name).toBe('sla-sweep-dispatcher');
    expect(args._ok).toBe(true);
    expect(args._status).toBe('ok');
    expect(args._summary.runType).toBe('sla-sweep');
    expect(args._error_code).toBeNull();
    expect(args._error_message).toBeNull();
  });

  it('returns ok=false with error message on RPC error', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied for function log_cron_run' } });
    const res = await persistSlaRunLog(baseRecord(), { rpc });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('permission denied');
  });

  it('captures thrown errors safely', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network down'));
    const res = await persistSlaRunLog(baseRecord(), { rpc });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('network down');
  });

  it('passes through error_code/message when record failed', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'id', error: null });
    await persistSlaRunLog(
      baseRecord({ status: 'failed', error: NON_DRY_RUN_NOT_ENABLED }),
      { rpc },
    );
    const args = rpc.mock.calls[0][0];
    expect(args._ok).toBe(false);
    expect(args._status).toBe('failed');
    expect(args._error_code).toBe('sla_sweep_failed');
    expect(args._error_message).toBe(NON_DRY_RUN_NOT_ENABLED);
  });

  it('only sends whitelisted summary keys (no PII)', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'id', error: null });
    await persistSlaRunLog(baseRecord(), { rpc });
    const summary = rpc.mock.calls[0][0]._summary;
    expect(Object.keys(summary).sort()).toEqual(['dryRun', 'runType', 'totals']);
  });
});

describe('2E — createSupabaseSlaRunLogger + dispatch wiring', () => {
  it('dispatch uses injected logger and reports ok', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'log-1', error: null });
    const logger = createSupabaseSlaRunLogger({ rpc });
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({ now: NOW, candidates, existingAlerts: [], logger });
    expect(res.logError).toBeUndefined();
    expect(res.log.status).toBe('ok');
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('logger failure surfaces as logError and does not block plan/notifications', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const logger = createSupabaseSlaRunLogger({ rpc });
    const candidates: SweepCandidate[] = [
      { conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) },
    ];
    const res = await dispatchSlaSweep({ now: NOW, candidates, existingAlerts: [], logger });
    expect(res.plan?.totals.create).toBe(1);
    expect(res.notifications?.totals.planned).toBe(1);
    expect(res.logError).toContain('permission denied');
  });

  it('non-dry-run still fails closed even with a real logger attached', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'id', error: null });
    const logger = createSupabaseSlaRunLogger({ rpc });
    const res = await dispatchSlaSweep({
      now: NOW,
      candidates: [{ conditionCode: 'lead.submitted_not_viewed_24h', entityId: 'l-1', conditionSince: hoursAgo(30) }],
      existingAlerts: [],
      dryRun: false,
      logger,
    });
    expect(res.plan).toBeNull();
    expect(res.log.status).toBe('failed');
    expect(res.log.error).toBe(NON_DRY_RUN_NOT_ENABLED);
    // Logger still received the failed envelope and persisted it successfully.
    const args = rpc.mock.calls[0][0];
    expect(args._status).toBe('failed');
  });
});

describe('2E — per-condition normalizers', () => {
  it('lead.submitted_not_viewed_24h: maps submitted quote_requests', () => {
    const c = normalizeLeadSubmittedNotViewed24h({
      id: 'qr-1', created_at: hoursAgo(30), status: 'submitted',
      user_id: 'u-1', target_entity_id: 'b-1',
    });
    expect(c).toMatchObject({
      conditionCode: 'lead.submitted_not_viewed_24h',
      entityId: 'qr-1',
      ownerUserId: 'u-1',
      ownerBusinessId: 'b-1',
      resolved: false,
    });
    expect(c?.conditionSince).toBe(hoursAgo(30));
  });

  it('lead.submitted_not_viewed_24h: marks contacted as resolved', () => {
    const c = normalizeLeadSubmittedNotViewed24h({
      id: 'qr-2', created_at: hoursAgo(30), status: 'contacted',
    });
    expect(c?.resolved).toBe(true);
  });

  it('lead.submitted_not_viewed_24h: excludes terminal statuses', () => {
    for (const status of ['closed', 'completed', 'cancelled', 'converted']) {
      expect(normalizeLeadSubmittedNotViewed24h({ id: 'x', created_at: hoursAgo(30), status })).toBeNull();
    }
  });

  it('lead.contacted_no_quote_72h: only contacted/in_progress rows', () => {
    expect(normalizeLeadContactedNoQuote72h({ id: 'x', created_at: hoursAgo(80), status: 'submitted' })).toBeNull();
    const c = normalizeLeadContactedNoQuote72h({
      id: 'x', created_at: hoursAgo(100), status: 'contacted', updated_at: hoursAgo(80),
    });
    expect(c?.conditionSince).toBe(hoursAgo(80));
    expect(c?.conditionCode).toBe('lead.contacted_no_quote_72h');
  });

  it('invitation.pending_7d: maps pending and resolves accepted', () => {
    expect(
      normalizeInvitationPending7d({ id: 'inv-1', created_at: hoursAgo(200), status: 'pending', business_id: 'b-1' }),
    ).toMatchObject({
      conditionCode: 'invitation.pending_7d',
      entityId: 'inv-1',
      ownerBusinessId: 'b-1',
      resolved: false,
    });
    expect(
      normalizeInvitationPending7d({ id: 'inv-2', created_at: hoursAgo(200), status: 'accepted', business_id: 'b-1' }),
    ).toBeNull();
    expect(
      normalizeInvitationPending7d({ id: 'inv-3', created_at: hoursAgo(200), status: 'expired', business_id: 'b-1' }),
    ).toBeNull();
  });

  it('contract.pending_signature_7d: resolved when both signatures present', () => {
    expect(
      normalizeContractPendingSignature7d({
        id: 'c-1', created_at: hoursAgo(200), status: 'pending_signature',
        provider_id: 'p', provider_accepted_at: null, client_accepted_at: null,
      }),
    ).toMatchObject({ resolved: false });

    expect(
      normalizeContractPendingSignature7d({
        id: 'c-2', created_at: hoursAgo(200), status: 'pending_signature',
        provider_id: 'p', provider_accepted_at: hoursAgo(10), client_accepted_at: hoursAgo(5),
      })?.resolved,
    ).toBe(true);

    expect(
      normalizeContractPendingSignature7d({
        id: 'c-3', created_at: hoursAgo(200), status: 'active',
        provider_id: 'p',
      }),
    ).toBeNull();
  });

  it('payment.intent_pending_1h: maps pending intents and excludes terminal', () => {
    expect(
      normalizePaymentIntentPending1h({ id: 'pi-1', created_at: hoursAgo(2), status: 'pending' }),
    ).toMatchObject({ conditionCode: 'payment.intent_pending_1h', entityId: 'pi-1', resolved: false });
    for (const status of ['succeeded', 'failed', 'cancelled', 'refunded']) {
      expect(normalizePaymentIntentPending1h({ id: 'pi-x', created_at: hoursAgo(2), status })).toBeNull();
    }
  });
});

describe('2E — loadSlaSweepCandidates aggregation', () => {
  it('returns empty result when no fetchers are wired', async () => {
    const res = await loadSlaSweepCandidates({ now: NOW });
    expect(res.candidates).toEqual([]);
    expect(res.loaderErrors).toEqual([]);
    expect(res.partial).toBe(false);
  });

  it('aggregates results from multiple fetchers', async () => {
    const res = await loadSlaSweepCandidates({
      now: NOW,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () => [
          { id: 'qr-1', created_at: hoursAgo(30), status: 'submitted' },
          { id: 'qr-2', created_at: hoursAgo(2), status: 'submitted' },
          { id: 'qr-3', created_at: hoursAgo(100), status: 'closed' }, // excluded
        ],
        'invitation.pending_7d': async () => [
          { id: 'inv-1', created_at: hoursAgo(200), status: 'pending', business_id: 'b-1' },
        ],
      },
    });
    expect(res.candidates).toHaveLength(3);
    expect(res.loaderErrors).toEqual([]);
    expect(res.partial).toBe(false);
    expect(res.candidates.map((c) => c.conditionCode).sort()).toEqual([
      'invitation.pending_7d',
      'lead.submitted_not_viewed_24h',
      'lead.submitted_not_viewed_24h',
    ]);
  });

  it('returns partial results + loaderErrors on per-loader failure', async () => {
    const res = await loadSlaSweepCandidates({
      now: NOW,
      fetchers: {
        'lead.submitted_not_viewed_24h': async () => [
          { id: 'qr-1', created_at: hoursAgo(30), status: 'submitted' },
        ],
        'invitation.pending_7d': async () => {
          throw new Error('rls denied');
        },
      },
    });
    expect(res.candidates).toHaveLength(1);
    expect(res.loaderErrors).toEqual([{ conditionCode: 'invitation.pending_7d', message: 'rls denied' }]);
    expect(res.partial).toBe(true);
  });

  it('respects the enabled filter', async () => {
    const invFetcher = vi.fn().mockResolvedValue([]);
    const leadFetcher = vi.fn().mockResolvedValue([]);
    await loadSlaSweepCandidates({
      now: NOW,
      enabled: ['invitation.pending_7d'],
      fetchers: {
        'invitation.pending_7d': invFetcher,
        'lead.submitted_not_viewed_24h': leadFetcher,
      },
    });
    expect(invFetcher).toHaveBeenCalled();
    expect(leadFetcher).not.toHaveBeenCalled();
  });
});

describe('2E — source purity & cron isolation', () => {
  it('slaSweep + candidateLoaders + planNotifications do not import the Supabase client', () => {
    for (const rel of [
      '../modules/operations/services/slaSweep.ts',
      '../modules/operations/services/candidateLoaders.ts',
      '../modules/operations/services/planNotifications.ts',
      '../modules/operations/services/dispatchSlaSweep.ts',
    ]) {
      const src = readFileSync(resolve(__dirname, rel), 'utf-8');
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
      expect(src).not.toMatch(/\.from\(\s*['"]operational_alerts['"]\s*\)/);
    }
  });

  it('persistSlaRunLog is the only operations file importing the supabase client', () => {
    const dir = resolve(__dirname, '../modules/operations/services');
    const supaImports: string[] = [];
    for (const file of readdirSync(dir)) {
      const src = readFileSync(resolve(dir, file), 'utf-8');
      if (/from\s+['"]@\/integrations\/supabase\/client['"]/.test(src)) supaImports.push(file);
    }
    expect(supaImports.sort()).toEqual(['getOperationalAlertById.ts', 'listOperationalAlerts.ts', 'persistSlaRunLog.ts']);
  });

  it('operations module does not wire any cron scheduler', () => {
    const dir = resolve(__dirname, '../modules/operations/services');
    for (const file of readdirSync(dir)) {
      const src = readFileSync(resolve(dir, file), 'utf-8');
      // No cron-job / pg_cron scheduling helpers anywhere in operations services.
      expect(src).not.toMatch(/cron\.schedule/);
      expect(src).not.toMatch(/pg_cron/);
    }
  });

  it('exports new wrappers from the operations barrel', () => {
    const barrel = readFileSync(resolve(__dirname, '../modules/operations/index.ts'), 'utf-8');
    expect(barrel).toMatch(/persistSlaRunLog/);
    expect(barrel).toMatch(/createSupabaseSlaRunLogger/);
    expect(barrel).toMatch(/loadSlaSweepCandidates/);
  });
});