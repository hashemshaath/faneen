/**
 * BUSINESS-OPERATIONS-2U — Server-only edge entry point source tests.
 *
 * Asserts that `supabase/functions/manual-sla-real-run/index.ts`:
 *   - exists,
 *   - is POST-only,
 *   - requires Authorization Bearer,
 *   - requires admin/super_admin via `has_admin_access`,
 *   - is gated on `OPERATIONS_REAL_RUN_ENABLED === 'true'`,
 *   - requires approvalId + approval payload + confirmationToken + reason,
 *   - requires `dryRun === false` and `enableWrites === true`,
 *   - imports `createManualRunDependencyBundle` and
 *     `invokeManualSlaRealRunHarness`,
 *   - forces notification writes to be deferred,
 *   - handles CORS OPTIONS,
 *   - does NOT import any notification/email/SMS/push/WhatsApp surface,
 *   - does NOT register any cron/scheduler wiring,
 *   - does NOT leak the service-role key to the response,
 *   - is NOT referenced by any frontend code under `src/`.
 *
 * Companion UI assertions ensure AdminOperations exposes a read-only row
 * for the endpoint without any onClick/invoke/mutation.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..', '..');
const EDGE = resolve(
  ROOT,
  'supabase/functions/manual-sla-real-run/index.ts',
);

function readEdge(): string {
  return readFileSync(EDGE, 'utf8');
}

describe('BUSINESS-OPERATIONS-2U — manual-sla-real-run edge entry', () => {
  it('edge function file exists', () => {
    expect(existsSync(EDGE)).toBe(true);
  });

  it('is POST-only with explicit method rejection', () => {
    const src = readEdge();
    expect(src).toMatch(/req\.method\s*!==\s*['"]POST['"]/);
    expect(src).toMatch(/METHOD_NOT_ALLOWED/);
  });

  it('handles CORS OPTIONS preflight', () => {
    const src = readEdge();
    expect(src).toMatch(/req\.method\s*===\s*['"]OPTIONS['"]/);
    expect(src).toMatch(/Access-Control-Allow-Origin/);
    expect(src).toMatch(/Access-Control-Allow-Headers/);
  });

  it('requires Authorization Bearer header', () => {
    const src = readEdge();
    expect(src).toMatch(/Authorization/);
    expect(src).toMatch(/Bearer/);
    expect(src).toMatch(/AUTHORIZATION_REQUIRED/);
  });

  it('validates caller via Supabase Auth and admin RPC', () => {
    const src = readEdge();
    expect(src).toMatch(/auth\.getUser\(/);
    expect(src).toMatch(/has_admin_access/);
    expect(src).toMatch(/ADMIN_ROLE_REQUIRED/);
  });

  it('requires OPERATIONS_REAL_RUN_ENABLED === "true"', () => {
    const src = readEdge();
    expect(src).toMatch(/OPERATIONS_REAL_RUN_ENABLED/);
    expect(src).toMatch(/!==\s*['"]true['"]/);
    expect(src).toMatch(/OPERATIONS_REAL_RUN_DISABLED/);
  });

  it('requires approvalId, approval payload, confirmationToken, reason', () => {
    const src = readEdge();
    expect(src).toMatch(/APPROVAL_ID_REQUIRED/);
    expect(src).toMatch(/APPROVAL_PAYLOAD_REQUIRED/);
    expect(src).toMatch(/CONFIRMATION_TOKEN_REQUIRED/);
    expect(src).toMatch(/REASON_REQUIRED/);
  });

  it('requires dryRun === false and enableWrites === true', () => {
    const src = readEdge();
    expect(src).toMatch(/DRY_RUN_MUST_BE_FALSE/);
    expect(src).toMatch(/ENABLE_WRITES_MUST_BE_TRUE/);
    expect(src).toMatch(/dryRun\s*!==\s*false/);
    expect(src).toMatch(/enableWrites\s*!==\s*true/);
  });

  it('imports the harness and dependency bundle factory', () => {
    const src = readEdge();
    expect(src).toMatch(/invokeManualSlaRealRunHarness/);
    expect(src).toMatch(/createManualRunDependencyBundle/);
  });

  it('constructs the service-role client only inside the function', () => {
    const src = readEdge();
    expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).toMatch(/createClient\(\s*supabaseUrl\s*,\s*serviceRoleKey/);
  });

  it('forces notification writes to be deferred', () => {
    const src = readEdge();
    expect(src).toMatch(/enableNotificationWrites:\s*false/);
    expect(src).toMatch(/NOTIFICATION_WRITES_DEFERRED_REASON/);
  });

  it('does not import notification/email/SMS/push/WhatsApp surfaces', () => {
    const src = readEdge();
    expect(src).not.toMatch(/notification/i);
    expect(src).not.toMatch(/dispatcher/i);
    expect(src).not.toMatch(/sendEmail|smtp|sendgrid|twilio|whatsapp|push-/i);
  });

  it('does not wire cron / scheduler', () => {
    const src = readEdge();
    expect(src).not.toMatch(/cron\.schedule|pg_cron|setInterval|scheduler/i);
  });

  it('never leaks the service-role key to the response or logs', () => {
    const src = readEdge();
    // service-role key reference must only appear inside `Deno.env.get(...)`
    const occurrences = src.match(/SUPABASE_SERVICE_ROLE_KEY/g) ?? [];
    expect(occurrences.length).toBeGreaterThan(0);
    expect(src).not.toMatch(/console\.log\([^)]*serviceRoleKey/);
    expect(src).not.toMatch(/JSON\.stringify\([^)]*serviceRoleKey/);
    // response envelope must not echo the service-role key
    expect(src).not.toMatch(/serviceRoleKey[^,}\n]*[,}]\s*[A-Za-z_]*:\s*serviceRoleKey/);
  });

  it('never throws raw errors to the client', () => {
    const src = readEdge();
    expect(src).toMatch(/INTERNAL_ERROR/);
    // top-level catch must NOT include err.message in the response body
    expect(src).not.toMatch(/err\.message/);
  });

  it('is NOT imported by any frontend code under src/', () => {
    function* walk(dir: string): Generator<string> {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          yield* walk(full);
        } else if (
          /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
          !entry.name.endsWith('.test.ts') &&
          !entry.name.endsWith('.test.tsx')
        ) {
          yield full;
        }
      }
    }
    const srcDir = resolve(ROOT, 'src');
    for (const file of walk(srcDir)) {
      const body = readFileSync(file, 'utf8');
      expect(
        /manual-sla-real-run/.test(body),
        `${file} unexpectedly references manual-sla-real-run`,
      ).toBe(false);
    }
  });

  it('AdminOperations exposes a read-only row and no execution surface', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/pages/admin/AdminOperations.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Manual SLA edge endpoint/);
    expect(src).toMatch(/Deployed \/ Disabled by flag/);
    expect(src).not.toMatch(/manual-sla-real-run/);
    expect(src).not.toMatch(/functions\.invoke\(/);
    // No real-run-triggering onClick handler is wired
    expect(src).not.toMatch(/onClick=\{[^}]*realRun/i);
    expect(src).not.toMatch(/useMutation\([^)]*real[_-]?run/i);
  });

  it('operations isolation audit passes', () => {
    const res = spawnSync(
      'node',
      [resolve(ROOT, 'scripts/operations-isolation-audit.mjs')],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } },
    );
    if (res.status !== 0) {
      console.error(res.stdout);
      console.error(res.stderr);
    }
    expect(res.status).toBe(0);
  });

  it('edge functions isolation audit passes', () => {
    const res = spawnSync(
      'node',
      [resolve(ROOT, 'scripts/edge-functions-isolation-audit.mjs')],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } },
    );
    if (res.status !== 0) {
      console.error(res.stdout);
      console.error(res.stderr);
    }
    expect(res.status).toBe(0);
  });

  it('edge function file is not gigantic (sanity)', () => {
    const size = statSync(EDGE).size;
    expect(size).toBeGreaterThan(500);
    expect(size).toBeLessThan(20_000);
  });
});