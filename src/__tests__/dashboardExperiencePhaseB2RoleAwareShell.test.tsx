/**
 * DASHBOARD EXPERIENCE PHASE B2 — Role-aware Dashboard Shell guards.
 *
 * Verifies:
 *  - The role-aware shell + action center exist as presentational components.
 *  - The shell does NOT import Supabase / services / queries / mutations.
 *  - The three dashboard views each render their own role-specific actions
 *    and do not leak actions from other roles.
 *  - The shell never introduces dialogs / popups.
 *  - No `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`,
 *    or hardcoded hex colors are added in the new files.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Send, FileText } from 'lucide-react';
import {
  RoleAwareDashboardShell,
} from '@/components/dashboard/overview/RoleAwareDashboardShell';
import {
  DashboardActionCenter,
  type DashboardAction,
} from '@/components/dashboard/overview/DashboardActionCenter';

const ROOT = process.cwd();
const SHELL_FILE = 'src/components/dashboard/overview/RoleAwareDashboardShell.tsx';
const ACTION_FILE = 'src/components/dashboard/overview/DashboardActionCenter.tsx';

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Phase B2 — RoleAwareDashboardShell exists & is presentational', () => {
  it('shell + action center source files exist', () => {
    expect(existsSync(join(ROOT, SHELL_FILE))).toBe(true);
    expect(existsSync(join(ROOT, ACTION_FILE))).toBe(true);
  });

  it.each([SHELL_FILE, ACTION_FILE])(
    '%s does not import Supabase, services, queries or mutations',
    (file) => {
      const src = read(file);
      expect(src).not.toMatch(/@\/integrations\/supabase/);
      expect(src).not.toMatch(/from\s+['"]@\/modules\//);
      expect(src).not.toMatch(/@tanstack\/react-query/);
      expect(src).not.toMatch(/\buseQuery\b/);
      expect(src).not.toMatch(/\buseMutation\b/);
      expect(src).not.toMatch(/supabase\./);
    },
  );

  it.each([SHELL_FILE, ACTION_FILE])(
    '%s contains no any / ts-ignore / ts-expect-error / eslint-disable / dialogs / hex colors',
    (file) => {
      const src = read(file);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/dialog/);
      expect(src).not.toMatch(/AlertDialog/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    },
  );
});

describe('Phase B2 — RoleAwareDashboardShell renders Hero + Actions + slots', () => {
  const actions: DashboardAction[] = [
    {
      id: 'request-quote',
      label: { ar: 'اطلب عرض سعر', en: 'Request a quote' },
      to: '/rfq/new',
      icon: Send,
      primary: true,
    },
    {
      id: 'my-requests',
      label: { ar: 'تابع طلباتك', en: 'Track requests' },
      to: '/dashboard/my-requests',
      icon: FileText,
    },
  ];

  it('exposes the shell with the right data-role and renders the action center', () => {
    render(
      <MemoryRouter>
        <RoleAwareDashboardShell
          role="user"
          hero={{
            isRTL: true,
            roleLabel: { ar: 'لوحة العميل', en: 'Client Dashboard' },
            onRefresh: () => {},
          }}
          actions={actions}
          kpiSlot={<div data-testid="kpi-slot" />}
        >
          <div data-testid="children-slot" />
        </RoleAwareDashboardShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('role-aware-dashboard-shell')).toHaveAttribute('data-role', 'user');
    expect(screen.getByTestId('dashboard-action-center-user')).toBeInTheDocument();
    expect(screen.getByText('اطلب عرض سعر')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-slot')).toBeInTheDocument();
    expect(screen.getByTestId('children-slot')).toBeInTheDocument();
  });

  it('DashboardActionCenter renders nothing when actions is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardActionCenter isRTL role="provider" actions={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('Phase B2 — Role-specific dashboard views inject correct actions only', () => {
  const USER_VIEW = read('src/pages/dashboard/overview/UserDashboardView.tsx');
  const PROVIDER_VIEW = read('src/pages/dashboard/overview/ProviderDashboardView.tsx');
  const ADMIN_VIEW = read('src/pages/dashboard/overview/AdminDashboardView.tsx');

  it('UserDashboardView mounts the action center with role="user" and client actions only', () => {
    expect(USER_VIEW).toMatch(/role="user"/);
    expect(USER_VIEW).toMatch(/اطلب عرض سعر/);
    expect(USER_VIEW).toMatch(/استعرض المزودين/);
    // must NOT carry admin/provider actions
    expect(USER_VIEW).not.toMatch(/role="admin"/);
    expect(USER_VIEW).not.toMatch(/role="provider"/);
    expect(USER_VIEW).not.toMatch(/مراجعة المزودين/);
    expect(USER_VIEW).not.toMatch(/أكمل ملفك/);
  });

  it('ProviderDashboardView mounts the action center with role="provider" and provider actions only', () => {
    expect(PROVIDER_VIEW).toMatch(/role="provider"/);
    expect(PROVIDER_VIEW).toMatch(/راجع حالة الظهور/);
    expect(PROVIDER_VIEW).toMatch(/تابع طلبات العملاء/);
    expect(PROVIDER_VIEW).not.toMatch(/role="admin"/);
    expect(PROVIDER_VIEW).not.toMatch(/role="user"/);
    expect(PROVIDER_VIEW).not.toMatch(/مراجعة المزودين/);
    expect(PROVIDER_VIEW).not.toMatch(/اطلب عرض سعر/);
  });

  it('AdminDashboardView mounts the action center with role="admin" and admin actions only', () => {
    expect(ADMIN_VIEW).toMatch(/role="admin"/);
    expect(ADMIN_VIEW).toMatch(/مراجعة المزودين/);
    expect(ADMIN_VIEW).toMatch(/افتح مراكز الإدارة/);
    expect(ADMIN_VIEW).not.toMatch(/role="user"/);
    expect(ADMIN_VIEW).not.toMatch(/role="provider"/);
    expect(ADMIN_VIEW).not.toMatch(/اطلب عرض سعر/);
    expect(ADMIN_VIEW).not.toMatch(/أكمل ملفك/);
  });

  it('existing core widgets are not deleted from the views', () => {
    expect(USER_VIEW).toMatch(/UnifiedDashboardHero/);
    expect(USER_VIEW).toMatch(/UnifiedKpiGrid/);
    expect(USER_VIEW).toMatch(/CustomizableGrid/);
    expect(PROVIDER_VIEW).toMatch(/UnifiedDashboardHero/);
    expect(PROVIDER_VIEW).toMatch(/ProviderReadinessCard/);
    expect(PROVIDER_VIEW).toMatch(/ProviderStatsOverview/);
    expect(PROVIDER_VIEW).toMatch(/ProviderMembershipCard/);
    expect(ADMIN_VIEW).toMatch(/UnifiedDashboardHero/);
    expect(ADMIN_VIEW).toMatch(/useAdminDashboardLayout/);
  });
});