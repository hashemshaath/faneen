import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Phase 18i - guards for the final drop of legacy `category_id` bridge columns.
 *
 *  - `businesses.category_id` and `business_services.category_id` MUST be
 *    dropped in the migration window.
 *  - `category_public_counts` MUST be rebuilt off the taxonomy tables
 *    (`business_taxonomy_categories`, `business_service_taxonomy_categories`)
 *    and MUST NOT reference the dropped columns.
 *
 * Note: the legacy `tags` / `entity_tags` tables were dropped in Phase 19b
 * and `categories` in Phase 19c (see docs/legacy-taxonomy-final-closeout.md).
 * The earlier "does NOT drop" guards have been retired now that those
 * decisions have shipped.
 */
describe('Phase 18i: legacy category_id columns dropped + views rebuilt on taxonomy', () => {
  const dir = 'supabase/migrations';
  const files = readdirSync(dir).sort();
  // Phase 18i shipped long ago and is no longer in the trailing migrations
  // window — scan the full migration history so the guard remains valid as
  // newer migrations land. For view-shape assertions we re-derive the LATEST
  // CREATE/REPLACE definition below so later rebuilds (not earlier drafts)
  // are what gets validated.
  const all = files
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n\n');

  const lastViewDefinition = (viewName: string): string | null => {
    const re = new RegExp(
      String.raw`CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.${viewName}[\s\S]*?;`,
      'gi',
    );
    const matches = all.match(re);
    return matches && matches.length > 0 ? matches[matches.length - 1] : null;
  };

  it('drops businesses.category_id', () => {
    expect(all).toMatch(
      /ALTER TABLE\s+(?:public\.)?businesses\s+DROP COLUMN(?:\s+IF EXISTS)?\s+category_id/i,
    );
  });

  it('drops business_services.category_id', () => {
    expect(all).toMatch(
      /ALTER TABLE\s+(?:public\.)?business_services\s+DROP COLUMN(?:\s+IF EXISTS)?\s+category_id/i,
    );
  });

  it('rebuilds category_public_counts on taxonomy tables', () => {
    const body = lastViewDefinition('category_public_counts');
    expect(body, 'latest category_public_counts view definition not found').toBeTruthy();
    expect(body!).toMatch(/business_taxonomy_categories/);
    expect(body!).toMatch(/business_service_taxonomy_categories/);
  });

  it('category_public_counts no longer references businesses.category_id or business_services.category_id', () => {
    const body = lastViewDefinition('category_public_counts');
    expect(body, 'latest category_public_counts view definition not found').toBeTruthy();
    // The rebuilt view must not read from the legacy `categories` rollup or
    // the dropped `bs.category_id` / `b.category_id` predicates.
    expect(body!).not.toMatch(/\bbs\.category_id\b/);
    expect(body!).not.toMatch(/\bb\.category_id\b/);
    expect(body!).not.toMatch(/\bbp\.category_id\b/);
    expect(body!).not.toMatch(/FROM\s+(?:public\.)?categories\b/i);
  });

  it('businesses_public view no longer exposes category_id', () => {
    const body = lastViewDefinition('businesses_public');
    expect(body, 'latest businesses_public view definition not found').toBeTruthy();
    expect(body!).not.toMatch(/\bcategory_id\b/);
  });
});