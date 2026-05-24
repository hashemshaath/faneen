import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * EDGE-CRON-OBSERVABILITY-1 source guards.
 *
 *  - migration defines cron_run_log + RLS + admin-only read
 *  - log_cron_run helper is SECURITY DEFINER, pinned search_path,
 *    truncates error_message, strips secret-like keys, service_role only
 *  - membership-payment-reconcile logs on cron-sweep only, with safe summary
 *  - monthly-provider-credit-grant logs with safe summary
 *  - cronRuns service uses exact table + columns and is read-only
 */

const repoRoot = resolve(__dirname, '../..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');

function readAllMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(migrationsDir, f), 'utf8'))
    .join('\n');
}

const MIGRATIONS = readAllMigrations();
const RECONCILE = readFileSync(
  resolve(repoRoot, 'supabase/functions/membership-payment-reconcile/index.ts'),
  'utf8',
);
const MONTHLY = readFileSync(
  resolve(repoRoot, 'supabase/functions/monthly-provider-credit-grant/index.ts'),
  'utf8',
);
const SERVICE = readFileSync(
  resolve(repoRoot, 'src/modules/system/services/cronRuns.ts'),
  'utf8',
);

describe('cron_run_log migration', () => {
  it('creates the cron_run_log table with required columns', () => {
    expect(MIGRATIONS).toMatch(/CREATE TABLE IF NOT EXISTS public\.cron_run_log/i);
    for (const col of [
      'job_name',
      'function_name',
      'started_at',
      'finished_at',
      'ok',
      'status',
      'summary',
      'error_code',
      'error_message',
      'duration_ms',
    ]) {
      expect(MIGRATIONS).toContain(col);
    }
  });

  it('enables RLS and grants admin read only', () => {
    expect(MIGRATIONS).toMatch(/ALTER TABLE public\.cron_run_log ENABLE ROW LEVEL SECURITY/i);
    expect(MIGRATIONS).toMatch(/CREATE POLICY[\s\S]*cron_run_log admin read[\s\S]*FOR SELECT[\s\S]*has_role/i);
    // No insert/update/delete policies for end users
    expect(MIGRATIONS).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR INSERT/i);
    expect(MIGRATIONS).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR UPDATE/i);
    expect(MIGRATIONS).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR DELETE/i);
  });

  it('defines log_cron_run as SECURITY DEFINER with pinned search_path', () => {
    expect(MIGRATIONS).toMatch(/FUNCTION public\.log_cron_run/);
    expect(MIGRATIONS).toMatch(/SECURITY DEFINER[\s\S]*SET search_path\s*=\s*public/i);
  });

  it('truncates error_message and strips secret-like keys from summary', () => {
    expect(MIGRATIONS).toMatch(/left\(\s*COALESCE\(_error_message[^)]*\)\s*,\s*500\s*\)/);
    for (const forbidden of [
      'authorization',
      'apikey',
      'secret',
      'password',
      'token',
      'service_role',
      'bearer',
      'provider_payload',
    ]) {
      expect(MIGRATIONS).toContain(`'${forbidden}'`);
    }
  });

  it('restricts log_cron_run execute to service_role', () => {
    expect(MIGRATIONS).toMatch(/REVOKE ALL ON FUNCTION public\.log_cron_run[\s\S]*FROM PUBLIC, anon, authenticated/);
    expect(MIGRATIONS).toMatch(/GRANT EXECUTE ON FUNCTION public\.log_cron_run[\s\S]*TO service_role/);
  });
});

describe('membership-payment-reconcile logging', () => {
  it('logs only inside the cron-sweep branch', () => {
    // call exists
    expect(RECONCILE).toMatch(/rpc\(\s*['"]log_cron_run['"]/);
    // and is reachable only from sweep: job name is the sweep schedule
    expect(RECONCILE).toMatch(/membership-payment-reconcile-hourly/);
  });

  it('logs a safe summary envelope (no raw provider payload)', () => {
    for (const key of [
      'scanned',
      'processed',
      'succeeded',
      'failed',
      'cancelled',
      'still_pending',
      'error_count',
    ]) {
      expect(RECONCILE).toContain(key);
    }
    // never echo provider snapshots/payloads into the log call
    const logBlock = RECONCILE.match(/rpc\(\s*['"]log_cron_run['"][\s\S]*?\}\s*\)/);
    expect(logBlock).toBeTruthy();
    expect(logBlock?.[0]).not.toMatch(/snapshot|payload|Authorization|service_role/i);
  });

  it('wraps the log call in try/catch so cron never fails on log error', () => {
    expect(RECONCILE).toMatch(/try\s*\{\s*await admin\.rpc\(\s*['"]log_cron_run['"][\s\S]*?\}\s*catch/);
  });
});

describe('monthly-provider-credit-grant logging', () => {
  it('logs run with safe summary keys', () => {
    expect(MONTHLY).toMatch(/rpc\(\s*['"]log_cron_run['"]/);
    for (const key of ['processed', 'granted', 'skipped', 'error_count']) {
      expect(MONTHLY).toContain(key);
    }
  });

  it('wraps the log call in try/catch', () => {
    const matches = MONTHLY.match(/try\s*\{[\s\S]*?log_cron_run[\s\S]*?\}\s*catch/g);
    expect(matches && matches.length).toBeGreaterThanOrEqual(1);
  });

  it('never serializes raw provider/auth content into the log call', () => {
    const logBlocks = MONTHLY.match(/rpc\(\s*['"]log_cron_run['"][\s\S]*?\}\s*\)/g) ?? [];
    expect(logBlocks.length).toBeGreaterThan(0);
    for (const block of logBlocks) {
      expect(block).not.toMatch(/Authorization|service_role|apikey|secret|payload|snapshot/i);
    }
  });
});

describe('cronRuns service wrapper', () => {
  it('targets the cron_run_log table with the documented columns', () => {
    expect(SERVICE).toMatch(/from\(\s*TABLE\s*\)/);
    expect(SERVICE).toMatch(/cron_run_log/);
    for (const col of [
      'id',
      'job_name',
      'function_name',
      'started_at',
      'finished_at',
      'ok',
      'status',
      'summary',
      'error_code',
      'error_message',
      'duration_ms',
      'created_at',
    ]) {
      expect(SERVICE).toContain(col);
    }
  });

  it('orders desc by started_at and bounds the limit', () => {
    expect(SERVICE).toMatch(/\.order\(\s*['"]started_at['"]\s*,\s*\{\s*ascending:\s*false\s*\}/);
    expect(SERVICE).toMatch(/Math\.min\(\s*Math\.max\(\s*params\.limit\s*\?\?\s*\d+\s*,\s*1\s*\)\s*,\s*200\s*\)/);
  });

  it('exposes only read wrappers — no insert/update/delete', () => {
    expect(SERVICE).not.toMatch(/\.insert\(/);
    expect(SERVICE).not.toMatch(/\.update\(/);
    expect(SERVICE).not.toMatch(/\.delete\(/);
  });

  it('uses maybeSingle for the by-id lookup', () => {
    expect(SERVICE).toMatch(/getCronRunLogById[\s\S]*\.eq\(\s*['"]id['"]/);
    expect(SERVICE).toMatch(/\.maybeSingle\(\)/);
  });
});