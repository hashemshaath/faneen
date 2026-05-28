import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = resolve('src/pages/admin/AdminIdentity.tsx');
const BIZ = resolve('src/pages/admin/AdminBusinesses.tsx');

const src = readFileSync(PAGE, 'utf8');
const bizSrc = readFileSync(BIZ, 'utf8');

describe('ADMIN-IDENTITY-REDESIGN-1 page header & subtitle', () => {
  it('renders the new bilingual title', () => {
    expect(src).toContain('مركز الهوية والكيانات');
    expect(src).toContain('Identity & Entities Center');
  });
  it('renders a subtitle mentioning users, businesses, ownership, diagnostics', () => {
    expect(src).toContain('المستخدمين');
    expect(src).toContain('المنشآت');
    expect(src).toContain('الملكية');
    expect(src).toContain('تشخيصات');
    expect(src).toMatch(/users.*businesses.*ownership.*identity diagnostics/i);
  });
  it('uses noindex meta and admin-only shell (DashboardLayout + useNoIndex)', () => {
    expect(src).toContain('useNoIndex');
    expect(src).toContain('<DashboardLayout>');
    expect(src).toMatch(/noindex:\s*true/);
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 header quick actions', () => {
  it('exposes Add business CTA', () => {
    expect(src).toContain('منشأة جديدة');
    expect(src).toContain('New business');
  });
  it('exposes Add / invite owner CTA', () => {
    expect(src).toContain('دعوة مالك');
    expect(src).toContain('Invite owner');
  });
  it('exposes a Refresh action wired to invalidateQueries', () => {
    expect(src).toMatch(/refreshDiagnostics/);
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['identity-profiles'\]/);
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['identity-businesses'\]/);
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 KPI strip', () => {
  it('shows total users / businesses / verified / pending KPIs', () => {
    expect(src).toContain('إجمالي الحسابات');
    expect(src).toContain('Total accounts');
    expect(src).toContain('المنشآت المسجّلة');
    expect(src).toContain('Registered businesses');
    expect(src).toContain('منشآت موثّقة');
    expect(src).toContain('Verified');
    expect(src).toContain('بانتظار المراجعة');
    expect(src).toContain('Pending review');
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 tabs', () => {
  it('has Overview / Users / Businesses / Diagnostics / Activity tabs', () => {
    expect(src).toContain('value="overview"');
    expect(src).toContain('value="users"');
    expect(src).toContain('value="businesses"');
    expect(src).toContain('value="integrity"'); // URL key retained
    expect(src).toContain('value="activity"');
  });
  it('Diagnostics tab is labeled "Diagnostics" / "التشخيصات"', () => {
    expect(src).toContain('التشخيصات');
    expect(src).toContain('Diagnostics');
  });
  it('Activity tab renders IdentityActivityFeed with limit', () => {
    expect(src).toMatch(/<IdentityActivityFeed\s+isRTL=\{isRTL\}\s+limit=\{50\}/);
    expect(src).toContain('سجل نشاط الإدارة');
    expect(src).toContain('Admin activity log');
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 privacy & safety invariants', () => {
  it('uses maskEmail / maskPhone fallbacks for non-super admins', () => {
    expect(src).toMatch(/maskEmail\(p\.email[^)]*\)/);
    expect(src).toMatch(/maskPhone\(p\.phone[^)]*\)/);
  });
  it('never invokes auth.users mutation APIs from this page', () => {
    expect(src).not.toMatch(/admin\.auth\.admin\./);
    expect(src).not.toMatch(/supabase\.auth\.admin\./);
    expect(src).not.toMatch(/from\(['"]auth\.users['"]\)/);
  });
  it('does not import payment / membership / contract modules', () => {
    expect(src).not.toMatch(/from\s+['"]@\/modules\/payments/);
    expect(src).not.toMatch(/from\s+['"]@\/modules\/contracts/);
    // memberships is referenced ONLY through user-management views; not imported here
    expect(src).not.toMatch(/from\s+['"]@\/modules\/memberships/);
  });
  it('does not render synthetic emails (e.g. user_id@local)', () => {
    expect(src).not.toMatch(/@local\b/);
    expect(src).not.toMatch(/synthetic/i);
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 business creation behavior preserved', () => {
  it('AdminBusinesses still exposes the three owner modes', () => {
    expect(bizSrc).toMatch(/id:\s*['"]existing['"]/);
    expect(bizSrc).toMatch(/id:\s*['"]new['"]/);
    expect(bizSrc).toMatch(/id:\s*['"]invite['"]/);
  });
  it('AdminBusinesses still routes mutation errors through mapAdminCreateBizError', () => {
    expect(bizSrc).toContain('mapAdminCreateBizError');
    expect(bizSrc).not.toMatch(/description:\s*err\.message/);
  });
  it('AdminBusinesses still passes account_manager_* fields via edge payload (no direct mutation here)', () => {
    expect(bizSrc).toContain('adminCreateBusinessWithOwner');
    expect(bizSrc).toContain('owner_full_name');
    expect(bizSrc).toContain('owner_position');
  });
});
