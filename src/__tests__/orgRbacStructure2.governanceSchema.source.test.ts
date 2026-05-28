import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = join(process.cwd(), 'supabase', 'migrations');

function loadGovernanceMigration(): string {
  const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql'));
  const matches = files
    .map((f) => ({ f, text: readFileSync(join(MIG_DIR, f), 'utf8') }))
    .filter(
      ({ text }) =>
        text.includes('CREATE TABLE public.business_teams') &&
        text.includes('CREATE TABLE public.delegated_workspace_access') &&
        text.includes('CREATE TABLE public.staff_activity_sessions'),
    );
  if (matches.length === 0) throw new Error('governance migration not found');
  return matches[matches.length - 1].text;
}

describe('ORG-RBAC-STRUCTURE-2 Step 4 — governance migration source', () => {
  let sql = '';
  beforeAll(() => {
    sql = loadGovernanceMigration();
  });

  it('creates all four governance tables', () => {
    expect(sql).toMatch(/CREATE TABLE public\.business_teams/);
    expect(sql).toMatch(/CREATE TABLE public\.business_team_members/);
    expect(sql).toMatch(/CREATE TABLE public\.delegated_workspace_access/);
    expect(sql).toMatch(/CREATE TABLE public\.staff_activity_sessions/);
  });

  it('enables RLS on every governance table', () => {
    for (const t of [
      'business_teams',
      'business_team_members',
      'delegated_workspace_access',
      'staff_activity_sessions',
    ]) {
      const re = new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toMatch(re);
    }
  });

  it('does NOT grant write privileges to anon', () => {
    // Allow no anon grants at all on the new tables
    for (const t of [
      'business_teams',
      'business_team_members',
      'delegated_workspace_access',
      'staff_activity_sessions',
    ]) {
      const re = new RegExp(`GRANT[^;]+ON public\\.${t}\\s+TO[^;]*anon`, 'i');
      expect(sql).not.toMatch(re);
    }
  });

  it('does NOT create DELETE policies on governance tables (soft-delete only)', () => {
    expect(sql).not.toMatch(/CREATE POLICY[^;]+FOR DELETE/i);
  });

  it('assigns TEAM- ref_id via generate_ref_id default', () => {
    expect(sql).toMatch(/generate_ref_id\('TEAM', 'seq_team'\)/);
    expect(sql).toMatch(/ref_id ~ '\^TEAM-\[0-9\]\{4,\}\$'/);
  });

  it('enforces delegated expiry constraints (>start and <=30 days)', () => {
    expect(sql).toMatch(/expires_at > starts_at/);
    expect(sql).toMatch(/expires_at <= starts_at \+ interval '30 days'/);
  });

  it('enforces metadata is a JSON object', () => {
    expect(sql).toMatch(/jsonb_typeof\(metadata\)\s*=\s*'object'/);
  });

  it('SECURITY DEFINER helpers set search_path = public', () => {
    const matches = sql.match(/SECURITY DEFINER[\s\S]*?\$\$/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const m of matches) {
      expect(m).toMatch(/SET search_path = public/);
    }
  });

  it('revokes PUBLIC execute on SECURITY DEFINER helpers', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.has_active_delegated_access/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_active_delegated_permissions/);
  });

  it('does NOT modify existing tables (business_staff, businesses, profiles)', () => {
    // Allow REFERENCES, but disallow ALTER on these.
    expect(sql).not.toMatch(/ALTER TABLE public\.business_staff\b/);
    expect(sql).not.toMatch(/ALTER TABLE public\.businesses\b/);
    expect(sql).not.toMatch(/ALTER TABLE public\.profiles\b/);
  });
});