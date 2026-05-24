import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const FN = resolve(
  ROOT,
  'supabase/functions/membership-payment-webhook/index.ts',
);

function read(): string {
  return readFileSync(FN, 'utf8');
}

describe('R4F-9D membership-payment-webhook edge source contract', () => {
  it('edge function file exists', () => {
    expect(existsSync(FN)).toBe(true);
  });

  it('preserves raw body via req.text() before any parsing', () => {
    const src = read();
    const rawIdx = src.indexOf('await req.text()');
    const parseIdx = src.indexOf('JSON.parse(rawBody)');
    expect(rawIdx).toBeGreaterThan(-1);
    expect(parseIdx).toBeGreaterThan(rawIdx);
    expect(src).not.toMatch(/await\s+req\.json\s*\(/);
  });

  it('verifies HMAC-SHA256 with constant-time compare and rejects with invalid_signature', () => {
    const src = read();
    expect(src).toContain("'HMAC'");
    expect(src).toContain("'SHA-256'");
    expect(src).toContain('timingSafeEqual');
    expect(src).toContain("code: 'invalid_signature'");
    expect(src).toContain('MOYASAR_WEBHOOK_SECRET');
  });

  it('returns missing_webhook_config when secret/env not set', () => {
    expect(read()).toContain("code: 'missing_webhook_config'");
  });

  it('returns invalid_payload only after signature verification passes', () => {
    const src = read();
    const sigIdx = src.indexOf("'invalid_signature'");
    const payloadIdx = src.indexOf("'invalid_payload'");
    expect(sigIdx).toBeGreaterThan(-1);
    expect(payloadIdx).toBeGreaterThan(sigIdx);
  });

  it('writes only to membership_payment_webhook_events table', () => {
    const src = read();
    const fromMatches = [...src.matchAll(/\.from\(['"]([^'"]+)['"]\)/g)].map(
      (m) => m[1],
    );
    const allowed = new Set([
      'membership_payment_webhook_events',
      'membership_payment_intents', // read-only lookup
    ]);
    for (const t of fromMatches) expect(allowed.has(t)).toBe(true);
    // Insert only into the events table.
    expect(src).toMatch(/\.from\('membership_payment_webhook_events'\)\s*\.insert/);
    expect(src).not.toMatch(/\.from\('membership_payment_intents'\)\s*\.insert/);
    expect(src).not.toMatch(/\.from\('membership_payment_intents'\)\s*\.update/);
  });

  it('does NOT update membership_subscriptions', () => {
    const src = read();
    expect(src).not.toContain('membership_subscriptions');
  });

  it('does NOT send emails or create notifications', () => {
    const src = read();
    expect(src).not.toContain('send-transactional-email');
    expect(src).not.toContain('sendTransactionalEmail');
    expect(src).not.toContain('createNotification');
    expect(src).not.toContain('notifications');
  });

  it('does NOT call admin manual mark-paid/refunded RPCs', () => {
    const src = read();
    expect(src).not.toContain('admin_mark_membership_paid_manually');
    expect(src).not.toContain('admin_mark_membership_payment_refunded_manually');
  });

  it('idempotently dedupes by (provider, event_id) and handles 23505 race', () => {
    const src = read();
    expect(src).toContain("duplicate: true");
    expect(src).toContain("'23505'");
    expect(src).toMatch(/uq_mpwe_provider_event|provider.*event_id|event_id.*provider/);
  });

  it('never logs secret or raw signature values', () => {
    const src = read();
    expect(src).not.toMatch(/console\.log\([^)]*MOYASAR_WEBHOOK_SECRET/);
    expect(src).not.toMatch(/console\.log\([^)]*sigHeader/);
    expect(src).not.toMatch(/safeLog\([^)]*MOYASAR_WEBHOOK_SECRET/);
    expect(src).not.toMatch(/safeLog\([^)]*sigHeader/);
  });

  it('uses service-role client (no user JWT required for provider call)', () => {
    const src = read();
    expect(src).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(src).not.toContain('getClaims');
  });
});