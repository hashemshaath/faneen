import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * ADMIN-CRON-AGGREGATE-RPC-1 source guards.
 *
 *  - public.get_cron_run_health migration exists with SECURITY DEFINER,
 *    pinned search_path, admin gate, time-window default + clamp, success
 *    rate calculation, and no summary/error_message exposure.
 *  - REVOKE from PUBLIC/anon and GRANT EXECUTE to authenticated/service_role.
 *  - Service wrapper exports getCronRunHealth + CronRunHealthRow type and
 *    calls rpc('get_cron_run_health', { _since }).
 *  - AdminCronRuns page wires the new RPC for the rollup and per-job
 *    section, keeps listCronRunLogs for the log table, preserves admin
 *    route protection, and does not leak raw summary payloads.
 */

const repoRoot = resolve(__dirname, '../..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');

function allMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(migrationsDir, f), 'utf8'))
    .join('\n');
}

const MIG = allMigrations();
const SERVICE = readFileSync(
  resolve(repoRoot, 'src/modules/system/services/cronRuns.ts'),
  'utf8',
);
const PAGE = readFileSync(resolve(repoRoot, 'src/pages/admin/AdminCronRuns.tsx'), 'utf8');
const APP = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf8');

function rpcBlock(): string {
  return MIG.match(/FUNCTION public\.get_cron_run_health[\s\S]*?\$\$;/)?.[0] ?? '';
}

describe('get_cron_run_health migration', () => {
  it('defines the function', () => {
    expect(MIG).toMatch(/FUNCTION public\.get_cron_run_health/);
    expect(rpcBlock()).toBeTruthy();
  });

  it('is SECURITY DEFINER with pinned search_path', () => {
    const b = rpcBlock();
    expect(b).toMatch(/SECURITY DEFINER/);
    expect(b).toMatch(/SET search_path\s*=\s*public/);
  });

  it('admin-gates via has_role or super_admin', () => {
    const b = rpcBlock();
    expect(b).toMatch(/has_role\(\s*auth\.uid\(\)\s*,\s*'admin'/);
    expect(b).toMatch(/super_admin/);
    expect(b).toMatch(/RAISE EXCEPTION\s+'forbidden'/);
  });

  it('defaults the time window to 30 days and clamps to 180 days', () => {
    const b = rpcBlock();
    expect(b).toMatch(/COALESCE\(\s*_since\s*,\s*now\(\)\s*-\s*interval\s*'30 days'/);
    expect(b).toMatch(/interval\s*'180 days'/);
  });

  it('computes success_rate and latest run timestamps', () => {
    const b = rpcBlock();
    expect(b).toMatch(/success_rate/);
    expect(b).toMatch(/COUNT\(\*\) FILTER \(WHERE b\.ok IS TRUE\)/);
    expect(b).toMatch(/COUNT\(\*\) FILTER \(WHERE b\.ok IS FALSE\)/);
    expect(b).toMatch(/100\.0/);
    expect(b).toMatch(/last_run_at/);
    expect(b).toMatch(/last_ok_at/);
    expect(b).toMatch(/last_failed_at/);
    expect(b).toMatch(/DISTINCT ON \(b\.job_name\)/);
  });

  it('does not expose summary jsonb or error_message in the return type', () => {
    const b = rpcBlock();
    // RETURNS TABLE only declares aggregate columns.
    const returns = b.match(/RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/)?.[1] ?? '';
    expect(returns).toBeTruthy();
    expect(returns).not.toMatch(/\bsummary\b/);
    expect(returns).not.toMatch(/\berror_message\b/);
  });

  it('restricts EXECUTE from PUBLIC/anon and grants to authenticated/service_role', () => {
    expect(MIG).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_cron_run_health\(timestamptz\)\s+FROM PUBLIC, anon/,
    );
    expect(MIG).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_cron_run_health\(timestamptz\)\s+TO authenticated, service_role/,
    );
  });
});

describe('getCronRunHealth service wrapper', () => {
  it('exports the wrapper and row type', () => {
    expect(SERVICE).toMatch(/export\s+async\s+function\s+getCronRunHealth/);
    expect(SERVICE).toMatch(/export\s+interface\s+CronRunHealthRow/);
  });

  it('calls rpc("get_cron_run_health", { _since })', () => {
    expect(SERVICE).toMatch(
      /supabase\.rpc\(\s*['"]get_cron_run_health['"]\s*,\s*\{\s*_since\s*\}\s*\)/,
    );
  });

  it('passes the sinceIso through (no client-side default of its own)', () => {
    // params.sinceIso ?? null — server applies the 30-day default.
    expect(SERVICE).toMatch(/params\.sinceIso\s*\?\?\s*null/);
  });
});

describe('AdminCronRuns page wiring', () => {
  it('imports getCronRunHealth and the row type', () => {
    expect(PAGE).toMatch(/getCronRunHealth/);
    expect(PAGE).toMatch(/CronRunHealthRow/);
  });

  it('still uses listCronRunLogs for the raw log table', () => {
    expect(PAGE).toMatch(/listCronRunLogs/);
  });

  it('does not access cron_run_log directly', () => {
    expect(PAGE).not.toMatch(/from\(\s*['"]cron_run_log['"]\s*\)/);
    expect(PAGE).not.toMatch(/supabase\.from/);
  });

  it('renders the Job health section in both languages', () => {
    expect(PAGE).toContain('صحة المهام حسب الوظيفة');
    expect(PAGE).toContain('Job health');
  });

  it('renders the localized empty state for the selected window', () => {
    expect(PAGE).toContain('لا توجد بيانات كافية للفترة المحددة.');
    expect(PAGE).toContain('Not enough data for the selected period.');
  });

  it('shows a friendly health-error fallback', () => {
    expect(PAGE).toMatch(/Failed to load (health summary|job health)/);
    expect(PAGE).toMatch(/تعذر تحميل (ملخص الصحة|صحة المهام)/);
  });

  it('renders a success-rate badge that varies with failure counts', () => {
    expect(PAGE).toMatch(/successBadgeClass/);
    expect(PAGE).toMatch(/bg-success\/10/);
    expect(PAGE).toMatch(/bg-destructive\/10/);
  });

  it('does not JSON.stringify the summary blob', () => {
    expect(PAGE).not.toMatch(/JSON\.stringify\(\s*[a-zA-Z_]*summary/);
  });

  it('preserves useNoIndex and admin route protection', () => {
    expect(PAGE).toMatch(/useNoIndex\(\)/);
    expect(APP).toMatch(/\/admin\/cron-runs[\s\S]*requireAdmin[\s\S]*AdminCronRuns/);
  });

  it('exposes a window selector that drives sinceIso', () => {
    expect(PAGE).toMatch(/setWindowDays/);
    expect(PAGE).toMatch(/sinceIso/);
  });
});