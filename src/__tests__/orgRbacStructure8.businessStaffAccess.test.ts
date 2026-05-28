/**
 * ORG-RBAC-STRUCTURE-8 — business_staff access isolation.
 *
 * Hardens the Phase-7 budget test: NO direct
 * `supabase.from('business_staff')` access in pages / components / hooks.
 * All access must go through the canonical wrappers under
 * `@/modules/businesses/services/*` (e.g. listBusinessStaffByBusiness,
 * listManagedStaffMembershipForUser, getActiveBusinessStaffMembership,
 * insertBusinessStaff, updateBusinessStaffById, deleteBusinessStaffById,
 * listAllBusinessStaffForAdmin, guardedStaffMutations).
 *
 * Related tables (business_staff_invitations, business_staff_permissions)
 * are out of scope for this guard — they have their own dedicated
 * panels and are not the subject of this phase.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

// Matches `.from('business_staff')` but NOT `business_staff_invitations`
// or `business_staff_permissions`.
const DIRECT_RE = /\.\s*from\s*\(\s*['"`]business_staff['"`]\s*\)/;

describe('ORG-RBAC-STRUCTURE-8 — business_staff access isolation', () => {
  it('no direct supabase.from(business_staff) in pages/components/hooks', () => {
    const dirs = ['pages', 'components', 'hooks'].map((d) => join(SRC, d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const f of walk(dir)) {
        const c = readFileSync(f, 'utf8');
        if (DIRECT_RE.test(c)) offenders.push(f.replace(ROOT + '/', ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('canonical staff wrappers are present under @/modules/businesses/services', () => {
    const expected = [
      'getActiveBusinessStaffMembership.ts',
      'insertBusinessStaff.ts',
      'updateBusinessStaffById.ts',
      'deleteBusinessStaffById.ts',
      'listBusinessStaffByBusiness.ts',
      'listAllBusinessStaffForAdmin.ts',
      'listManagedStaffMembershipForUser.ts',
      'listActiveStaffBusinessesForUser.ts',
      'guardedStaffMutations.ts',
    ];
    const dir = join(SRC, 'modules/businesses/services');
    const present = new Set(readdirSync(dir));
    for (const f of expected) expect(present.has(f), `${f} missing`).toBe(true);
  });

  it('only the businesses/services layer accesses business_staff directly', () => {
    // Canonical service layers permitted to touch business_staff directly:
    //  1. modules/businesses/services/** — primary CRUD wrappers.
    //  2. modules/identity/services/diagnostics/** — admin-only read-only
    //     diagnostics introduced by CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1.
    const allowedPrefixes = [
      join(SRC, 'modules/businesses/services'),
      join(SRC, 'modules/identity/services/diagnostics'),
    ];
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      if (allowedPrefixes.some((p) => f.startsWith(p))) continue;
      const c = readFileSync(f, 'utf8');
      if (DIRECT_RE.test(c)) offenders.push(f.replace(ROOT + '/', ''));
    }
    expect(offenders).toEqual([]);
  });
});