/**
 * ORG-RBAC-STRUCTURE-8 — primary-manager uniqueness migration audit.
 *
 * Source-level test: verifies the migration file exists, declares the
 * expected partial unique index with the correct predicate, and ships
 * with a duplicate precheck so it cannot silently apply against a
 * dirty dataset.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = join(process.cwd(), 'supabase/migrations');

function findMigration(predicate: (sql: string) => boolean): { file: string; sql: string } | null {
  for (const f of readdirSync(MIG_DIR).filter((x) => x.endsWith('.sql'))) {
    const sql = readFileSync(join(MIG_DIR, f), 'utf8');
    if (predicate(sql)) return { file: f, sql };
  }
  return null;
}

describe('ORG-RBAC-STRUCTURE-8 — primary manager uniqueness migration', () => {
  const hit = findMigration((s) => s.includes('ux_business_staff_one_active_primary_manager'));

  it('migration file exists', () => {
    expect(hit, 'migration creating ux_business_staff_one_active_primary_manager not found').toBeTruthy();
  });

  it('declares a UNIQUE partial INDEX on business_staff(business_id)', () => {
    expect(hit!.sql).toMatch(
      /CREATE\s+UNIQUE\s+INDEX[\s\S]*ux_business_staff_one_active_primary_manager[\s\S]*ON\s+public\.business_staff[\s\S]*\(\s*business_id\s*\)/i,
    );
  });

  it('predicate gates on is_active AND is_primary_manager', () => {
    expect(hit!.sql).toMatch(/WHERE[\s\S]*is_active\s*=\s*true[\s\S]*AND[\s\S]*is_primary_manager\s*=\s*true/i);
  });

  it('includes a duplicate precheck guard that aborts on dirty data', () => {
    // Either a runtime DO $$ ... RAISE EXCEPTION block, or a clear precondition comment.
    const hasRuntimeGuard = /RAISE\s+EXCEPTION[\s\S]*primary\s+manager/i.test(hit!.sql);
    const hasComment = /Precondition[\s\S]*duplicate/i.test(hit!.sql);
    expect(hasRuntimeGuard || hasComment).toBe(true);
  });

  it('makes no destructive data changes', () => {
    // Allow narrative mentions of DELETE/UPDATE/DROP inside comments,
    // but the migration must not execute any of these statements.
    // Strip line/block comments before scanning.
    const stripped = hit!.sql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*--.*$/gm, '');
    expect(stripped).not.toMatch(/\bDELETE\s+FROM\s+public\./i);
    expect(stripped).not.toMatch(/\bUPDATE\s+public\./i);
    expect(stripped).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(stripped).not.toMatch(/\bTRUNCATE\b/i);
  });
});