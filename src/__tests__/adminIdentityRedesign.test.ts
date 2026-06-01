/**
 * ADMIN-IDENTITY-REDESIGN-1 (refreshed for the hub-style IA)
 *
 * AdminIdentity was rewritten from a tab-based page (Overview / Users /
 * Businesses / Diagnostics / Activity tabs) to a navigation hub that
 * surfaces combined KPIs, unified search, a management grid linking to
 * the dedicated standalone admin pages, and recent activity. The old
 * tab assertions are no longer applicable; tests now lock in the hub
 * structure plus the privacy / safety invariants that still apply.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = resolve('src/pages/admin/AdminIdentity.tsx');
const BIZ = resolve('src/pages/admin/AdminBusinesses.tsx');

const src = readFileSync(PAGE, 'utf8');
const bizSrc = readFileSync(BIZ, 'utf8');

describe('ADMIN-IDENTITY-REDESIGN-1 page header & subtitle', () => {
  it('renders the bilingual title', () => {
    expect(src).toContain('المستخدمون والمنشآت');
    expect(src).toContain('Users & Businesses');
  });
  it('renders an overview subtitle mentioning stats and dedicated pages', () => {
    expect(src).toMatch(/نظرة شاملة[\s\S]*الإدارة التفصيلية|للإدارة التفصيلية/);
    expect(src).toMatch(/consolidated stats overview[\s\S]*dedicated pages/i);
  });
  it('uses noindex meta and admin-only shell (DashboardLayout + useNoIndex)', () => {
    expect(src).toContain('useNoIndex');
    expect(src).toContain('<DashboardLayout>');
    expect(src).toMatch(/noindex:\s*true/);
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 header quick actions', () => {
  it('exposes a New business CTA linking to /admin/businesses', () => {
    expect(src).toContain('منشأة جديدة');
    expect(src).toContain('New business');
    expect(src).toMatch(/to=["']\/admin\/businesses["']/);
  });
  it('exposes a New user CTA linking to /admin/users', () => {
    expect(src).toContain('مستخدم جديد');
    expect(src).toContain('New user');
    expect(src).toMatch(/to=["']\/admin\/users\?create=individual["']/);
  });
  it('exposes a Refresh action wired to invalidateQueries for identity caches', () => {
    expect(src).toMatch(/refreshAll/);
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['identity-profiles'\]/);
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['identity-businesses'\]/);
    expect(src).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['identity-activity'\]/);
  });
  it('exposes the ⌘K command palette trigger', () => {
    expect(src).toContain('IdentityCommandPalette');
    expect(src).toMatch(/setPaletteOpen\(true\)/);
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

describe('ADMIN-IDENTITY-REDESIGN-1 management navigation hub', () => {
  it('links to the dedicated standalone admin destinations (no embedded CRUD)', () => {
    for (const route of [
      '/admin/users',
      '/admin/businesses',
      '/admin/provider-review',
      '/admin/entity-access-requests',
      '/admin/access-management',
      '/admin/memberships',
      '/admin/provider-analytics',
      '/admin/locations',
    ]) {
      expect(src).toContain(`to: '${route}'`);
    }
  });
  it('renders IdentityActivityFeed and IdentitySignupsChart on the overview', () => {
    expect(src).toMatch(/<IdentitySignupsChart\b/);
    expect(src).toMatch(/<IdentityActivityFeed\s+isRTL=\{isRTL\}\s+limit=\{15\}/);
  });
  it('redirects legacy ?view=… deep links to the standalone pages', () => {
    expect(src).toContain('VIEW_REDIRECTS');
    expect(src).toMatch(/users:\s*['"]\/admin\/users['"]/);
    expect(src).toMatch(/businesses:\s*['"]\/admin\/businesses['"]/);
    expect(src).toMatch(/'provider-review':\s*['"]\/admin\/provider-review['"]/);
    expect(src).toMatch(/<Navigate\s+to=/);
  });
});

describe('ADMIN-IDENTITY-REDESIGN-1 privacy & safety invariants', () => {
  it('uses maskEmail when displaying emails to non-super admins', () => {
    expect(src).toMatch(/maskEmail\(p\.email[^)]*\)/);
    expect(src).toMatch(/isSuperAdmin\s*\?\s*p\.email\s*:\s*maskEmail/);
  });
  it('imports the masking helpers (kept for hub previews)', () => {
    expect(src).toMatch(/from '@\/lib\/masking'/);
    expect(src).toMatch(/\bmaskEmail\b/);
    expect(src).toMatch(/\bmaskPhone\b/);
  });
  it('never invokes auth.users mutation APIs from this page', () => {
    expect(src).not.toMatch(/admin\.auth\.admin\./);
    expect(src).not.toMatch(/supabase\.auth\.admin\./);
    expect(src).not.toMatch(/from\(['"]auth\.users['"]\)/);
  });
  it('does not import payment / membership / contract modules', () => {
    expect(src).not.toMatch(/from\s+['"]@\/modules\/payments/);
    expect(src).not.toMatch(/from\s+['"]@\/modules\/contracts/);
    expect(src).not.toMatch(/from\s+['"]@\/modules\/memberships/);
  });
  it('does not render synthetic emails (e.g. user_id@local)', () => {
    expect(src).not.toMatch(/@local\b/);
    expect(src).not.toMatch(/synthetic/i);
  });
  it('reads identity data only through canonical wrappers (no direct supabase.from)', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).toMatch(/listProfiles\b/);
    expect(src).toMatch(/listAdminBusinesses\b/);
    expect(src).toMatch(/listAllUserRoles\b/);
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
