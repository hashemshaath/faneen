/**
 * Phase 18h regression lock.
 *
 * Asserts that the migration which:
 *   - rewrote `add_business_sub_service` / `remove_business_sub_service` /
 *     `approve_service_addition_request` so they no longer touch the
 *     legacy `businesses.sub_services` / `businesses.sectors` columns, and
 *   - dropped `businesses.sectors`, `businesses.sub_services`,
 *     `projects.category_id`
 * is present and intact. If a later migration re-introduces those writes
 * or those columns, this test fails loudly before runtime regressions
 * reach production.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const MIGRATIONS = resolve(process.cwd(), 'supabase/migrations');

function findMigration(needle: string): string {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
  for (const f of files) {
    const body = readFileSync(join(MIGRATIONS, f), 'utf8');
    if (body.includes(needle)) return body;
  }
  throw new Error(`No migration contains: ${needle}`);
}

describe('Phase 18h — legacy sectors/sub_services writes removed', () => {
  const sql = findMigration('Phase 18h');

  it('add_business_sub_service body no longer touches businesses.sub_services', () => {
    const fn = sql.split('CREATE OR REPLACE FUNCTION public.add_business_sub_service')[1];
    expect(fn, 'add_business_sub_service must be present').toBeTruthy();
    const body = fn.split('$$;')[0];
    expect(body).not.toMatch(/UPDATE\s+public\.businesses[\s\S]*sub_services/i);
    expect(body).not.toMatch(/\bsub_services\s*=/i);
  });

  it('remove_business_sub_service body no longer touches businesses.sub_services', () => {
    const fn = sql.split('CREATE OR REPLACE FUNCTION public.remove_business_sub_service')[1];
    expect(fn, 'remove_business_sub_service must be present').toBeTruthy();
    const body = fn.split('$$;')[0];
    expect(body).not.toMatch(/UPDATE\s+public\.businesses[\s\S]*sub_services/i);
    expect(body).not.toMatch(/\bsub_services\s*=/i);
  });

  it('approve_service_addition_request body no longer touches businesses.sub_services / sectors', () => {
    const fn = sql.split('CREATE OR REPLACE FUNCTION public.approve_service_addition_request')[1];
    expect(fn, 'approve_service_addition_request must be present').toBeTruthy();
    const body = fn.split('$$;')[0];
    expect(body).not.toMatch(/UPDATE\s+public\.businesses[\s\S]*sub_services/i);
    expect(body).not.toMatch(/\bsub_services\s*=/i);
    expect(body).not.toMatch(/\bsectors\s*=/i);
  });

  it('drops the safe legacy columns', () => {
    expect(sql).toMatch(/ALTER TABLE\s+public\.businesses\s+DROP COLUMN\s+IF EXISTS\s+sectors/i);
    expect(sql).toMatch(/ALTER TABLE\s+public\.businesses\s+DROP COLUMN\s+IF EXISTS\s+sub_services/i);
    expect(sql).toMatch(/ALTER TABLE\s+public\.projects\s+DROP COLUMN\s+IF EXISTS\s+category_id/i);
  });

  it('does NOT drop blocker columns kept for views/runtime', () => {
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.businesses\s+DROP COLUMN[^;]*\bcategory_id/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+public\.business_services\s+DROP COLUMN[^;]*\bcategory_id/i);
    expect(sql).not.toMatch(/DROP TABLE[^;]*\b(categories|tags|entity_tags)\b/i);
  });
});