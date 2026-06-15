/**
 * EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15E
 * Read-only guard for the email logs + deliverability dashboard audit.
 * See: docs/email-infrastructure-governance-phase-15e-logs-deliverability-audit.md
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

const AUDIT_DOC = 'docs/email-infrastructure-governance-phase-15e-logs-deliverability-audit.md';
const QUEUE = 'supabase/functions/process-email-queue/index.ts';
const TX = 'supabase/functions/send-transactional-email/index.ts';
const DELIVERABILITY_PAGE = 'src/pages/admin/AdminEmailDeliverability.tsx';
const EMAIL_CENTER_LOGS = 'src/components/admin/email-center/EmailDeliveryLogs.tsx';

describe('Email Infrastructure Phase 15E — Logs + Deliverability Audit', () => {
  it('1. audit doc exists', () => {
    expect(existsSync(resolve(root, AUDIT_DOC))).toBe(true);
  });

  it('2. process-email-queue never logs Authorization or API key values', () => {
    const src = read(QUEUE);
    // Authorization header value is only constructed in the fetch() call, never console.log'd.
    expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*Authorization/);
    expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*resendApiKey/);
    expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*RESEND_API_KEY/);
  });

  it('3. process-email-queue does not use the Lovable email gateway', () => {
    const src = read(QUEUE);
    expect(src).not.toMatch(/@lovable\.dev\/email-js/);
    expect(src).not.toMatch(/sendLovableEmail/);
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
  });

  it('4. Resend provider metadata is captured on success in both senders', () => {
    const q = read(QUEUE);
    const t = read(TX);
    expect(q).toMatch(/provider:\s*['"]resend['"]/);
    expect(q).toMatch(/provider_id/);
    expect(t).toMatch(/provider:\s*['"]resend['"]/);
    expect(t).toMatch(/provider_id/);
  });

  it('5. neither sender logs reset/invite tokens or unsubscribe tokens', () => {
    for (const path of [QUEUE, TX]) {
      const src = read(path);
      expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*unsubscribe_token/);
      expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*reset[_-]?token/i);
      expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*invite[_-]?token/i);
      // payload.html / payload.text bodies must not be logged
      expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*payload\.html/);
      expect(src).not.toMatch(/console\.(log|warn|error|info)\([^)]*payload\.text/);
    }
  });

  it('6. admin deliverability + email-center UIs never render secrets or raw bodies', () => {
    for (const path of [DELIVERABILITY_PAGE, EMAIL_CENTER_LOGS]) {
      const src = read(path);
      expect(src).not.toMatch(/RESEND_API_KEY/);
      expect(src).not.toMatch(/SERVICE_ROLE/);
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
      // No raw token / reset-link rendering
      expect(src).not.toMatch(/\.token\b/);
      expect(src).not.toMatch(/raw[_-]?body/i);
    }
  });

  it('7. no hardcoded Resend live keys in send code or admin UI', () => {
    const paths = [QUEUE, TX, DELIVERABILITY_PAGE, EMAIL_CENTER_LOGS, AUDIT_DOC];
    const literalKey = /re_[A-Za-z0-9]{12,}/;
    for (const p of paths) {
      expect(read(p), `unexpected re_ literal in ${p}`).not.toMatch(literalKey);
    }
  });

  it('8. no VITE_RESEND* anywhere in src/ or supabase/', () => {
    const hits = grep('VITE_RESEND', ['src', 'supabase'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/emailInfrastructurePhase15[a-z]?.*\.test\.ts/.test(line));
    expect(hits).toEqual([]);
  });

  it('9. Phase 15E introduces no migrations and does not touch send DB shape', () => {
    const migHits = grep('phase[-_ ]?15e', ['supabase/migrations'])
      .split('\n')
      .filter(Boolean);
    expect(migHits).toEqual([]);

    // Sender shape unchanged: queue still posts to Resend; tx still inserts into email_send_log.
    expect(read(QUEUE)).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(read(TX)).toMatch(/email_send_log/);
  });

  it('10. audit doc + guard contain no suppressions or unsafe casts', () => {
    const src = read(AUDIT_DOC) + '\n' + read(resolve(root, __filename));
    expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(src).not.toMatch(/eslint-disable/);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/:\s*any\b/);
  });

  it('11. audit doc flags delivered/bounced/complained as needing a Resend webhook', () => {
    const src = read(AUDIT_DOC);
    // The doc must NOT claim these statuses are authoritative today.
    expect(src).toMatch(/Resend webhook/i);
    expect(src).toMatch(/bounced/i);
    expect(src).toMatch(/complained/i);
    expect(src).toMatch(/PARTIAL/);
  });

  it('12. retry / DLQ / TTL semantics remain in process-email-queue', () => {
    const src = read(QUEUE);
    expect(src).toMatch(/MAX_RETRIES\s*=\s*5/);
    expect(src).toMatch(/auth_email_ttl_minutes/);
    expect(src).toMatch(/transactional_email_ttl_minutes/);
    expect(src).toMatch(/move_to_dlq/);
    expect(src).toMatch(/retry_after_until/);
    // duplicate-send guard
    expect(src).toMatch(/Skipping duplicate send/);
  });
});