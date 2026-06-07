import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Phase 18i — guards for the final drop of legacy `category_id` bridge columns.
 *
 *  - `businesses.category_id` and `business_services.category_id` MUST be
 *    dropped in the latest migration window.
 *  - `category_public_counts` MUST be rebuilt off the taxonomy tables
 *    (`business_taxonomy_categories`, `business_service_taxonomy_categories`)
 *    and MUST NOT reference the dropped columns.
 *  - The legacy `categories` and `tags` tables MUST NOT be dropped by this
 *    phase (separate decision, see closeout doc).
 */
describe('Phase 18i: legacy category_id columns dropped + views rebuilt on taxonomy', () => {
  const dir = 'supabase/migrations';
  const files = readdirSync(dir).sort();
  const recent = files
    .slice(-6)
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n\n');

  it('drops businesses.category_id', () => {
    expect(recent).toMatch(
      /ALTER TABLE\s+(?:public\.)?businesses\s+DROP COLUMN(?:\s+IF EXISTS)?\s+category_id/i,
    );
  });

  it('drops business_services.category_id', () => {
    expect(recent).toMatch(
      /ALTER TABLE\s+(?:public\.)?business_services\s+DROP COLUMN(?:\s+IF EXISTS)?\s+category_id/i,
    );
  });

  it('rebuilds category_public_counts on taxonomy tables', () => {
    expect(recent).toMatch(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.category_public_counts/i);
    expect(recent).toMatch(/business_taxonomy_categories/);
    expect(recent).toMatch(/business_service_taxonomy_categories/);
  });

  it('category_public_counts no longer references businesses.category_id or business_services.category_id', () => {
    const viewMatch = recent.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.category_public_counts[\s\S]*?;/i,
    );
    expect(viewMatch, 'view definition not found in recent migrations').toBeTruthy();
    const body = viewMatch![0];
    // The rebuilt view must not read from the legacy `categories` rollup or
    // the dropped `bs.category_id` / `b.category_id` predicates.
    expect(body).not.toMatch(/\bbs\.category_id\b/);
    expect(body).not.toMatch(/\bb\.category_id\b/);
    expect(body).not.toMatch(/\bbp\.category_id\b/);
    expect(body).not.toMatch(/FROM\s+(?:public\.)?categories\b/i);
  });

  it('businesses_public view no longer exposes category_id', () => {
    const viewMatch = recent.match(
      /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.businesses_public[\s\S]*?;/i,
    );
    expect(viewMatch, 'view definition not found in recent migrations').toBeTruthy();
    expect(viewMatch![0]).not.toMatch(/\bcategory_id\b/);
  });

  it('does NOT drop the legacy `categories` table in this phase', () => {
    expect(recent).not.toMatch(/DROP\s+TABLE[^;]*\bpublic\.categories\b/i);
  });

  it('does NOT drop the legacy `tags` table in this phase', () => {
    expect(recent).not.toMatch(/DROP\s+TABLE[^;]*\bpublic\.tags\b/i);
  });
});