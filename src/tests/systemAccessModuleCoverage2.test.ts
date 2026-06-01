/**
 * SYSTEM-ACCESS-MODULE-COVERAGE-2 — source-level coverage tests.
 *
 * Verifies the 5 canonical module keys
 * (analytics, operations_log, private_sectors, installments, staff_management)
 * are wired through the route-alias map, invalidation hook, admin write
 * wrapper (with bilingual membership-block messaging), and access
 * resolution module — and that no RLS / service-role / scope-creep
 * regressions were introduced.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

const CANONICAL_KEYS = [
  'analytics',
  'operations_log',
  'private_sectors',
  'installments',
  'staff_management',
] as const;

describe('SYSTEM-ACCESS-MODULE-COVERAGE-2', () => {
  it('useVisibleModules registers route aliases for every canonical key', () => {
    const src = read('src/hooks/useVisibleModules.ts');
    for (const key of CANONICAL_KEYS) {
      expect(src, `missing alias for ${key}`).toMatch(new RegExp(`${key}\\s*:\\s*\\[`));
    }
    // Ensure expected route surfaces are covered.
    expect(src).toContain('/dashboard/analytics');
    expect(src).toContain('/dashboard/operations/feed');
    expect(src).toContain('/dashboard/private-sectors');
    expect(src).toContain('/dashboard/installments');
    expect(src).toContain('/dashboard/team');
    expect(src).toContain('/dashboard/invitations');
  });

  it('migration registers operations_log and staff_management in system_modules', () => {
    const path = 'supabase/migrations/20260601182500_system_access_module_coverage_2.sql';
    expect(existsSync(path), 'migration file present').toBe(true);
    const sql = read(path);
    expect(sql).toMatch(/'operations_log'/);
    expect(sql).toMatch(/'staff_management'/);
    expect(sql).toMatch(/ON CONFLICT \(key\) DO UPDATE/);
    // Must not weaken RLS.
    expect(sql).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(sql).not.toMatch(/DROP POLICY/i);
  });

  it('invalidation hook covers the system-access + feature-gate cache keys', () => {
    const src = read('src/hooks/useBusinessAccessInvalidation.ts');
    expect(src).toContain("['system-access', 'visible-modules']");
    expect(src).toContain("['system-access', 'catalog']");
    expect(src).toContain("['feature-gate']");
    expect(src).toContain("['membership-subscription']");
    expect(src).toContain("['command-palette']");
    expect(src).toContain("['dashboard-modules']");
  });

  it('admin write wrapper enforces bilingual membership block', () => {
    const src = read('src/modules/systemAccess/services/updateBusinessSystemAccess.ts');
    expect(src).toContain('لا يمكن تفعيل هذا النظام لأن الباقة الحالية لا تدعمه.');
    expect(src).toContain('This system cannot be enabled because the current plan does not include it.');
    expect(src).toContain('blocked_by_membership');
    expect(src).toContain('[observability] system_access.updated');
  });

  it('access resolution module exists and exposes effective entries', () => {
    const src = read('src/modules/systemAccess/accessResolution.ts');
    expect(src).toMatch(/resolveEffectiveBusinessAccess/);
    expect(src).toMatch(/entries/);
  });

  it('admin system access page is data-driven over the module catalog', () => {
    const src = read('src/pages/admin/AdminSystemAccess.tsx');
    // Dynamic grouping over system_modules → new rows surface automatically.
    expect(src).toMatch(/listSystemModules|system-modules/);
    expect(src).toMatch(/grouped/);
  });

  it('no RLS weakening or service-role usage introduced in client code', () => {
    const src = read('src/modules/systemAccess/services/updateBusinessSystemAccess.ts');
    expect(src).not.toMatch(/service_role/i);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/i);
  });

  it('no scope creep into inventory/accounting/supplier-payments', () => {
    const sql = read('supabase/migrations/20260601182500_system_access_module_coverage_2.sql');
    expect(sql).not.toMatch(/inventory/i);
    expect(sql).not.toMatch(/accounting/i);
    expect(sql).not.toMatch(/supplier_payments/i);
  });
});