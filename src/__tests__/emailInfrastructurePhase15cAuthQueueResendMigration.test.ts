/**
 * EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15C
 * Pins the migration of the auth/transactional queue worker from the Lovable
 * email gateway to the project's Resend API key. Read-only guard.
 * See: docs/email-infrastructure-governance-phase-15c-auth-queue-resend-migration.md
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

function grep(pattern: string, paths: string[]): string {
  try {
    return execSync(
      `grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -E ${JSON.stringify(pattern)} ${paths.join(' ')} || true`,
      { encoding: 'utf8', cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
  } catch {
    return '';
  }
}

const QUEUE_PATH = 'supabase/functions/process-email-queue/index.ts';

describe('Email Infrastructure Phase 15C — Auth queue Resend migration', () => {
  const queueSrc = read(QUEUE_PATH);

  it('1. process-email-queue does not import @lovable.dev/email-js', () => {
    expect(queueSrc).not.toMatch(/@lovable\.dev\/email-js/);
  });

  it('2. process-email-queue does not call sendLovableEmail', () => {
    expect(queueSrc).not.toMatch(/sendLovableEmail/);
  });

  it('3. process-email-queue posts to api.resend.com/emails', () => {
    expect(queueSrc).toMatch(/https:\/\/api\.resend\.com\/emails/);
  });

  it('4. process-email-queue reads RESEND_API_KEY via Deno.env.get', () => {
    expect(queueSrc).toMatch(/Deno\.env\.get\(['"]RESEND_API_KEY['"]\)/);
  });

  it('5. no VITE_RESEND* references appear anywhere in the repo', () => {
    const hits = grep('VITE_RESEND', ['src', 'supabase'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/emailInfrastructurePhase15(a|c|d|e).*\.test\.ts/.test(line));
    expect(hits).toEqual([]);
  });

  it('6. no hardcoded Resend live key literals in the queue worker', () => {
    expect(queueSrc).not.toMatch(/['"`]re_[A-Za-z0-9]{12,}['"`]/);
  });

  it('7. no Lovable email fallback symbols remain (LOVABLE_API_KEY / LOVABLE_SEND_URL)', () => {
    expect(queueSrc).not.toMatch(/LOVABLE_API_KEY/);
    expect(queueSrc).not.toMatch(/LOVABLE_SEND_URL/);
  });

  it('8. queue worker does not log Authorization header or raw API key', () => {
    // Allow the literal header string in the request builder only; forbid any
    // log statement that references Authorization or the API key variable.
    const offending = queueSrc
      .split('\n')
      .filter((line) => /console\.(log|warn|error|info|debug)/.test(line))
      .filter((line) => /Authorization|resendApiKey|RESEND_API_KEY/.test(line));
    expect(offending).toEqual([]);
  });

  it('9. auth-email-hook still exists and continues to enqueue into auth_emails', () => {
    const hookPath = 'supabase/functions/auth-email-hook/index.ts';
    expect(existsSync(resolve(root, hookPath))).toBe(true);
    const src = read(hookPath);
    expect(src).toMatch(/enqueue_email/);
    expect(src).toMatch(/auth_emails/);
  });

  it('10. transactional app wrapper still exists and points at send-transactional-email', () => {
    const wrapperPath = 'src/modules/notifications/services/sendTransactionalEmail.ts';
    expect(existsSync(resolve(root, wrapperPath))).toBe(true);
    expect(read(wrapperPath)).toMatch(/supabase\.functions\.invoke\(['"]send-transactional-email['"]/);
  });

  it('11. no new duplicate sender path (only one Resend POST in the queue worker)', () => {
    const matches = queueSrc.match(/api\.resend\.com\/emails/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('12. no DB/RLS/RPC/migration files were created in this phase', () => {
    // Phase 15C is code-only. Any new migration would carry today's date or later
    // alongside a 15c marker; refuse it.
    const hits = grep('phase[-_ ]?15c', ['supabase/migrations'])
      .split('\n')
      .filter(Boolean);
    expect(hits).toEqual([]);
  });

  it('13. queue worker contains no any / ts-ignore / eslint-disable suppressions', () => {
    expect(queueSrc).not.toMatch(/\bany\b\s*[)>,;=]/);
    expect(queueSrc).not.toMatch(/as\s+any\b/);
    expect(queueSrc).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(queueSrc).not.toMatch(/eslint-disable/);
  });
});