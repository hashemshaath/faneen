/**
 * ADMIN SYSTEM SETTINGS UX CLARITY — guard tests.
 *
 * Verifies the System Access console exposes:
 *   1. five distinct module statuses with bilingual microcopy,
 *   2. dead modules (ai_assistant / ai_tools / documents) are surfaced
 *      as "not ready" and cannot be activated from the UI,
 *   3. modules with route aliases declare "has linked routes",
 *   4. the disable warning + the activation-blocked text are wired,
 *   5. no `any`, no `.skip(`, no placeholder labels.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  classifyModule,
  DEAD_MODULE_KEYS,
  MODULE_STATUS_LABELS,
  LINKED_ROUTES_BADGE,
  DISABLE_WARNING_TEXT,
  ACTIVATE_BLOCKED_TEXT,
  NO_PAGE_HINT_TEXT,
  isRealDashboardRoute,
  getLinkedRoutes,
  REGISTERED_DASHBOARD_ROUTES,
} from '@/modules/systemAccess/moduleStatus';
import type { SystemModule } from '@/modules/systemAccess';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const STATUS_SRC = read('src/modules/systemAccess/moduleStatus.ts');
const ADMIN_SRC = read('src/pages/admin/AdminSystemAccess.tsx');

const makeModule = (over: Partial<SystemModule>): SystemModule => ({
  id: 'id',
  key: 'sample',
  category: 'business',
  label_ar: 'عينة',
  label_en: 'Sample',
  description_ar: null,
  description_en: null,
  icon: null,
  route: '/dashboard/sample',
  is_core: false,
  default_enabled: true,
  default_account_types: ['provider'],
  sort_order: 100,
  is_active: true,
  ...over,
});

/* ──────────────────────────────────────────────────────────────────── */
/* 1. Five distinct statuses + bilingual microcopy                     */
/* ──────────────────────────────────────────────────────────────────── */
describe('Status microcopy is unambiguous and bilingual', () => {
  const required: Array<[keyof typeof MODULE_STATUS_LABELS, string, string]> = [
    ['active_with_page', 'نشط وله صفحة', 'Active with page'],
    ['disabled_by_admin', 'معطّل من الإدارة', 'Disabled by admin'],
    ['not_ready', 'غير جاهز — لا توجد صفحة مفعّلة بعد', 'Not ready — no active page yet'],
    ['hidden_by_permissions', 'مخفي بسبب الصلاحيات', 'Hidden by permissions'],
  ];

  it.each(required)('%s exposes Arabic + English copy', (key, ar, en) => {
    const l = MODULE_STATUS_LABELS[key];
    expect(l.ar).toBe(ar);
    expect(l.en).toBe(en);
  });

  it('does not surface vague "inactive" or placeholder copy', () => {
    for (const [, l] of Object.entries(MODULE_STATUS_LABELS)) {
      expect(l.ar.toLowerCase()).not.toMatch(/(placeholder|tbd|todo|wip)/);
      expect(l.en.toLowerCase()).not.toMatch(/(placeholder|tbd|todo|wip)/);
      // English "inactive" alone is too vague — we use "Not ready" instead.
      expect(l.en).not.toBe('Inactive');
      expect(l.ar).not.toBe('غير نشط');
    }
  });

  it('linked-routes + warning + activation-blocked + no-page-hint copy is set', () => {
    expect(LINKED_ROUTES_BADGE.ar).toBe('يملك أكثر من مسار مرتبط');
    expect(LINKED_ROUTES_BADGE.en).toBe('Has linked routes');
    expect(DISABLE_WARNING_TEXT.ar).toContain('سيخفيه من القائمة');
    expect(DISABLE_WARNING_TEXT.en).toContain('blocks direct route access');
    expect(ACTIVATE_BLOCKED_TEXT.ar).toContain('لا يمكن تفعيل');
    expect(ACTIVATE_BLOCKED_TEXT.en).toContain('Cannot activate');
    expect(NO_PAGE_HINT_TEXT.ar).toContain('لا تتوفر صفحة');
    expect(NO_PAGE_HINT_TEXT.en).toContain('No real page');
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* 2. classifyModule()                                                 */
/* ──────────────────────────────────────────────────────────────────── */
describe('classifyModule', () => {
  it('classifies a healthy active module as active_with_page', () => {
    const m = makeModule({ key: 'contracts', route: '/dashboard/contracts' });
    const r = classifyModule(m, { effectiveEnabled: true });
    expect(r.status).toBe('active_with_page');
    expect(r.canActivate).toBe(true);
    expect(r.hasRealRoute).toBe(true);
    expect(r.blockedReason).toBeNull();
  });

  it('classifies a disabled override as disabled_by_admin', () => {
    const m = makeModule({ key: 'contracts', route: '/dashboard/contracts' });
    const r = classifyModule(m, {
      effectiveEnabled: false,
      hasDisablingOverride: true,
    });
    expect(r.status).toBe('disabled_by_admin');
    expect(r.canActivate).toBe(true); // can be re-enabled
  });

  it.each(DEAD_MODULE_KEYS)('dead module %s is not_ready and cannot be activated', (key) => {
    const m = makeModule({ key, is_active: false, route: `/dashboard/${key}` });
    const r = classifyModule(m, { effectiveEnabled: false });
    expect(r.status).toBe('not_ready');
    expect(r.isDead).toBe(true);
    expect(r.canActivate).toBe(false);
    expect(r.blockedReason).toEqual(ACTIVATE_BLOCKED_TEXT);
  });

  it('inactive module with no real route is not_ready and cannot be activated', () => {
    const m = makeModule({ key: 'ghost', is_active: false, route: '/dashboard/ghost' });
    const r = classifyModule(m, { effectiveEnabled: false });
    expect(r.status).toBe('not_ready');
    expect(r.canActivate).toBe(false);
  });

  it('respects per-user permission gating', () => {
    const m = makeModule({ key: 'contracts', route: '/dashboard/contracts' });
    const r = classifyModule(m, {
      effectiveEnabled: true,
      hiddenByPermissions: true,
    });
    expect(r.status).toBe('hidden_by_permissions');
  });

  it('surfaces linked routes for aliased modules', () => {
    expect(getLinkedRoutes('payments')).toContain('/dashboard/installments');
    expect(getLinkedRoutes('credits')).toContain('/dashboard/provider/membership');
    expect(getLinkedRoutes('staff_management')).toContain('/dashboard/settings/staff');
    expect(getLinkedRoutes('activity_log')).toContain('/dashboard/operations/feed');
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* 3. Route reality check                                              */
/* ──────────────────────────────────────────────────────────────────── */
describe('isRealDashboardRoute', () => {
  it('accepts every registered route', () => {
    for (const r of REGISTERED_DASHBOARD_ROUTES) {
      expect(isRealDashboardRoute(r), `${r} must resolve`).toBe(true);
    }
  });

  it('accepts deep sub-paths under a registered parent', () => {
    expect(isRealDashboardRoute('/dashboard/sites/abc/print')).toBe(true);
  });

  it('rejects ghost routes', () => {
    expect(isRealDashboardRoute('/dashboard/ai')).toBe(false);
    expect(isRealDashboardRoute('/dashboard/ai-tools')).toBe(false);
    expect(isRealDashboardRoute('/dashboard/documents')).toBe(false);
    expect(isRealDashboardRoute(null)).toBe(false);
    expect(isRealDashboardRoute('')).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* 4. AdminSystemAccess.tsx wires the helper                            */
/* ──────────────────────────────────────────────────────────────────── */
describe('AdminSystemAccess wiring', () => {
  it('uses listAllSystemModules so not-ready entries appear', () => {
    expect(ADMIN_SRC).toMatch(/listAllSystemModules/);
    // The single-purpose listSystemModules (active only) must not be the
    // source for the admin console list.
    expect(ADMIN_SRC).not.toMatch(/queryFn:\s*listSystemModules/);
  });

  it('renders the status badge per row', () => {
    expect(ADMIN_SRC).toMatch(/data-testid=`system-module-status-/);
    expect(ADMIN_SRC).toMatch(/data-module-status=\{info\.status\}/);
  });

  it('blocks activation when canActivate is false', () => {
    expect(ADMIN_SRC).toMatch(/nextEnabled\s*&&\s*!canActivate/);
    expect(ADMIN_SRC).toMatch(/ACTIVATE_BLOCKED_TEXT/);
    // Switch is disabled when the module is off + cannot be activated.
    expect(ADMIN_SRC).toMatch(/!effective\s*&&\s*!info\.canActivate/);
  });

  it('surfaces the disable warning before flipping a module off', () => {
    expect(ADMIN_SRC).toMatch(/DISABLE_WARNING_TEXT/);
    expect(ADMIN_SRC).toMatch(/toast\.warning\(/);
  });

  it('renders the linked-routes badge and the list of aliases', () => {
    expect(ADMIN_SRC).toMatch(/LINKED_ROUTES_BADGE/);
    expect(ADMIN_SRC).toMatch(/info\.linkedRoutes\.map/);
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* 5. Source hygiene                                                   */
/* ──────────────────────────────────────────────────────────────────── */
describe('Source hygiene', () => {
  it('moduleStatus.ts has no `any`', () => {
    expect(STATUS_SRC).not.toMatch(/:\s*any\b/);
    expect(STATUS_SRC).not.toMatch(/<any>/);
  });

  it('no skipped tests in this suite', () => {
    const self = read('src/tests/adminSystemSettingsUxClarity.test.ts');
    expect(self).not.toMatch(/\.skip\(/);
    expect(self).not.toMatch(/it\.only\(/);
    expect(self).not.toMatch(/describe\.only\(/);
  });
});