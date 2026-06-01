import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = join(process.cwd(), 'supabase', 'functions');

function listFunctions(): string[] {
  return readdirSync(FUNCTIONS_DIR).filter((name) => {
    if (name.startsWith('_')) return false;
    const p = join(FUNCTIONS_DIR, name);
    try {
      return statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

function readIndex(fn: string): string | null {
  try {
    return readFileSync(join(FUNCTIONS_DIR, fn, 'index.ts'), 'utf8');
  } catch {
    return null;
  }
}

// Functions allowed to write notifications / emails (approved dispatchers).
const NOTIFICATION_DISPATCHERS = new Set([
  'check-overdue',
  'membership-lifecycle-dispatcher',
  'notify-amendment-event',
  'notify-client-invitation',
  'notify-contact-event',
  'notify-customer-lead-update',
  'notify-supplier-lead',
  'process-contact-notification-retries',
  'process-email-queue',
  'send-transactional-email',
  'submit-quote-request',
  'triage-contact-message',
  'weekly-sla-report',
  'auth-email-hook',
  'admin-preview-email',
  'admin-retry-dlq-email',
  'membership-payment-webhook',
  'membership-payment-confirm',
  'membership-payment-reconcile',
  'admin-reset-password',
  'temp-code-session',
  'admin-reveal-lead-contact',
  'match-quote-request',
  // Scheduled cron notifier — approved dispatcher for contract-expiry events
  // (parallel to `check-overdue`). Idempotency enforced via
  // contract_expiry_alerts_log UNIQUE(contract_id, days_before).
  'contracts-expiry-notifier',
]);

describe('HARDENING-1C: Edge function audit', () => {
  const functions = listFunctions();

  it('inventory remains stable and non-empty', () => {
    expect(functions.length).toBeGreaterThan(40);
    // sanity: a few known functions present
    expect(functions).toContain('manual-sla-real-run');
    expect(functions).toContain('send-transactional-email');
    expect(functions).toContain('handle-email-unsubscribe');
  });

  it('no edge function contains a JWT-like literal (eyJ...)', () => {
    const offenders: string[] = [];
    for (const fn of functions) {
      const src = readIndex(fn);
      if (!src) continue;
      if (/eyJ[A-Za-z0-9_-]{30,}\.eyJ/.test(src)) offenders.push(fn);
    }
    expect(offenders).toEqual([]);
  });

  it('no edge function echoes the Authorization header back to the response body', () => {
    const offenders: string[] = [];
    const pattern = /JSON\.stringify\([^)]*authHeader[^)]*\)/i;
    for (const fn of functions) {
      const src = readIndex(fn);
      if (!src) continue;
      if (pattern.test(src)) offenders.push(fn);
    }
    expect(offenders).toEqual([]);
  });

  it('no edge function logs raw OTP/password/secret values', () => {
    const offenders: { fn: string; line: string }[] = [];
    // matches: console.<x>(..., otp) / console.<x>("...otp:" , otpValue)
    const bad =
      /console\.(log|info|warn|error|debug)\s*\([^)]*\b(otpCode|otp_value|rawOtp|password|plaintext|service_role_key|serviceRoleKey)\b/;
    for (const fn of functions) {
      const src = readIndex(fn);
      if (!src) continue;
      src.split('\n').forEach((line, i) => {
        if (bad.test(line)) offenders.push({ fn, line: `${i + 1}: ${line.trim()}` });
      });
    }
    expect(offenders).toEqual([]);
  });

  it('handle-email-unsubscribe does not log raw unsubscribe token values', () => {
    const src = readIndex('handle-email-unsubscribe') ?? '';
    // Must not pass `token` as a value in a console.* call.
    const offendingLines = src
      .split('\n')
      .map((l, i) => ({ l, i: i + 1 }))
      .filter(({ l }) =>
        /console\.(log|info|warn|error|debug)\s*\([^)]*[,{]\s*token\b/.test(l),
      );
    expect(offendingLines).toEqual([]);
  });

  it('admin functions enforce an auth header check', () => {
    const adminFns = functions.filter((n) => n.startsWith('admin-'));
    expect(adminFns.length).toBeGreaterThan(0);
    for (const fn of adminFns) {
      const src = readIndex(fn) ?? '';
      expect(
        /req\.headers\.get\(\s*['"]Authorization['"]/i.test(src),
        `${fn} must read Authorization header`,
      ).toBe(true);
    }
  });

  it('manual-sla-real-run remains feature-flag gated and inert by default', () => {
    const src = readIndex('manual-sla-real-run') ?? '';
    expect(src).toMatch(/OPERATIONS_REAL_RUN_ENABLED/);
    expect(src).toMatch(/Authorization/);
    // Must not write notifications directly.
    expect(src).not.toMatch(/\.from\(['"]notifications['"]\)\s*\.insert/);
  });

  it('non-dispatcher edge functions do not directly insert notifications', () => {
    const offenders: string[] = [];
    for (const fn of functions) {
      if (NOTIFICATION_DISPATCHERS.has(fn)) continue;
      const src = readIndex(fn);
      if (!src) continue;
      if (/\.from\(\s*['"]notifications['"]\s*\)\s*\.insert/.test(src)) {
        offenders.push(fn);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no edge function returns a raw stack trace in the response body', () => {
    const offenders: string[] = [];
    for (const fn of functions) {
      const src = readIndex(fn);
      if (!src) continue;
      // Any response body that includes .stack property would be a leak.
      if (/JSON\.stringify\([^)]*\.stack\b/.test(src)) offenders.push(fn);
    }
    expect(offenders).toEqual([]);
  });

  it('webhook functions reference signature verification', () => {
    const src = readIndex('membership-payment-webhook') ?? '';
    expect(src.length).toBeGreaterThan(0);
    expect(/signature|hmac|verify/i.test(src)).toBe(true);
  });
});