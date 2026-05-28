/**
 * ORG-RBAC-STRUCTURE-9B — owner staff-row invariant trigger.
 *
 * Source-level migration audit + governance helper coverage.
 * Live DB behavior is exercised by the migration's own pre-check at
 * apply time and by RLS-aware Supabase tests (out of scope here).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateBusinessInvariants,
  type OrgBusinessSnapshot,
} from '@/modules/workspace/governance/orgStructure';

const MIG_DIR = join(process.cwd(), 'supabase/migrations');

function findMigration(needle: string): { file: string; sql: string } | null {
  for (const f of readdirSync(MIG_DIR).filter((x) => x.endsWith('.sql'))) {
    const sql = readFileSync(join(MIG_DIR, f), 'utf8');
    if (sql.includes(needle)) return { file: f, sql };
  }
  return null;
}

const OWNER = 'u-owner';
const STAFF_A = 'u-staff-a';

function snap(overrides: Partial<OrgBusinessSnapshot> = {}): OrgBusinessSnapshot {
  return {
    business_id: 'b-1',
    owner_user_id: OWNER,
    staff: [
      { user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: true },
    ],
    ...overrides,
  };
}

describe('ORG-RBAC-STRUCTURE-9B — migration audit', () => {
  const hit = findMigration('enforce_business_owner_staff_invariant');

  it('migration exists', () => {
    expect(hit).toBeTruthy();
  });

  it('declares the trigger function with SECURITY DEFINER and pinned search_path', () => {
    expect(hit!.sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.enforce_business_owner_staff_invariant/i,
    );
    expect(hit!.sql).toMatch(/SECURITY\s+DEFINER/i);
    expect(hit!.sql).toMatch(/SET\s+search_path\s*=\s*public/i);
  });

  it('attaches a BEFORE UPDATE OR DELETE trigger on business_staff', () => {
    expect(hit!.sql).toMatch(
      /CREATE\s+TRIGGER\s+trg_enforce_business_owner_staff_invariant[\s\S]*BEFORE\s+UPDATE\s+OR\s+DELETE[\s\S]*ON\s+public\.business_staff/i,
    );
  });

  it('includes a runtime precheck that aborts on dirty data', () => {
    expect(hit!.sql).toMatch(/RAISE\s+EXCEPTION[\s\S]*missing\s+an\s+active\s+owner\s+staff\s+row/i);
  });

  it('revokes EXECUTE from public/anon/authenticated', () => {
    expect(hit!.sql).toMatch(/REVOKE[\s\S]*FROM\s+PUBLIC/i);
    expect(hit!.sql).toMatch(/REVOKE[\s\S]*FROM\s+anon,\s*authenticated/i);
  });

  it('blocks owner DELETE, deactivation, and role demotion (not primary-manager flag)', () => {
    const sql = hit!.sql;
    expect(sql).toMatch(/cannot\s+delete\s+the\s+owner\s+staff\s+row/i);
    expect(sql).toMatch(/cannot\s+deactivate\s+the\s+owner\s+staff\s+row/i);
    expect(sql).toMatch(/cannot\s+change\s+role\s+away\s+from\s+''owner''/i);
    // Explicitly DOES NOT mention enforcing is_primary_manager (Option C).
    expect(sql).not.toMatch(/cannot\s+change\s+is_primary_manager/i);
    expect(sql).not.toMatch(/owner\s+must\s+be\s+primary\s+manager/i);
  });

  it('does not touch auth, payment, or membership modules', () => {
    const sql = hit!.sql;
    expect(sql).not.toMatch(/auth\.users/i);
    expect(sql).not.toMatch(/membership/i);
    expect(sql).not.toMatch(/payment/i);
  });

  it('keeps the Phase-8 partial unique index intact (not dropped here)', () => {
    expect(hit!.sql).not.toMatch(/DROP\s+INDEX[\s\S]*ux_business_staff_one_active_primary_manager/i);
  });
});

describe('ORG-RBAC-STRUCTURE-9B — validateBusinessInvariants (Option C)', () => {
  it('owner row deactivated → owner_missing_active_staff_row + owner_staff_inactive', () => {
    const v = validateBusinessInvariants(snap({
      staff: [{ user_id: OWNER, role: 'owner', is_active: false, is_primary_manager: false }],
    }));
    const codes = v.map((x) => x.code);
    expect(codes).toContain('owner_missing_active_staff_row');
    expect(codes).toContain('owner_staff_inactive');
  });

  it('owner role demoted while active → owner_missing_active_staff_row + owner_staff_role_changed', () => {
    const v = validateBusinessInvariants(snap({
      staff: [{ user_id: OWNER, role: 'staff', is_active: true, is_primary_manager: false }],
    }));
    const codes = v.map((x) => x.code);
    expect(codes).toContain('owner_missing_active_staff_row');
    expect(codes).toContain('owner_staff_role_changed');
    expect(v.find((x) => x.code === 'owner_staff_role_changed')?.detail).toBe('staff');
  });

  it('owner active + delegated primary manager → no violations (Option C)', () => {
    const v = validateBusinessInvariants(snap({
      staff: [
        { user_id: OWNER, role: 'owner', is_active: true, is_primary_manager: false },
        { user_id: STAFF_A, role: 'business_manager', is_active: true, is_primary_manager: true },
      ],
    }));
    expect(v).toEqual([]);
  });

  it('does not emit owner_staff_inactive when owner is healthy', () => {
    expect(validateBusinessInvariants(snap()).map((x) => x.code))
      .not.toContain('owner_staff_inactive');
  });
});