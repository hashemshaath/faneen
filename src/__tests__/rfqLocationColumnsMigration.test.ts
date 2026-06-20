import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RFQ LOCATION COLUMNS + MATCHING STORAGE
 * Verifies the migration adding region/site_id/project_id/no_location_selected/
 * location_precision columns to quote_requests is present and that edge fns
 * use the new columns rather than only metadata.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');
const allMigrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n');

const SUBMIT_FN = readFileSync(join(process.cwd(), 'supabase/functions/submit-quote-request/index.ts'), 'utf8');
const MATCH_FN = readFileSync(join(process.cwd(), 'supabase/functions/match-quote-request/index.ts'), 'utf8');

describe('RFQ location columns migration', () => {
  it('adds region column to quote_requests', () => {
    expect(allMigrations).toMatch(/ADD COLUMN IF NOT EXISTS region text/i);
  });
  it('adds site_id column to quote_requests', () => {
    expect(allMigrations).toMatch(/ADD COLUMN IF NOT EXISTS site_id uuid/i);
  });
  it('adds project_id column to quote_requests', () => {
    expect(allMigrations).toMatch(/ADD COLUMN IF NOT EXISTS project_id uuid/i);
  });
  it('adds no_location_selected default false', () => {
    expect(allMigrations).toMatch(/no_location_selected boolean NOT NULL DEFAULT false/i);
  });
  it('adds location_precision with CHECK constraint covering 4 values', () => {
    expect(allMigrations).toMatch(/location_precision text/i);
    expect(allMigrations).toMatch(/location_precision IN \('district','city','region','unspecified'\)/);
  });
  it('adds FKs to client_sites and projects with ON DELETE SET NULL', () => {
    expect(allMigrations).toMatch(/quote_requests_site_id_fkey[\s\S]*client_sites\(id\)[\s\S]*ON DELETE SET NULL/i);
    expect(allMigrations).toMatch(/quote_requests_project_id_fkey[\s\S]*projects\(id\)[\s\S]*ON DELETE SET NULL/i);
  });
  it('adds lightweight matching indexes', () => {
    expect(allMigrations).toMatch(/idx_quote_requests_city\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_district\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_region\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_city_district\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_site_id\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_project_id\b/);
    expect(allMigrations).toMatch(/idx_quote_requests_no_location_selected\b/);
  });
  it('does not touch RLS in the location columns migration', () => {
    // No CREATE POLICY / ALTER POLICY for quote_requests should appear alongside the location columns.
    const locationMigration = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
      .find((sql) => /ADD COLUMN IF NOT EXISTS no_location_selected/i.test(sql));
    expect(locationMigration).toBeDefined();
    expect(locationMigration!).not.toMatch(/CREATE POLICY/i);
    expect(locationMigration!).not.toMatch(/ALTER POLICY/i);
    expect(locationMigration!).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });
});

describe('RFQ submission persists location to real columns (not metadata only)', () => {
  it('submit-quote-request inserts region/site_id/project_id/no_location_selected/location_precision', () => {
    expect(SUBMIT_FN).toMatch(/region:\s*resolvedRegion/);
    expect(SUBMIT_FN).toMatch(/site_id:\s*resolvedSiteId/);
    expect(SUBMIT_FN).toMatch(/project_id:\s*projectId/);
    expect(SUBMIT_FN).toMatch(/no_location_selected:\s*noLocation/);
    expect(SUBMIT_FN).toMatch(/location_precision:\s*resolvedPrecision/);
  });
  it('submit-quote-request rejects empty location without explicit no_location_selected', () => {
    expect(SUBMIT_FN).toMatch(/يرجى تحديد موقع تنفيذ العمل|"بدون عنوان محدد"/);
  });
  it('submit-quote-request resolves location from saved site when site_id provided', () => {
    expect(SUBMIT_FN).toMatch(/from\('client_sites'\)[\s\S]*select\('id, region, city_id, district'\)/);
  });
  it('submit-quote-request resolves location via project.site_id when project_id provided', () => {
    expect(SUBMIT_FN).toMatch(/from\('projects'\)[\s\S]*select\('id, site_id'\)/);
  });
});

describe('RFQ matching uses location precision tiers', () => {
  it('match-quote-request falls back to region when no city match', () => {
    expect(MATCH_FN).toMatch(/quote\.region|quoteRegion/);
    expect(MATCH_FN).toMatch(/نفس المنطقة/);
  });
  it('match-quote-request suppresses provider notifications when location is unspecified', () => {
    expect(MATCH_FN).toMatch(/no_location_selected/);
    expect(MATCH_FN).toMatch(/suppressProviderNotif/);
  });
  it('match-quote-request still deduplicates leads via upsert with ignoreDuplicates', () => {
    expect(MATCH_FN).toMatch(/ignoreDuplicates:\s*true/);
  });
});