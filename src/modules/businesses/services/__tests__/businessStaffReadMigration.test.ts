import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '../../../../..', rel), 'utf-8');

describe('BS-2: business_staff read migration', () => {
  it('Membership.tsx uses listManagedStaffMembershipForUser (no direct business_staff read)', () => {
    const src = read('src/pages/Membership.tsx');
    expect(src).toContain('listManagedStaffMembershipForUser');
    expect(src).toContain(
      "select: 'business_id, role, businesses:business_id(id, ref_id, membership_tier, name_ar, name_en, approval_status, onboarding_completion, approval_notes)'",
    );
    expect(src).toContain('limit: 1');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
    expect(src).toContain("queryKey: ['my-business-membership'");
  });

  it('DashboardContractAnalytics.tsx uses listManagedStaffMembershipForUser', () => {
    const src = read('src/pages/dashboard/DashboardContractAnalytics.tsx');
    expect(src).toContain('listManagedStaffMembershipForUser');
    expect(src).toContain(
      "select: 'business_id, role, businesses:business_id(id, name_ar, name_en)'",
    );
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
    expect(src).toContain("queryKey: ['my-managed-businesses', user?.id]");
  });

  it('PublicSiteScan.tsx uses listActiveStaffBusinessesForUser', () => {
    const src = read('src/pages/PublicSiteScan.tsx');
    expect(src).toContain('listActiveStaffBusinessesForUser');
    expect(src).toContain("select: 'business_id, businesses(id, name_ar, name_en)'");
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('DashboardBadge.tsx uses listActiveStaffBusinessesForUser for staff ids', () => {
    const src = read('src/pages/dashboard/DashboardBadge.tsx');
    expect(src).toContain('listActiveStaffBusinessesForUser<{ business_id: string }>');
    expect(src).toContain("select: 'business_id'");
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('DashboardPrivateSectors.tsx uses listActiveStaffBusinessesForUser and preserves throw-on-error', () => {
    const src = read('src/pages/dashboard/DashboardPrivateSectors.tsx');
    expect(src).toContain('listActiveStaffBusinessesForUser');
    expect(src).toContain(
      "select: 'business_id, businesses:business_id(id, name_ar, name_en)'",
    );
    expect(src).toContain('if (staff.error) throw staff.error;');
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('ActiveBusinessSwitcher.tsx uses listActiveStaffBusinessesForUser and preserves merge/dedup', () => {
    const src = read('src/components/dashboard/ActiveBusinessSwitcher.tsx');
    expect(src).toContain('listActiveStaffBusinessesForUser');
    expect(src).toContain(
      "select: 'business_id, businesses:business_id(id, name_ar, name_en)'",
    );
    expect(src).toContain("if (b && !out.has(b.id)) out.set(b.id, { ...b, source: 'staff' });");
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('AdminUsers.tsx admin read uses listAllBusinessStaffForAdmin (CRUD migrated in BS-3)', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toContain('listAllBusinessStaffForAdmin');
    expect(src).toContain("select: 'id, business_id, user_id, role, is_active'");
    // No direct business_staff access anywhere post-BS-3.
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('RepresentativesSection no longer accesses business_staff table directly (BS-3 migrated)', () => {
    const src = read('src/components/dashboard/business-edit/RepresentativesSection.tsx');
    expect(src).not.toMatch(/\.from\(['"]business_staff['"]\)/);
  });
});