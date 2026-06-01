/**
 * MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-1
 *
 * Static guards for the super-admin override + plan/module matrix layer.
 * Wider integration tests run via the RLS/migration suite — these tests
 * lock in the contracts the rest of the app depends on.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = join(process.cwd(), 'supabase', 'migrations');
const migrationSql = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(MIG_DIR, f), 'utf8'))
  .join('\n');

const serviceSrc = readFileSync(
  join(process.cwd(), 'src/modules/systemAccess/index.ts'),
  'utf8',
);

describe('MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-1', () => {
  it('creates the membership_plan_modules matrix table', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.membership_plan_modules/);
    expect(migrationSql).toMatch(/UNIQUE \(plan_id, module_key\)/);
    expect(migrationSql).toMatch(/GRANT SELECT ON public\.membership_plan_modules TO authenticated/);
    expect(migrationSql).toMatch(/ALTER TABLE public\.membership_plan_modules ENABLE ROW LEVEL SECURITY/);
  });

  it('exposes a super-admin-only per-business override RPC that requires a reason', () => {
    expect(migrationSql).toMatch(/super_admin_set_business_module_override/);
    expect(migrationSql).toMatch(/is_super_admin\(auth\.uid\(\)\)/);
    expect(migrationSql).toMatch(/reason required for super-admin override/);
  });

  it('exposes a super-admin-only plan/module toggle RPC that writes audit', () => {
    expect(migrationSql).toMatch(/super_admin_set_membership_plan_module/);
    expect(migrationSql).toMatch(/INSERT INTO public\.system_module_audit_log/);
  });

  it('blocks disabling core modules via the super-admin override', () => {
    expect(migrationSql).toMatch(/core module cannot be disabled/);
  });

  it('exposes a read helper that joins every module with the plan flag', () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.list_membership_plan_modules/);
    expect(migrationSql).toMatch(/LEFT JOIN public\.membership_plan_modules/);
  });

  it('client service layer requires non-empty reason before calling the RPC', () => {
    expect(serviceSrc).toContain('superAdminSetBusinessModuleOverride');
    expect(serviceSrc).toMatch(/reason required for super-admin override/);
  });

  it('client service layer exposes plan-matrix helpers', () => {
    expect(serviceSrc).toContain('superAdminSetMembershipPlanModule');
    expect(serviceSrc).toContain('listMembershipPlanModules');
  });

  it('does NOT widen module writes — no policy allows direct INSERT/UPDATE/DELETE on plan modules', () => {
    // All writes must go through the super-admin RPC.
    const block = migrationSql.match(
      /CREATE TABLE IF NOT EXISTS public\.membership_plan_modules[\s\S]*?(?=\n-- 2\.)/,
    )?.[0] ?? '';
    expect(block).not.toMatch(/FOR INSERT/i);
    expect(block).not.toMatch(/FOR UPDATE/i);
    expect(block).not.toMatch(/FOR DELETE/i);
  });
});