/**
 * BUSINESS-OPERATIONS-2M — Manual dry-run preview ledger.
 *
 * Covers:
 *   - Summary payload contains ONLY safe fields.
 *   - runType is always 'sla_manual_preview' and dryRun is always true.
 *   - Successful preview => ok status entry.
 *   - Failed preview => failed entry with errorCode.
 *   - Ledger writer never throws even when RPC throws.
 *   - Ledger writer returns `{ ok:false, error }` on RPC error response.
 *   - listManualSlaPreviewRuns sanitizes summary, caps at MANUAL_PREVIEW_RUNS_CAP.
 *   - listManualSlaPreviewRuns never throws on reader failure.
 *   - Pure files remain free of direct supabase imports outside the module.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  logManualSlaPreviewRun,
  buildManualPreviewSummary,
  MANUAL_PREVIEW_RUN_TYPE,
  MANUAL_PREVIEW_JOB_NAME,
  MANUAL_PREVIEW_FUNCTION_NAME,
  listManualSlaPreviewRuns,
  MANUAL_PREVIEW_RUNS_CAP,
} from '@/modules/operations';
import type { PreviewSlaSweepResult } from '@/modules/operations/services/previewSlaSweepForAdmin';

const NOW = new Date('2026-05-27T12:00:00.000Z');

function basePreview(overrides: Partial<PreviewSlaSweepResult> = {}): PreviewSlaSweepResult {
  return {
    dryRun: true,
    status: 'success',
    evaluatedAt: NOW.toISOString(),
    totals: {
      candidates: 5, create: 2, escalate: 1, resolve: 1, skipped: 1,
      plannedNotifications: 3, existingAlerts: 2,
    },
    actionCountsByKind: {
      create: 2, escalate: 1, resolve: 1,
      'skip-not-yet-due': 1, 'skip-idempotent': 0,
      'skip-unknown-condition': 0, 'skip-resolved-no-alert': 0,
    },
    loaderErrors: [],
    loaderErrorsCount: 0,
    log: {
      runType: 'sla-sweep', dryRun: true,
      startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(),
      status: 'ok',
      totals: { candidates: 5, create: 2, escalate: 1, resolve: 1, skipped: 1, plannedNotifications: 3 },
    },
    sampleActions: [],
    actionSampleCount: 0,
    totalActionCount: 4,
    sampleLimit: 25,
    partial: false,
    ...overrides,
  };
}

describe('2M buildManualPreviewSummary', () => {
  it('whitelists only safe fields and forces dryRun + runType', () => {
    const s = buildManualPreviewSummary(basePreview());
    expect(s.runType).toBe(MANUAL_PREVIEW_RUN_TYPE);
    expect(s.runType).toBe('sla_manual_preview');
    expect(s.dryRun).toBe(true);
    expect(s.status).toBe('success');
    expect(Object.keys(s).sort()).toEqual(
      ['actionSampleCount', 'dryRun', 'loaderErrorsCount', 'runType', 'status', 'totalActionCount', 'totals'].sort(),
    );
    expect(Object.keys(s.totals).sort()).toEqual(
      ['candidates', 'create', 'escalate', 'resolve', 'skipped', 'plannedNotifications', 'existingAlerts'].sort(),
    );
    const json = JSON.stringify(s).toLowerCase();
    for (const banned of ['user_id', 'recipient', 'phone', 'email', '@', 'token', 'secret', 'idempotencykey', 'samplecond', 'customer']) {
      expect(json).not.toContain(banned);
    }
  });

  it('returns a failed sentinel when preview is null', () => {
    const s = buildManualPreviewSummary(null);
    expect(s.status).toBe('failed');
    expect(s.dryRun).toBe(true);
    expect(s.totals.candidates).toBe(0);
  });
});

describe('2M logManualSlaPreviewRun', () => {
  it('logs a success entry and uses the manual job + function names', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'ledger-1', error: null });
    const res = await logManualSlaPreviewRun(
      {
        preview: basePreview(),
        startedAt: NOW.toISOString(),
        finishedAt: NOW.toISOString(),
      },
      { rpc },
    );
    expect(res).toEqual({ ok: true, id: 'ledger-1' });
    expect(rpc).toHaveBeenCalledTimes(1);
    const args = rpc.mock.calls[0][0];
    expect(args._job_name).toBe(MANUAL_PREVIEW_JOB_NAME);
    expect(args._function_name).toBe(MANUAL_PREVIEW_FUNCTION_NAME);
    expect(args._ok).toBe(true);
    expect(args._status).toBe('success');
    expect(args._summary.runType).toBe(MANUAL_PREVIEW_RUN_TYPE);
    expect(args._summary.dryRun).toBe(true);
    expect(args._error_code).toBeNull();
    expect(args._error_message).toBeNull();
  });

  it('logs a failed entry with errorCode when preview is null', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'ledger-2', error: null });
    const res = await logManualSlaPreviewRun(
      {
        preview: null,
        startedAt: NOW.toISOString(),
        finishedAt: NOW.toISOString(),
        errorMessage: 'boom',
      },
      { rpc },
    );
    expect(res.ok).toBe(true);
    const args = rpc.mock.calls[0][0];
    expect(args._ok).toBe(false);
    expect(args._status).toBe('failed');
    expect(args._error_code).toBe('sla_manual_preview_failed');
    expect(args._error_message).toBe('boom');
    expect(args._summary.totals.candidates).toBe(0);
  });

  it('returns ok:false on RPC error without throwing', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const res = await logManualSlaPreviewRun(
      { preview: basePreview(), startedAt: NOW.toISOString(), finishedAt: NOW.toISOString() },
      { rpc },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe('permission denied');
  });

  it('never throws even if rpc throws', async () => {
    const rpc = vi.fn().mockRejectedValue(new Error('network down'));
    const res = await logManualSlaPreviewRun(
      { preview: basePreview(), startedAt: NOW.toISOString(), finishedAt: NOW.toISOString() },
      { rpc },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe('network down');
  });

  it('truncates errorMessage to 500 chars', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'x', error: null });
    await logManualSlaPreviewRun(
      {
        preview: null,
        startedAt: NOW.toISOString(),
        finishedAt: NOW.toISOString(),
        errorMessage: 'x'.repeat(2000),
      },
      { rpc },
    );
    expect((rpc.mock.calls[0][0]._error_message as string).length).toBe(500);
  });
});

describe('2M listManualSlaPreviewRuns', () => {
  function makeRow(i: number) {
    return {
      id: `run-${i}`,
      job_name: MANUAL_PREVIEW_JOB_NAME,
      started_at: new Date(NOW.getTime() - i * 60_000).toISOString(),
      finished_at: new Date(NOW.getTime() - i * 60_000 + 100).toISOString(),
      ok: true,
      status: 'success',
      duration_ms: 123,
      error_code: null,
      summary: {
        runType: 'sla_manual_preview',
        dryRun: true,
        status: 'success',
        totals: {
          candidates: 1, create: 1, escalate: 0, resolve: 0, skipped: 0,
          plannedNotifications: 0, existingAlerts: 0,
        },
        loaderErrorsCount: 0,
        actionSampleCount: 1,
        totalActionCount: 1,
        // Unsafe extras that MUST be stripped by sanitization.
        user_id: 'usr-secret',
        phone: '+15551234567',
        email: 'leak@example.com',
      },
    };
  }

  it('caps results at MANUAL_PREVIEW_RUNS_CAP and sanitizes extras', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => makeRow(i));
    const read = vi.fn().mockResolvedValue({ data: rows, error: null });
    const res = await listManualSlaPreviewRuns(MANUAL_PREVIEW_RUNS_CAP, { read });
    expect(res.ok).toBe(true);
    expect(read).toHaveBeenCalledWith(MANUAL_PREVIEW_RUNS_CAP);
    expect(res.runs.length).toBeLessThanOrEqual(MANUAL_PREVIEW_RUNS_CAP);
    for (const r of res.runs) {
      expect(r.runType).toBe('sla_manual_preview');
      expect(r.dryRun).toBe(true);
      const json = JSON.stringify(r).toLowerCase();
      for (const banned of ['user_id', 'phone', 'email', 'leak@', 'recipient', 'token', 'secret']) {
        expect(json).not.toContain(banned);
      }
    }
  });

  it('clamps over-large limits to MANUAL_PREVIEW_RUNS_CAP', async () => {
    const read = vi.fn().mockResolvedValue({ data: [], error: null });
    await listManualSlaPreviewRuns(9999, { read });
    expect(read).toHaveBeenCalledWith(MANUAL_PREVIEW_RUNS_CAP);
  });

  it('returns ok:false on read error without throwing', async () => {
    const read = vi.fn().mockResolvedValue({ data: null, error: { message: 'rls' } });
    const res = await listManualSlaPreviewRuns(5, { read });
    expect(res).toEqual({ ok: false, runs: [], error: 'rls' });
  });

  it('never throws even when read rejects', async () => {
    const read = vi.fn().mockRejectedValue(new Error('boom'));
    const res = await listManualSlaPreviewRuns(5, { read });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('boom');
    expect(res.runs).toEqual([]);
  });
});

describe('2M source-level guarantees', () => {
  const writerSrc = readFileSync(
    resolve(__dirname, '../modules/operations/services/logManualSlaPreviewRun.ts'),
    'utf-8',
  );
  const readerSrc = readFileSync(
    resolve(__dirname, '../modules/operations/services/listManualSlaPreviewRuns.ts'),
    'utf-8',
  );
  const pageSrc = readFileSync(resolve(__dirname, '../pages/admin/AdminOperations.tsx'), 'utf-8');

  it('writer never schedules cron and does not touch operational_alerts/notifications', () => {
    for (const banned of [
      'cron.schedule', 'pg_cron', 'setInterval', 'setTimeout',
      'operational_alerts', '.from(\'notifications', 'twilio', 'resend.com',
      'sendTransactionalEmail', 'send_sms', 'pushNotification',
    ]) {
      expect(writerSrc.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('writer uses the dedicated manual job name (not "sla-sweep")', () => {
    expect(writerSrc).toMatch(/sla-manual-preview/);
    expect(writerSrc).not.toMatch(/['"]sla-sweep['"]/);
  });

  it('reader uses cron_run_log only with the manual job filter', () => {
    expect(readerSrc).toMatch(/cron_run_log/);
    expect(readerSrc).toMatch(/MANUAL_PREVIEW_JOB_NAME/);
    expect(readerSrc).not.toMatch(/operational_alerts/);
    expect(readerSrc).not.toMatch(/\.from\(['"]notifications['"]\)/);
  });

  it('admin page exposes no real-run / cron / mutation controls (2M no regressions)', () => {
    for (const banned of [
      'cron.schedule', 'pg_cron', 'applySlaSweepPlan',
      'dispatchPlannedNotifications', 'sendTransactionalEmail',
      'twilio', 'resend.com', 'pushnotification', 'webhook',
    ]) {
      expect(pageSrc.toLowerCase()).not.toContain(banned.toLowerCase());
    }
    expect(pageSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
  });
});