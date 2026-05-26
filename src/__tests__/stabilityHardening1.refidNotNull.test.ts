import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * STABILITY-HARDENING-1 guard: verifies that the NOT NULL hardening migration
 * for businesses.ref_id / business_staff.ref_id / provider_subscriptions.ref_id
 * is present in the migration history. This prevents accidental rollback in a
 * future schema rewrite.
 */
describe('STABILITY-HARDENING-1: ref_id NOT NULL migration', () => {
  it('contains a migration that sets NOT NULL on the three ref_id columns', () => {
    const dir = join(process.cwd(), 'supabase', 'migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const hits = { businesses: false, staff: false, pvs: false };
    for (const f of files) {
      const sql = readFileSync(join(dir, f), 'utf8').toLowerCase();
      if (sql.includes('alter table public.businesses') && sql.includes('ref_id') && sql.includes('set not null')) {
        hits.businesses = true;
      }
      if (sql.includes('alter table public.business_staff') && sql.includes('ref_id') && sql.includes('set not null')) {
        hits.staff = true;
      }
      if (sql.includes('alter table public.provider_subscriptions') && sql.includes('ref_id') && sql.includes('set not null')) {
        hits.pvs = true;
      }
    }
    expect(hits.businesses, 'businesses.ref_id NOT NULL migration missing').toBe(true);
    expect(hits.staff, 'business_staff.ref_id NOT NULL migration missing').toBe(true);
    expect(hits.pvs, 'provider_subscriptions.ref_id NOT NULL migration missing').toBe(true);
  });
});