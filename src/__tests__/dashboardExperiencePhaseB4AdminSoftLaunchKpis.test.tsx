/**
 * DASHBOARD EXPERIENCE PHASE B4 — Admin Soft Launch KPI strip guards.
 *
 * Static/source-level guards only. Verifies:
 *  - AdminDashboardView mounts the new strip.
 *  - The strip component is purely presentational (no Supabase / services /
 *    queries / mutations / hardcoded numeric data).
 *  - Required operational links are present.
 *  - The strip is NOT mounted in User/Provider dashboards.
 *  - Existing admin actions are preserved.
 *  - No dialogs / hex colors / any / ts-ignore / eslint-disable.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const STRIP_FILE = 'src/components/dashboard/overview/AdminSoftLaunchKpiStrip.tsx';
const ADMIN_VIEW = 'src/pages/dashboard/overview/AdminDashboardView.tsx';
const USER_VIEW = 'src/pages/dashboard/overview/UserDashboardView.tsx';
const PROVIDER_VIEW = 'src/pages/dashboard/overview/ProviderDashboardView.tsx';

const STRIP_SRC = read(STRIP_FILE);
const ADMIN_SRC = read(ADMIN_VIEW);
const USER_SRC = read(USER_VIEW);
const PROVIDER_SRC = read(PROVIDER_VIEW);

describe('Phase B4 — Admin Soft Launch KPI strip exists & is wired', () => {
  it('strip source file exists', () => {
    expect(existsSync(join(ROOT, STRIP_FILE))).toBe(true);
  });

  it('AdminDashboardView mounts AdminSoftLaunchKpiStrip', () => {
    expect(ADMIN_SRC).toMatch(/AdminSoftLaunchKpiStrip/);
    expect(ADMIN_SRC).toMatch(/<AdminSoftLaunchKpiStrip\b/);
  });

  it('strip contains the required operational links', () => {
    expect(ADMIN_SRC).toMatch(/'\/admin\/quote-requests'/);
    expect(ADMIN_SRC).toMatch(/'\/admin\/operations'/);
    expect(ADMIN_SRC).toMatch(/'\/admin\/provider-review'/);
    expect(ADMIN_SRC).toMatch(/'\/admin\/activity-log'/);
  });

  it('default strip ships the same operational links', () => {
    expect(STRIP_SRC).toMatch(/\/admin\/quote-requests/);
    expect(STRIP_SRC).toMatch(/\/admin\/operations/);
    expect(STRIP_SRC).toMatch(/\/admin\/provider-review/);
    expect(STRIP_SRC).toMatch(/\/admin\/activity-log/);
  });
});

describe('Phase B4 — Strip is purely presentational', () => {
  it('does not import Supabase / services / react-query', () => {
    expect(STRIP_SRC).not.toMatch(/@\/integrations\/supabase/);
    expect(STRIP_SRC).not.toMatch(/from\s+['"]@\/modules\//);
    expect(STRIP_SRC).not.toMatch(/@tanstack\/react-query/);
    expect(STRIP_SRC).not.toMatch(/\buseQuery\b/);
    expect(STRIP_SRC).not.toMatch(/\buseMutation\b/);
    expect(STRIP_SRC).not.toMatch(/\bsupabase\./);
  });

  it('does not embed fabricated numeric KPI data', () => {
    // Allowed digits: tailwind class numbers (w-3.5, p-3, gap-2, grid-cols-2, etc.)
    // Forbid bare numeric literals like `value: 42` / `count: 17` that would
    // imply fake KPI data inside the strip source.
    expect(STRIP_SRC).not.toMatch(/value:\s*\d+/);
    expect(STRIP_SRC).not.toMatch(/count:\s*\d+/);
  });
});

describe('Phase B4 — Strip is admin-only', () => {
  it('is NOT mounted in UserDashboardView', () => {
    expect(USER_SRC).not.toMatch(/AdminSoftLaunchKpiStrip/);
  });
  it('is NOT mounted in ProviderDashboardView', () => {
    expect(PROVIDER_SRC).not.toMatch(/AdminSoftLaunchKpiStrip/);
  });
});

describe('Phase B4 — Admin actions and protected surfaces preserved', () => {
  it('Admin action center actions are still present', () => {
    expect(ADMIN_SRC).toMatch(/راجع طلبات اليوم/);
    expect(ADMIN_SRC).toMatch(/مراجعة المزودين/);
    expect(ADMIN_SRC).toMatch(/راقب التشغيل/);
    expect(ADMIN_SRC).toMatch(/افتح مراكز الإدارة/);
  });

  it('Admin navigation / route file is untouched at the strip level', () => {
    // Sentinel: B4 must not edit App.tsx routes. We only assert the strip
    // file itself doesn't try to declare routes.
    expect(STRIP_SRC).not.toMatch(/<Route\b/);
    expect(STRIP_SRC).not.toMatch(/ProtectedRoute/);
  });
});

describe('Phase B4 — Forbidden patterns', () => {
  it.each([STRIP_FILE, ADMIN_VIEW])(
    '%s contains no any / ts-ignore / ts-expect-error / eslint-disable / dialogs',
    (file) => {
      const src = read(file);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/dialog/);
      expect(src).not.toMatch(/<AlertDialog\b/);
    },
  );

  it('strip has no hardcoded hex colors', () => {
    const hexes = STRIP_SRC.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });
});