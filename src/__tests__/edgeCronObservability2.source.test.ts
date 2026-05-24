import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * EDGE-CRON-OBSERVABILITY-2 source guards.
 *
 *  - membership-lifecycle-dispatcher is instrumented with log_cron_run
 *    (best-effort try/catch, safe summary counts, no secrets/payloads).
 *  - prune_cron_run_log helper is SECURITY DEFINER, search_path pinned,
 *    clamps days to a minimum of 30.
 *  - cron inventory doc lists the new prune schedule and instrumented
 *    functions, and does not regress to stale entries.
 *  - Admin UI page uses listCronRunLogs (no direct supabase.from),
 *    applies useNoIndex, exposes Arabic + English titles, refresh,
 *    and loading / empty / error states.
 *  - App route is admin-gated.
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
const DISPATCHER = readFileSync(
  resolve(repoRoot, 'supabase/functions/membership-lifecycle-dispatcher/index.ts'),
  'utf8',
);
const RECONCILE = readFileSync(
  resolve(repoRoot, 'supabase/functions/membership-payment-reconcile/index.ts'),
  'utf8',
);
const MONTHLY = readFileSync(
  resolve(repoRoot, 'supabase/functions/monthly-provider-credit-grant/index.ts'),
  'utf8',
);
const PAGE = readFileSync(resolve(repoRoot, 'src/pages/admin/AdminCronRuns.tsx'), 'utf8');
const APP = readFileSync(resolve(repoRoot, 'src/App.tsx'), 'utf8');
const DOC = readFileSync(resolve(repoRoot, 'docs/edge-cron-inventory.md'), 'utf8');

describe('membership-lifecycle-dispatcher logging', () => {
  it('calls log_cron_run', () => {
    expect(DISPATCHER).toMatch(/rpc\(\s*['"]log_cron_run['"]/);
    expect(DISPATCHER).toMatch(/membership-lifecycle-dispatcher/);
  });

  it('wraps the log call in try/catch (best-effort)', () => {
    expect(DISPATCHER).toMatch(/try\s*\{\s*await admin\.rpc\(\s*['"]log_cron_run['"][\s\S]*?\}\s*catch/);
  });

  it('logs only safe count keys', () => {
    const block = DISPATCHER.match(/rpc\(\s*['"]log_cron_run['"][\s\S]*?\}\s*\)/)?.[0] ?? '';
    expect(block).toBeTruthy();
    for (const k of ['processed', 'sent', 'skipped', 'failed', 'error_count']) {
      expect(block).toContain(k);
    }
    expect(block).not.toMatch(/Authorization|service_role|apikey|secret|token|bearer|payload|recipient|email/i);
  });
});

describe('previous instrumentation still intact', () => {
  it('reconcile still logs', () => {
    expect(RECONCILE).toMatch(/rpc\(\s*['"]log_cron_run['"]/);
  });
  it('monthly credit grant still logs', () => {
    expect(MONTHLY).toMatch(/rpc\(\s*['"]log_cron_run['"]/);
  });
});

describe('prune_cron_run_log migration', () => {
  it('defines the function as SECURITY DEFINER with pinned search_path', () => {
    expect(MIG).toMatch(/FUNCTION public\.prune_cron_run_log/);
    const block = MIG.match(/FUNCTION public\.prune_cron_run_log[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(block).toMatch(/SECURITY DEFINER/);
    expect(block).toMatch(/SET search_path\s*=\s*public/);
  });

  it('clamps minimum days to 30', () => {
    const block = MIG.match(/FUNCTION public\.prune_cron_run_log[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(block).toMatch(/GREATEST\([\s\S]*?,\s*30\)/);
  });

  it('returns the documented jsonb envelope', () => {
    const block = MIG.match(/FUNCTION public\.prune_cron_run_log[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(block).toContain("'ok'");
    expect(block).toContain("'deleted'");
    expect(block).toContain("'older_than_days'");
  });

  it('restricts EXECUTE away from anon', () => {
    expect(MIG).toMatch(/REVOKE ALL ON FUNCTION public\.prune_cron_run_log[\s\S]*FROM PUBLIC, anon, authenticated/);
    expect(MIG).toMatch(/GRANT EXECUTE ON FUNCTION public\.prune_cron_run_log[\s\S]*TO service_role/);
  });

  it('cron_run_log RLS read-only contract preserved', () => {
    expect(MIG).toMatch(/ALTER TABLE public\.cron_run_log ENABLE ROW LEVEL SECURITY/);
    expect(MIG).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR INSERT/i);
    expect(MIG).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR UPDATE/i);
    expect(MIG).not.toMatch(/CREATE POLICY[^;]*cron_run_log[^;]*FOR DELETE/i);
  });
});

describe('Admin Cron Runs UI', () => {
  it('imports listCronRunLogs and not the raw client table', () => {
    expect(PAGE).toMatch(/listCronRunLogs/);
    expect(PAGE).not.toMatch(/from\(\s*['"]cron_run_log['"]\s*\)/);
    expect(PAGE).not.toMatch(/supabase\.from/);
  });

  it('applies useNoIndex and admin page meta', () => {
    expect(PAGE).toMatch(/useNoIndex\(\)/);
    expect(PAGE).toMatch(/usePageMeta/);
  });

  it('has Arabic and English titles', () => {
    expect(PAGE).toContain('سجل تشغيل المهام المجدولة');
    expect(PAGE).toContain('Cron Run Log');
  });

  it('has refresh control and loading/empty/error states', () => {
    expect(PAGE).toMatch(/Refresh|تحديث/);
    expect(PAGE).toMatch(/Loader2/);
    expect(PAGE).toContain('No cron runs recorded yet.');
    expect(PAGE).toContain('لا توجد تشغيلات مسجلة بعد.');
    expect(PAGE).toMatch(/Failed to load logs|تعذر تحميل السجلات/);
    expect(PAGE).toMatch(/Retry|إعادة المحاولة/);
  });

  it('does not JSON.stringify the summary blob', () => {
    expect(PAGE).not.toMatch(/JSON\.stringify\(\s*[a-zA-Z_]*summary/);
  });

  it('route is admin-protected', () => {
    expect(APP).toMatch(/\/admin\/cron-runs[\s\S]*requireAdmin[\s\S]*AdminCronRuns/);
  });
});

describe('docs/edge-cron-inventory.md', () => {
  it('lists prune-cron-run-log-daily', () => {
    expect(DOC).toContain('prune-cron-run-log-daily');
    expect(DOC).toContain('prune_cron_run_log');
  });

  it('still lists the post-repair schedules', () => {
    expect(DOC).toContain('membership-payment-reconcile-hourly');
    expect(DOC).toContain('monthly-provider-credit-grant');
    expect(DOC).toContain('membership-lifecycle-dispatcher');
  });

  it('does not list check-migration-alerts as active', () => {
    const active = DOC.split('### Removed')[0];
    expect(active).not.toMatch(/`check-migration-alerts`/);
  });

  it('weekly-sla-report appears exactly once in active table', () => {
    const active = DOC.split('### Removed')[0];
    const matches = active.match(/\|\s*`weekly-sla-report`\s*\|/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('redacts secrets and contains no full JWT prefixes', () => {
    expect(DOC).toMatch(/REDACTED/);
    expect(DOC).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });
});