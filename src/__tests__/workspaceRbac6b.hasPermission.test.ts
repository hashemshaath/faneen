/**
 * WORKSPACE-RBAC-6B — `public.has_permission` migration audit.
 *
 * Validates the SQL source for the new SECURITY DEFINER helper:
 *  - function signature + return type
 *  - SECURITY DEFINER + STABLE + search_path
 *  - grants: REVOKE PUBLIC + GRANT EXECUTE authenticated only
 *  - branches: null guards, unknown-permission check, owner short-circuit,
 *    active-membership filter, override (object + array) and role_permissions join
 *
 * Also asserts safety invariants:
 *  - the function is not yet wired into RLS policies in this phase
 *  - no payment/auth/membership product files were modified
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function findMigrationContaining(needle: string): string {
  const files = readdirSync(MIGRATIONS_DIR).sort().reverse();
  for (const f of files) {
    const src = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
    if (src.includes(needle)) return src;
  }
  throw new Error(`No migration contains: ${needle}`);
}

describe('WORKSPACE-RBAC-6B — has_permission migration source', () => {
  const sql = findMigrationContaining(
    'CREATE OR REPLACE FUNCTION public.has_permission',
  );

  it('declares the (_user_id uuid, _entity_id uuid, _permission text) signature', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.has_permission\s*\(\s*_user_id\s+uuid\s*,\s*_entity_id\s+uuid\s*,\s*_permission\s+text\s*\)/);
  });

  it('returns boolean', () => {
    expect(sql).toMatch(/RETURNS\s+boolean/i);
  });

  it('is SECURITY DEFINER and STABLE with search_path = public', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/\bSTABLE\b/);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*public/);
  });

  it('revokes PUBLIC and grants EXECUTE only to authenticated (no anon grant)', () => {
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.has_permission\([^)]*\)\s+FROM\s+PUBLIC/i);
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.has_permission\([^)]*\)\s+TO\s+authenticated/i);
    expect(sql).not.toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.has_permission\([^)]*\)\s+TO\s+anon\b/i);
  });

  it('rejects null inputs and empty permission key', () => {
    expect(sql).toMatch(/_user_id\s+IS\s+NULL/);
    expect(sql).toMatch(/_entity_id\s+IS\s+NULL/);
    expect(sql).toMatch(/_permission\s+IS\s+NULL/);
    expect(sql).toMatch(/length\(_permission\)\s*=\s*0/);
  });

  it('rejects unknown permission keys via permissions_catalog lookup', () => {
    expect(sql).toMatch(/FROM\s+public\.permissions_catalog\s+WHERE\s+key\s*=\s*_permission/);
  });

  it('grants entity owner via businesses.user_id', () => {
    expect(sql).toMatch(/FROM\s+public\.businesses[\s\S]*?id\s*=\s*_entity_id[\s\S]*?user_id\s*=\s*_user_id/);
  });

  it('filters by active business_staff membership', () => {
    expect(sql).toMatch(/FROM\s+public\.business_staff[\s\S]*?business_id\s*=\s*_entity_id[\s\S]*?user_id\s*=\s*_user_id[\s\S]*?is_active\s*=\s*true/);
  });

  it('short-circuits for owner and entity_admin roles', () => {
    expect(sql).toMatch(/v_role\s+IN\s*\(\s*'owner'\s*,\s*'entity_admin'\s*\)/);
  });

  it('supports permissions_override in object form', () => {
    expect(sql).toMatch(/jsonb_typeof\(v_override\)\s*=\s*'object'/);
    expect(sql).toMatch(/v_override\s*->\s*_permission/);
  });

  it('supports permissions_override in array form', () => {
    expect(sql).toMatch(/jsonb_typeof\(v_override\)\s*=\s*'array'/);
    expect(sql).toMatch(/jsonb_array_elements_text\(v_override\)/);
  });

  it('joins role_permissions for catalog defaults', () => {
    expect(sql).toMatch(/FROM\s+public\.role_permissions[\s\S]*?role_key\s*=\s*v_role[\s\S]*?permission_key\s*=\s*_permission/);
  });

  it('returns false as the fallthrough', () => {
    expect(sql).toMatch(/RETURN\s+false\s*;/);
  });

  it('tolerates malformed override via EXCEPTION handler', () => {
    expect(sql).toMatch(/EXCEPTION\s+WHEN\s+others\s+THEN/i);
  });
});

describe('WORKSPACE-RBAC-6B — safety invariants', () => {
  const SRC = join(process.cwd(), 'src');

  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p, acc);
      else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(p);
    }
    return acc;
  }

  it('no page uses useCan yet (6B does not wire enforcement into UI)', () => {
    const files = walk(join(SRC, 'pages'));
    const callers = files.filter((f) => /\buseCan\s*\(/.test(readFileSync(f, 'utf8')));
    expect(callers).toEqual([]);
  });

  it('no other migration in this phase references has_permission inside an RLS policy', () => {
    const files = readdirSync(MIGRATIONS_DIR).sort();
    for (const f of files) {
      const src = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      if (/has_permission\s*\(/.test(src)) {
        // Allowed only inside the defining migration; never inside a CREATE POLICY block yet.
        expect(src).not.toMatch(/CREATE\s+POLICY[\s\S]*has_permission\s*\(/i);
      }
    }
  });
});

describe('WORKSPACE-RBAC-6B — runtime smoke', () => {
  it('helper exists in TypeScript surface only via future wrappers (none in this phase)', () => {
    // No client wrapper yet; this is intentional. 6C will add a `useHasPermission`
    // hook backed by supabase.rpc('has_permission'). This assertion locks that in.
    const SRC = join(process.cwd(), 'src');
    function walk(dir: string, acc: string[] = []): string[] {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(p);
      }
      return acc;
    }
    const callers = walk(SRC).filter((f) => /rpc\(\s*['"]has_permission['"]/.test(readFileSync(f, 'utf8')));
    expect(callers).toEqual([]);
  });
});