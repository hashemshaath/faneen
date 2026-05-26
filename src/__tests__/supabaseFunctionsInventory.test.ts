import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * SUPABASE-FUNCTIONS-DEAD-CODE-1 inventory guard.
 *
 * Every directory under supabase/functions/ (except _shared) is classified
 * below. The test asserts:
 *  - all critical functions exist
 *  - every function directory has index.ts
 *  - every function directory present on disk is classified here
 *    (no unknown/unclassified functions)
 *
 * Classifications:
 *  - frontend   : invoked from src/ wrappers
 *  - webhook    : invoked by external providers (payment, email, contact)
 *  - cron       : invoked by pg_cron / scheduled jobs
 *  - admin      : admin-only manual/diagnostic endpoints
 *  - auth       : OTP / session / password / temp-code flows
 *  - public     : crawler-facing endpoints (sitemap, robots, og-image, badge)
 *  - notify     : notification dispatch utilities
 */

type Classification =
  | 'frontend'
  | 'webhook'
  | 'cron'
  | 'admin'
  | 'auth'
  | 'public'
  | 'notify';

const INVENTORY: Record<string, Classification> = {
  // --- auth / sessions ---
  'send-otp': 'auth',
  'verify-otp': 'auth',
  'send-login-otp': 'auth',
  'verify-login-otp': 'auth',
  'temp-code-session': 'auth',
  'auth-email-hook': 'auth',

  // --- membership payments (frontend + webhook + cron) ---
  'membership-payment-create-intent': 'frontend',
  'membership-payment-confirm': 'frontend',
  'membership-payment-webhook': 'webhook',
  'membership-payment-reconcile': 'cron',
  'membership-lifecycle-dispatcher': 'cron',
  'monthly-provider-credit-grant': 'cron',

  // --- email lifecycle ---
  'send-transactional-email': 'frontend',
  'preview-transactional-email': 'admin',
  'process-email-queue': 'cron',
  'handle-email-unsubscribe': 'webhook',
  'handle-email-suppression': 'webhook',
  'email-track-open': 'webhook',
  'email-track-click': 'webhook',
  'admin-retry-dlq-email': 'admin',
  'admin-preview-email': 'admin',

  // --- contact / leads / quotes ---
  'triage-contact-message': 'frontend',
  'notify-contact-event': 'notify',
  'process-contact-notification-retries': 'cron',
  'test-contact-webhook': 'admin',
  'submit-quote-request': 'frontend',
  'match-quote-request': 'frontend',
  'notify-supplier-lead': 'notify',
  'notify-customer-lead-update': 'notify',
  'get-revealed-contact': 'frontend',
  'admin-reveal-lead-contact': 'admin',

  // --- contracts / amendments / SLA ---
  'notify-amendment-event': 'notify',
  'notify-client-invitation': 'notify',
  'check-overdue': 'cron',
  'weekly-sla-report': 'cron',
  'verify-pdf-arabic': 'frontend',
  'analyze-contract-document': 'frontend',

  // --- admin / users ---
  'admin-delete-user': 'admin',
  'admin-reset-password': 'admin',
  'admin-create-user': 'admin',

  // --- AI / content tools ---
  'ai-center': 'frontend',
  'blog-ai-tools': 'frontend',
  'ab-evaluate': 'frontend',

  // --- SEO / crawler-facing ---
  'sitemap': 'public',
  'robots': 'public',
  'og-image': 'public',
  'badge-pixel': 'public',
  'check-badge-backlinks': 'cron',
  'ping-search-engines': 'admin',
  'audit-sitemap-status': 'admin',
  'run-site-audit': 'admin',

  // --- analytics ---
  'ingest-web-vitals': 'public',

  // --- locations / addresses ---
  'national-address-lookup': 'frontend',
};

const CRITICAL = [
  'membership-payment-create-intent',
  'membership-payment-webhook',
  'membership-payment-confirm',
  'membership-payment-reconcile',
  'temp-code-session',
  'handle-email-unsubscribe',
  'send-otp',
  'verify-otp',
  'auth-email-hook',
  'sitemap',
  'robots',
] as const;

const FUNCTIONS_DIR = resolve(__dirname, '../../supabase/functions');

function listFunctionDirs(): string[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((n) => n !== '_shared' && !n.startsWith('.'))
    .filter((n) => {
      try {
        return statSync(resolve(FUNCTIONS_DIR, n)).isDirectory();
      } catch {
        return false;
      }
    });
}

describe('SUPABASE-FUNCTIONS-DEAD-CODE-1: edge function inventory', () => {
  it.each(CRITICAL)('preserves critical function: %s', (name) => {
    expect(existsSync(resolve(FUNCTIONS_DIR, name, 'index.ts'))).toBe(true);
  });

  it('every function directory has an index.ts entrypoint', () => {
    const missing = listFunctionDirs().filter(
      (n) => !existsSync(resolve(FUNCTIONS_DIR, n, 'index.ts')),
    );
    expect(missing).toEqual([]);
  });

  it('every function on disk is classified in the inventory', () => {
    const onDisk = listFunctionDirs().sort();
    const unclassified = onDisk.filter((n) => !(n in INVENTORY));
    expect(unclassified).toEqual([]);
  });

  it('inventory does not reference functions that no longer exist on disk', () => {
    const onDisk = new Set(listFunctionDirs());
    const stale = Object.keys(INVENTORY).filter((n) => !onDisk.has(n));
    expect(stale).toEqual([]);
  });
});