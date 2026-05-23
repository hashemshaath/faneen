import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '../../../../..', rel), 'utf-8');

describe('BS-3: business_staff CRUD migration', () => {
  it('AdminUsers.tsx uses updateBusinessStaffById and deleteBusinessStaffById', () => {
    const src = read('src/pages/admin/AdminUsers.tsx');
    expect(src).toContain('updateBusinessStaffById');
    expect(src).toContain('deleteBusinessStaffById');
    expect(src).toContain('updateBusinessStaffById({ id: staffId, values: { role } })');
    expect(src).toContain('deleteBusinessStaffById({ id: staffId })');
    // Preserve error-throw behavior so React Query onError fires.
    expect(src).toMatch(/if \(error\) throw error;/);
    // Preserve query invalidation keys.
    expect(src).toContain("queryKey: ['admin-business-staff']");
    // No direct supabase.from('business_staff') remains.
    expect(src).not.toMatch(/supabase\s*\.\s*from\(['"]business_staff['"]\)/);
  });

  it('RepresentativesSection.tsx uses insertBusinessStaff/updateBusinessStaffById/deleteBusinessStaffById', () => {
    const src = read('src/components/dashboard/business-edit/RepresentativesSection.tsx');
    expect(src).toContain('insertBusinessStaff');
    expect(src).toContain('updateBusinessStaffById({ id, values: patch })');
    expect(src).toContain('deleteBusinessStaffById({ id: row.id })');
    // Exact insert payload fields preserved.
    expect(src).toContain('business_id: businessId');
    expect(src).toContain('user_id: profile.user_id');
    expect(src).toContain('role: newRole');
    expect(src).toContain('invited_by: user?.id ?? null');
    expect(src).toContain('is_active: true');
    // Preserve error checks (if (insertError) throw insertError; / if (error) throw error;).
    expect(src).toMatch(/if \(insertError\) throw insertError;/);
    // Preserve query invalidation key.
    expect(src).toContain("queryKey: ['business-staff', businessId]");
    // No direct .from('business_staff') remains for table access.
    expect(src).not.toMatch(/\.from\(['"]business_staff['"]\)/);
    // RPC for staff+profiles join remains (out of scope for this phase).
    expect(src).toContain('get_business_staff_with_profiles');
  });
});