/**
 * DASHBOARD EXPERIENCE FINAL REGRESSION SWEEP — Phase A + B2 + B3 + B4.
 *
 * Source-level guards spanning all four dashboard phases. Verifies:
 *  - Role-correct actions in each dashboard view.
 *  - Provider readiness + visibility cards mounted.
 *  - Admin Soft Launch KPI strip mounted only in admin.
 *  - Shell/action/KPI components are purely presentational.
 *  - No DB / migrations / edge / RLS / RPC files were touched by these
 *    presentational components.
 *  - No suppressions / hex colors / dialogs in the touched components.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const USER_VIEW = 'src/pages/dashboard/overview/UserDashboardView.tsx';
const PROVIDER_VIEW = 'src/pages/dashboard/overview/ProviderDashboardView.tsx';
const ADMIN_VIEW = 'src/pages/dashboard/overview/AdminDashboardView.tsx';

const SHELL = 'src/components/dashboard/overview/RoleAwareDashboardShell.tsx';
const ACTION = 'src/components/dashboard/overview/DashboardActionCenter.tsx';
const HERO = 'src/components/dashboard/overview/UnifiedDashboardHero.tsx';
const KPI_GRID = 'src/components/dashboard/overview/UnifiedKpiGrid.tsx';
const STRIP = 'src/components/dashboard/overview/AdminSoftLaunchKpiStrip.tsx';
const VISIBILITY = 'src/components/dashboard/ProviderVisibilityStatusCard.tsx';

const PRESENTATIONAL = [SHELL, ACTION, HERO, KPI_GRID, STRIP, VISIBILITY];

const USER_SRC = read(USER_VIEW);
const PROVIDER_SRC = read(PROVIDER_VIEW);
const ADMIN_SRC = read(ADMIN_VIEW);

describe('Final sweep — role-correct actions', () => {
  it('User dashboard exposes user actions only', () => {
    expect(USER_SRC).toMatch(/role="user"/);
    expect(USER_SRC).toMatch(/اطلب عرض سعر/);
    expect(USER_SRC).toMatch(/استعرض المزودين/);
    expect(USER_SRC).not.toMatch(/role="admin"/);
    expect(USER_SRC).not.toMatch(/role="provider"/);
    expect(USER_SRC).not.toMatch(/مراجعة المزودين/);
    expect(USER_SRC).not.toMatch(/أكمل ملفك/);
    expect(USER_SRC).not.toMatch(/AdminSoftLaunchKpiStrip/);
  });

  it('Provider dashboard exposes provider actions only + readiness + visibility', () => {
    expect(PROVIDER_SRC).toMatch(/role="provider"/);
    expect(PROVIDER_SRC).toMatch(/أكمل ملفك/);
    expect(PROVIDER_SRC).toMatch(/أضف الخدمات والصور/);
    expect(PROVIDER_SRC).toMatch(/راجع حالة الظهور/);
    expect(PROVIDER_SRC).toMatch(/تابع طلبات العملاء/);
    expect(PROVIDER_SRC).toMatch(/حدّث مناطق الخدمة/);
    expect(PROVIDER_SRC).toMatch(/<ProviderReadinessCard\s*\/>/);
    expect(PROVIDER_SRC).toMatch(/<ProviderVisibilityStatusCard\s*\/>/);
    expect(PROVIDER_SRC).toMatch(/كلما اكتمل ملفك/);
    expect(PROVIDER_SRC).not.toMatch(/role="admin"/);
    expect(PROVIDER_SRC).not.toMatch(/role="user"/);
    expect(PROVIDER_SRC).not.toMatch(/مراجعة المزودين/);
    expect(PROVIDER_SRC).not.toMatch(/اطلب عرض سعر/);
    expect(PROVIDER_SRC).not.toMatch(/AdminSoftLaunchKpiStrip/);
  });

  it('Admin dashboard exposes admin actions only + Soft Launch KPI strip', () => {
    expect(ADMIN_SRC).toMatch(/role="admin"/);
    expect(ADMIN_SRC).toMatch(/راجع طلبات اليوم/);
    expect(ADMIN_SRC).toMatch(/مراجعة المزودين/);
    expect(ADMIN_SRC).toMatch(/راقب التشغيل/);
    expect(ADMIN_SRC).toMatch(/افتح مراكز الإدارة/);
    expect(ADMIN_SRC).toMatch(/<AdminSoftLaunchKpiStrip\b/);
    expect(ADMIN_SRC).not.toMatch(/role="user"/);
    expect(ADMIN_SRC).not.toMatch(/role="provider"/);
    expect(ADMIN_SRC).not.toMatch(/اطلب عرض سعر/);
    expect(ADMIN_SRC).not.toMatch(/أكمل ملفك/);
  });
});

describe('Final sweep — core widgets preserved', () => {
  it('User dashboard keeps Hero + KPI + customizable grid', () => {
    expect(USER_SRC).toMatch(/UnifiedDashboardHero/);
    expect(USER_SRC).toMatch(/UnifiedKpiGrid/);
    expect(USER_SRC).toMatch(/CustomizableGrid/);
  });
  it('Provider dashboard keeps Hero + stats + membership', () => {
    expect(PROVIDER_SRC).toMatch(/UnifiedDashboardHero/);
    expect(PROVIDER_SRC).toMatch(/ProviderStatsOverview/);
    expect(PROVIDER_SRC).toMatch(/ProviderMembershipCard/);
  });
  it('Admin dashboard keeps Hero + registry layout', () => {
    expect(ADMIN_SRC).toMatch(/UnifiedDashboardHero/);
    expect(ADMIN_SRC).toMatch(/useAdminDashboardLayout/);
  });
});

describe('Final sweep — presentational components stay pure', () => {
  it.each(PRESENTATIONAL)('%s exists', (file) => {
    expect(existsSync(join(ROOT, file))).toBe(true);
  });

  it.each(PRESENTATIONAL)('%s has no Supabase / modules / react-query / queries / mutations', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/@\/integrations\/supabase/);
    expect(src).not.toMatch(/from\s+['"]@\/modules\//);
    expect(src).not.toMatch(/@tanstack\/react-query/);
    expect(src).not.toMatch(/\buseQuery\b/);
    expect(src).not.toMatch(/\buseMutation\b/);
    expect(src).not.toMatch(/\bsupabase\./);
  });

  it.each(PRESENTATIONAL)('%s has no suppressions / dialogs / hex colors', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/@ts-ignore/);
    expect(src).not.toMatch(/@ts-expect-error/);
    expect(src).not.toMatch(/eslint-disable/);
    expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/dialog/);
    expect(src).not.toMatch(/<AlertDialog\b/);
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });
});

describe('Final sweep — role routing / gates untouched by presentational layer', () => {
  // Sanity: presentational components must NOT redeclare auth / role gates.
  it.each(PRESENTATIONAL)('%s does not redeclare auth/role gates', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/ProtectedRoute/);
    expect(src).not.toMatch(/<Route\b/);
    expect(src).not.toMatch(/requireAdmin/);
  });
});