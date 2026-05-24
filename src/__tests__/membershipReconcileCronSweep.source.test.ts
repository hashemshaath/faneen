import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * EDGE-CRON-RECONCILE-NOOP-1 source guard.
 *
 * Locks the cron-sweep contract in
 * `supabase/functions/membership-payment-reconcile/index.ts`:
 *  - cron branch exists (triggeredBy:'cron' or mode:'cron-sweep')
 *  - sweep selects only provider='moyasar' + status in created/requires_action
 *  - sweep requires provider_intent_id
 *  - sweep uses limit
 *  - sweep authorizes service-role or admin
 *  - per-intent try/catch isolates failures
 *  - returns the documented envelope
 *  - no raw provider payload echoed in errors (errors carry intent_id + code only)
 */

const SRC = readFileSync(
  resolve(__dirname, '../../supabase/functions/membership-payment-reconcile/index.ts'),
  'utf8',
);

describe('membership-payment-reconcile cron-sweep', () => {
  it('detects cron trigger', () => {
    expect(SRC).toMatch(/triggeredBy.*cron/);
    expect(SRC).toMatch(/mode.*cron-sweep/);
  });

  it('only selects Moyasar pending intents with a provider_intent_id', () => {
    expect(SRC).toMatch(/\.eq\(\s*['"]provider['"]\s*,\s*['"]moyasar['"]/);
    expect(SRC).toMatch(/\.in\(\s*['"]status['"]\s*,\s*\[['"]created['"]\s*,\s*['"]requires_action['"]\]/);
    expect(SRC).toMatch(/\.not\(\s*['"]provider_intent_id['"]/);
  });

  it('caps sweep with limit + grace window', () => {
    expect(SRC).toMatch(/SWEEP_LIMIT\s*=\s*\d+/);
    expect(SRC).toMatch(/\.limit\(SWEEP_LIMIT\)/);
    expect(SRC).toMatch(/GRACE_MINUTES/);
    expect(SRC).toMatch(/\.lt\(\s*['"]created_at['"]/);
  });

  it('authorizes sweep via service-role or admin only', () => {
    expect(SRC).toMatch(/isServiceRole/);
    expect(SRC).toMatch(/has_role[\s\S]{0,80}['"]admin['"]/);
    expect(SRC).toMatch(/code:\s*['"]unauthorized['"]/);
  });

  it('isolates per-intent failures', () => {
    expect(SRC).toMatch(/for\s*\(\s*const\s+intent\s+of/);
    expect(SRC).toMatch(/try\s*\{[\s\S]*?\}\s*catch/);
    expect(SRC).toMatch(/code:\s*['"]provider_error['"]/);
  });

  it('returns the documented sweep envelope', () => {
    for (const key of ['scanned', 'processed', 'succeeded', 'failed', 'cancelled', 'still_pending', 'errors']) {
      expect(SRC).toContain(key);
    }
    expect(SRC).toMatch(/mode:\s*['"]cron-sweep['"]/);
  });

  it('does not leak raw provider payload in errors array', () => {
    // errors entries are restricted to { intent_id, code }
    expect(SRC).toMatch(/errors\.push\(\s*\{\s*intent_id[^}]*code[^}]*\}\s*\)/);
    expect(SRC).not.toMatch(/errors\.push\([^)]*snapshot/);
    expect(SRC).not.toMatch(/errors\.push\([^)]*fetched\.snapshot/);
  });

  it('preserves single-intent path requiring callerId', () => {
    expect(SRC).toMatch(/Single-intent path requires an authenticated user/);
    expect(SRC).toMatch(/intentId.*body\?\.intentId/);
  });
});