/**
 * MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1 — regression contract
 *
 * Static guard: ensures the canonical migration still ships the
 * source-of-truth functions + trigger. If anyone drops the trigger or
 * renames the functions, these tests fail loudly so the UI mirror does
 * not silently drift again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function loadAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n');
}

describe('MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1 migration contract', () => {
  const sql = loadAllMigrations();

  it('declares the canonical effective-tier reader', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_effective_membership_tier\s*\(\s*p_business_id\s+uuid\s*\)/i,
    );
  });

  it('declares the owner-level effective-tier reader', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.get_effective_user_membership_tier\s*\(\s*p_user_id\s+uuid\s*\)/i,
    );
  });

  it('declares the idempotent business mirror sync function', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.sync_business_membership_tier\s*\(\s*p_business_id\s+uuid\s*\)/i,
    );
  });

  it('installs the lifecycle trigger on membership_subscriptions', () => {
    expect(sql).toMatch(
      /CREATE TRIGGER\s+trg_membership_subscriptions_sync_tier[\s\S]{0,400}membership_subscriptions/i,
    );
  });

  it('trigger fires on INSERT, DELETE and the relevant UPDATE columns', () => {
    const match = sql.match(
      /CREATE TRIGGER\s+trg_membership_subscriptions_sync_tier[\s\S]+?EXECUTE FUNCTION/i,
    );
    expect(match, 'trigger definition not found').toBeTruthy();
    const def = match![0];
    expect(def).toMatch(/INSERT/i);
    expect(def).toMatch(/DELETE/i);
    expect(def).toMatch(/UPDATE OF[\s\S]+status/i);
    expect(def).toMatch(/plan_id/i);
    expect(def).toMatch(/business_id/i);
    expect(def).toMatch(/cancelled_at/i);
    expect(def).toMatch(/expires_at/i);
  });

  it('sync function uses the membership_rpc GUC to satisfy the guard trigger', () => {
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.sync_business_membership_tier[\s\S]+?\$\$;/i,
    );
    expect(fn).toBeTruthy();
    expect(fn![0]).toMatch(/app\.membership_rpc/);
  });

  it('effective-tier reader filters by active, non-cancelled, non-expired subs', () => {
    const fn = sql.match(
      /CREATE OR REPLACE FUNCTION public\.get_effective_membership_tier[\s\S]+?\$\$;/i,
    );
    expect(fn).toBeTruthy();
    const body = fn![0];
    expect(body).toMatch(/status\s*=\s*'active'/);
    expect(body).toMatch(/cancelled_at\s+IS\s+NULL/i);
    expect(body).toMatch(/expires_at\s+IS\s+NULL\s+OR\s+ms\.expires_at\s*>\s*now\(\)/i);
  });

  it('reader and sync functions revoke PUBLIC and grant only to trusted roles', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_effective_membership_tier\(uuid\) FROM PUBLIC/i,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_effective_membership_tier\(uuid\) TO authenticated, service_role/i,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.sync_business_membership_tier\(uuid\) FROM PUBLIC/i,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.sync_business_membership_tier\(uuid\) TO service_role/i,
    );
  });
});