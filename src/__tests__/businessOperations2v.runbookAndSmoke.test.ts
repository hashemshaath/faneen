/**
 * BUSINESS-OPERATIONS-2V — Runbook + Deno smoke harness source tests.
 *
 * Asserts that:
 *   - `docs/manual-sla-real-run-runbook.md` exists and contains the
 *     required safety warnings, denial-mode examples, approval-shape
 *     reference, rollback steps, and operator checklist.
 *   - `scripts/manual-sla-real-run-smoke.mjs` exists, defaults to
 *     denial expectation, redacts the Authorization header, refuses
 *     to enable notification writes, never embeds a service-role key
 *     literal, never hardcodes `OPERATIONS_REAL_RUN_ENABLED=true`,
 *     and never imports notification / cron / scheduler surfaces.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const RUNBOOK = resolve(ROOT, 'docs/manual-sla-real-run-runbook.md');
const SMOKE = resolve(ROOT, 'scripts/manual-sla-real-run-smoke.mjs');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('BUSINESS-OPERATIONS-2V — runbook + smoke harness', () => {
  it('runbook file exists', () => {
    expect(existsSync(RUNBOOK)).toBe(true);
  });

  it('runbook contains required safety warnings and sections', () => {
    const src = read(RUNBOOK);
    expect(src).toMatch(/DISABLED in production/i);
    expect(src).toMatch(/Prerequisites/);
    expect(src).toMatch(/Required environment variables/);
    expect(src).toMatch(/Secret handling rules/);
    expect(src).toMatch(/Denial-mode curl examples/);
    expect(src).toMatch(/Gates-open .* no-op/);
    expect(src).toMatch(/Approval payload shape/);
    expect(src).toMatch(/Expected safe responses/);
    expect(src).toMatch(/keep the flag disabled/i);
    expect(src).toMatch(/Rollback \/ disable steps/);
    expect(src).toMatch(/What NOT to do/);
    expect(src).toMatch(/operator checklist/i);
    expect(src).toMatch(/OPERATIONS_REAL_RUN_ENABLED/);
    expect(src).toMatch(/NOTIFICATION_WRITES_DEFERRED/);
  });

  it('runbook does not enable real execution or expose secrets', () => {
    const src = read(RUNBOOK);
    expect(src).not.toMatch(/OPERATIONS_REAL_RUN_ENABLED\s*=\s*true/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=/);
    expect(src).not.toMatch(/service[_-]?role[_-]?key\s*[:=]\s*['"]/i);
  });

  it('smoke harness file exists', () => {
    expect(existsSync(SMOKE)).toBe(true);
  });

  it('smoke harness defaults to denial expectation', () => {
    const src = read(SMOKE);
    expect(src).toMatch(/defaultedToDenial:\s*true/);
    expect(src).toMatch(/UNEXPECTED_ACCEPT/);
    // Refuses any caller-supplied override:
    expect(src).toMatch(/MANUAL_SLA_SMOKE_FORCE_ACCEPT/);
    expect(src).toMatch(/FORCE_ACCEPT_NOT_PERMITTED/);
  });

  it('smoke harness redacts Authorization header', () => {
    const src = read(SMOKE);
    expect(src).toMatch(/maskHeader/);
    expect(src).toMatch(/<redacted>/);
    // The bearer token value must never be interpolated into output:
    expect(src).not.toMatch(/JSON\.stringify\([^)]*bearer/);
    expect(src).not.toMatch(/console\.log\([^)]*bearer/i);
  });

  it('smoke harness never enables notification writes or hardcodes the flag', () => {
    const src = read(SMOKE);
    // Ignore the explanatory comment line that documents what we never set.
    const stripped = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(stripped).not.toMatch(/enableNotificationWrites\s*:\s*true/);
    expect(src).not.toMatch(/OPERATIONS_REAL_RUN_ENABLED\s*=\s*['"]true/);
    expect(src).not.toMatch(/process\.env\.OPERATIONS_REAL_RUN_ENABLED\s*=/);
  });

  it('smoke harness never embeds a service-role key literal', () => {
    const src = read(SMOKE);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/service_role/);
    expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/); // JWT-shaped literals
  });

  it('smoke harness imports no notification / cron / scheduler / supabase-client modules', () => {
    const src = read(SMOKE);
    expect(src).not.toMatch(/from\s+['"][^'"]*notification[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*email[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*sms[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*whatsapp[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*push[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*cron[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"][^'"]*scheduler[^'"]*['"]/i);
    expect(src).not.toMatch(/from\s+['"]@supabase\/supabase-js['"]/);
  });

  it('smoke harness exits non-zero on usage error (no URL, no --no-network)', () => {
    const src = read(SMOKE);
    expect(src).toMatch(/MANUAL_SLA_REAL_RUN_URL_REQUIRED/);
    // Usage error path emits exit code 2 via emit(..., 2).
    expect(src).toMatch(/emit\([^)]*,\s*2\s*\)/);
    expect(src).toMatch(/process\.exit\(exitCode\)/);
  });

  it('smoke harness supports --no-network envelope validation', () => {
    const src = read(SMOKE);
    expect(src).toMatch(/--no-network/);
    expect(src).toMatch(/validate-envelope/);
  });
});

describe('BUSINESS-OPERATIONS-2V — AdminOperations runbook row', () => {
  it('AdminOperations exposes a read-only runbook status row', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/pages/admin/AdminOperations.tsx'),
      'utf8',
    );
    expect(src).toMatch(/Manual SLA runbook/);
    expect(src).toMatch(/Available/);
    // Scope to just the runbook row object. It must be a pure
    // data row with label/value/tone — no onClick, mutation, or
    // edge-function invocation.
    const match = src.match(
      /\{\s*label:[^{}]*Manual SLA runbook[^{}]*\}/,
    );
    expect(match, 'runbook row object not found').toBeTruthy();
    const row = match![0];
    expect(row).not.toMatch(/onClick/);
    expect(row).not.toMatch(/useMutation/);
    expect(row).not.toMatch(/functions\.invoke/);
    expect(row).not.toMatch(/href/);
  });
});