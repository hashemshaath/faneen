/**
 * ORG-RBAC-STRUCTURE-9C — Source-level audit of the
 * `transfer_primary_manager` RPC migration.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function loadMigration(): string {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .reverse()
    .map((f) => ({ f, sql: readFileSync(join(MIGRATIONS_DIR, f), 'utf8') }))
    .find((m) => /CREATE OR REPLACE FUNCTION\s+public\.transfer_primary_manager/i.test(m.sql));
  if (!file) throw new Error('transfer_primary_manager migration not found');
  return file.sql;
}

const SQL = loadMigration();

describe('ORG-RBAC-STRUCTURE-9C — transfer_primary_manager migration', () => {
  it('defines the RPC with the documented signature', () => {
    expect(SQL).toMatch(
      /CREATE OR REPLACE FUNCTION\s+public\.transfer_primary_manager\s*\(\s*_business_id\s+uuid\s*,\s*_to_user_id\s+uuid\s*,\s*_reason\s+text\s+DEFAULT\s+NULL\s*\)\s*RETURNS\s+jsonb/i,
    );
  });

  it('is SECURITY DEFINER with search_path pinned to public', () => {
    expect(SQL).toMatch(/SECURITY\s+DEFINER/i);
    expect(SQL).toMatch(/SET\s+search_path\s*=\s*public/i);
  });

  it('revokes from PUBLIC and anon and grants only to authenticated', () => {
    expect(SQL).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.transfer_primary_manager[^;]+FROM\s+PUBLIC/i);
    expect(SQL).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.transfer_primary_manager[^;]+FROM\s+anon/i);
    expect(SQL).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.transfer_primary_manager[^;]+TO\s+authenticated/i);
    expect(SQL).not.toMatch(/GRANT\s+EXECUTE[^;]+TO\s+anon/i);
  });

  it('uses row locking for both business and staff rows', () => {
    const locks = SQL.match(/FOR\s+UPDATE/gi) ?? [];
    expect(locks.length).toBeGreaterThanOrEqual(2);
  });

  it('checks target role eligibility', () => {
    expect(SQL).toMatch(/'owner'/);
    expect(SQL).toMatch(/'entity_admin'/);
    expect(SQL).toMatch(/'business_manager'/);
    expect(SQL).toMatch(/'operations_manager'/);
    expect(SQL).toMatch(/target_role_not_eligible/);
  });

  it('validates target active membership', () => {
    expect(SQL).toMatch(/target_not_found/);
    expect(SQL).toMatch(/target_inactive/);
  });

  it('checks caller authorization', () => {
    expect(SQL).toMatch(/has_role\s*\(\s*v_caller\s*,\s*'admin'/);
    expect(SQL).toMatch(/has_role\s*\(\s*v_caller\s*,\s*'super_admin'/);
    expect(SQL).toMatch(/v_caller_is_owner/);
    expect(SQL).toMatch(/v_caller_is_current_pm/);
    expect(SQL).toMatch(/has_permission\s*\(\s*v_caller\s*,\s*_business_id\s*,\s*'staff\.manage'\s*\)/);
    expect(SQL).toMatch(/'forbidden'/);
  });

  it('clears the previous PM before setting the new one', () => {
    const clearIdx = SQL.search(/SET\s+is_primary_manager\s*=\s*false/i);
    const setIdx = SQL.search(/SET\s+is_primary_manager\s*=\s*true/i);
    expect(clearIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(-1);
    expect(clearIdx).toBeLessThan(setIdx);
  });

  it('handles unique_violation with safe code', () => {
    expect(SQL).toMatch(/unique_violation/i);
    expect(SQL).toMatch(/unique_constraint_conflict/);
  });

  it('writes a non-PII audit event', () => {
    expect(SQL).toMatch(/INSERT\s+INTO\s+public\.business_audit_log/i);
    expect(SQL).toMatch(/primary_manager\.transferred/);
    expect(SQL).toMatch(/'from_user_id'/);
    expect(SQL).toMatch(/'to_user_id'/);
    expect(SQL).not.toMatch(/\bemail\b/i);
    expect(SQL).not.toMatch(/\bphone\b/i);
    expect(SQL).not.toMatch(/full_name/i);
    expect(SQL).not.toMatch(/auth\.users/i);
  });

  it('returns documented JSON codes', () => {
    for (const code of [
      'business_not_found',
      'target_not_found',
      'target_inactive',
      'target_role_not_eligible',
      'forbidden',
      'already_primary_manager',
      'unique_constraint_conflict',
      'primary_manager_transferred',
    ]) {
      expect(SQL).toContain(code);
    }
    expect(SQL).toMatch(/jsonb_build_object/);
  });

  it('does not mutate auth.users, businesses.user_id, payments, or memberships', () => {
    expect(SQL).not.toMatch(/UPDATE\s+auth\.users/i);
    expect(SQL).not.toMatch(/UPDATE\s+public\.businesses[\s\S]{0,200}user_id\s*=/i);
    expect(SQL).not.toMatch(/UPDATE\s+public\.(payments|memberships|user_memberships)/i);
  });

  it('does not force owner to remain primary manager', () => {
    expect(SQL).not.toMatch(/owner_must_be_primary/i);
  });
});
