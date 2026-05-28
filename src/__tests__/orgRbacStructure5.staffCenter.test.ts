/**
 * ORG-RBAC-STRUCTURE-5 — Staff Management Center.
 *
 * Source-level guardrails:
 *   - Route registered + protected.
 *   - Sidebar entry exists.
 *   - Page goes through governance wrappers only (no direct supabase.from).
 *   - No hard delete UI.
 *   - PermissionHint/useCan used for UI gating only.
 *   - No auth/payment/membership/notifications/cron/realtime imports.
 *
 * Plus runtime validation of the delegated-access limits helper
 * (30-day max + reason length).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateDelegatedAccessDraft,
  DELEGATED_ACCESS_MAX_DAYS,
  DELEGATED_ACCESS_REASON_MIN,
  DELEGATED_ACCESS_REASON_MAX,
} from '@/lib/governance/delegatedAccessLimits';
import { WORKSPACE_ROUTE_PERMISSIONS } from '@/modules/workspace/permissions/routePermissions';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const PAGE = 'src/pages/dashboard/DashboardStaffCenter.tsx';
const APP = 'src/App.tsx';
const SIDEBAR = 'src/components/dashboard/DashboardSidebar.tsx';

describe('ORG-RBAC-STRUCTURE-5 — routing & sidebar', () => {
  it('registers /dashboard/settings/staff behind ProtectedRoute', () => {
    const src = read(APP);
    expect(src).toMatch(/path="\/dashboard\/settings\/staff"[^>]*element=\{<ProtectedRoute>/);
    expect(src).toMatch(/DashboardStaffCenter/);
  });

  it('sidebar exposes a Staff & Teams entry pointing at the route', () => {
    const src = read(SIDEBAR);
    expect(src).toMatch(/\/dashboard\/settings\/staff/);
    expect(src).toMatch(/Staff & Teams/);
    expect(src).toMatch(/الموظفون والفرق/);
  });

  it('route appears in the workspace permission map under staff.view', () => {
    const entry = (WORKSPACE_ROUTE_PERMISSIONS as Record<string, { permissions: string[]; scope: string }>)[
      '/dashboard/settings/staff'
    ];
    expect(entry).toBeTruthy();
    expect(entry.permissions).toContain('staff.view');
    expect(entry.scope).toBe('entity');
  });
});

describe('ORG-RBAC-STRUCTURE-5 — page source guardrails', () => {
  const src = read(PAGE);

  it('uses governance + business-staff wrappers (no direct supabase.from)', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).toMatch(/from '@\/modules\/workspace\/governance'/);
    expect(src).toMatch(/listBusinessStaffByBusiness/);
    expect(src).toMatch(/listBusinessTeams/);
    expect(src).toMatch(/listDelegatedWorkspaceAccess/);
    expect(src).toMatch(/listStaffActivitySessions/);
  });

  it('uses useCan / PermissionHint for UI gating only', () => {
    expect(src).toMatch(/from '@\/hooks\/useCan'/);
    expect(src).toMatch(/from '@\/components\/workspace\/PermissionGate'/);
  });

  it('has no destructive delete affordances', () => {
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/deleteBusinessStaffById/);
    expect(src).not.toMatch(/<Trash2\b/);
  });

  it('does not import auth/payment/membership/notifications/cron/realtime modules', () => {
    const forbidden = [
      /from '@\/modules\/auth/,
      /from '@\/modules\/payments/,
      /from '@\/modules\/memberships/,
      /from '@\/modules\/notifications/,
      /from '@\/lib\/notifications/,
      /\.channel\(/, // realtime
      /supabase\.realtime/,
    ];
    for (const r of forbidden) expect(src).not.toMatch(r);
  });

  it('does not render synthetic identifiers (UUID/token/provider_intent_id/synthetic emails)', () => {
    expect(src).not.toMatch(/provider_intent_id/);
    expect(src).not.toMatch(/synthetic/i);
    expect(src).not.toMatch(/auth_email/);
  });

  it('never renders href="#"', () => {
    expect(src).not.toMatch(/href="#"/);
  });

  it('references STF / TEAM ref ids for display', () => {
    expect(src).toMatch(/ref_id/);
  });
});

describe('ORG-RBAC-STRUCTURE-5 — delegated access validation', () => {
  const baseStart = '2026-06-01T00:00:00.000Z';

  it('exposes the 30-day cap and reason length bounds', () => {
    expect(DELEGATED_ACCESS_MAX_DAYS).toBe(30);
    expect(DELEGATED_ACCESS_REASON_MIN).toBeGreaterThanOrEqual(5);
    expect(DELEGATED_ACCESS_REASON_MAX).toBeLessThanOrEqual(500);
  });

  it('accepts a draft within 30 days and a valid reason', () => {
    const end = new Date(Date.parse(baseStart) + 14 * 24 * 60 * 60 * 1000).toISOString();
    const r = validateDelegatedAccessDraft({ starts_at: baseStart, expires_at: end, reason: 'cover for ops lead' });
    expect(r.ok).toBe(true);
  });

  it('rejects a draft exceeding 30 days', () => {
    const end = new Date(Date.parse(baseStart) + 31 * 24 * 60 * 60 * 1000).toISOString();
    const r = validateDelegatedAccessDraft({ starts_at: baseStart, expires_at: end, reason: 'long enough reason' });
    expect(r.ok).toBe(false);
    expect(r.errors.expires_at).toBe('exceeds_max_duration');
  });

  it('rejects end <= start', () => {
    const r = validateDelegatedAccessDraft({ starts_at: baseStart, expires_at: baseStart, reason: 'valid reason text' });
    expect(r.errors.expires_at).toBe('before_start');
  });

  it('rejects too-short and too-long reasons', () => {
    const end = new Date(Date.parse(baseStart) + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      validateDelegatedAccessDraft({ starts_at: baseStart, expires_at: end, reason: 'no' }).errors.reason,
    ).toBe('too_short');
    expect(
      validateDelegatedAccessDraft({
        starts_at: baseStart, expires_at: end, reason: 'x'.repeat(DELEGATED_ACCESS_REASON_MAX + 1),
      }).errors.reason,
    ).toBe('too_long');
  });
});

describe('ORG-RBAC-STRUCTURE-5 — scoped business_staff wrapper', () => {
  it('exists and uses the business_staff table', () => {
    const src = read('src/modules/businesses/services/listBusinessStaffByBusiness.ts');
    expect(src).toMatch(/from\('business_staff'\)/);
    expect(src).toMatch(/eq\('business_id'/);
  });
});