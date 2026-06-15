/**
 * ADMIN UX RECONSOLIDATION PHASE 9 — Finance & Membership Center guard.
 *
 * Locks in the structural contract of the unified Finance Center:
 * required tabs exist, legacy routes still resolve, and the new
 * presentational pieces never reach into Supabase, queries, mutations,
 * or executive services.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HUB = path.join(ROOT, 'pages/admin/AdminFinanceCenter.tsx');
const CENTER_DIR = path.join(ROOT, 'components/admin/centers/finance');
const APP_TSX = path.join(ROOT, 'App.tsx');

const CENTER_FILES = [
  'FinanceOverviewLanding.tsx',
  'LifecycleJobsLanding.tsx',
];

const read = (p: string) => fs.readFileSync(p, 'utf8');
const hub = () => read(HUB);
const app = () => read(APP_TSX);
const center = (f: string) => read(path.join(CENTER_DIR, f));

describe('Phase 9 — Admin Finance & Membership Center', () => {
  it('1. /admin/finance is wired to AdminFinanceCenter and uses TabbedShell', () => {
    expect(app()).toMatch(/path="\/admin\/finance"\s+element=\{[^}]*AdminFinanceCenter/);
    expect(hub()).toMatch(/TabbedShell/);
  });

  it('2. Finance Center declares all required tabs', () => {
    const src = hub();
    for (const key of ['overview', 'memberships', 'subscriptions', 'payments', 'plans', 'lifecycle']) {
      expect(src, `missing tab key=${key}`).toMatch(new RegExp(`key:\\s*['"]${key}['"]`));
    }
  });

  it('3. Legacy finance / membership routes still exist (page or redirect)', () => {
    const src = app();
    for (const r of [
      '/admin/finance',
      '/admin/memberships',
      '/admin/membership-rejections',
      '/admin/membership-events',
      '/admin/membership-payments',
      '/admin/provider-subscriptions',
    ]) {
      expect(src.includes(`path="${r}"`), `route missing: ${r}`).toBe(true);
    }
  });

  it('4. No legacy finance route was deleted without a redirect', () => {
    const src = app();
    for (const r of ['/admin/membership-rejections', '/admin/membership-events', '/admin/membership-payments', '/admin/provider-subscriptions']) {
      expect(src.includes(`path="${r}"`), `route missing: ${r}`).toBe(true);
    }
  });

  it('5. Center landings never import Supabase', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(src.includes('@/integrations/supabase'), `${f} imports supabase`).toBe(false);
      expect(src.includes('supabase-js'), `${f} imports supabase-js`).toBe(false);
    }
  });

  it('6. Center landings contain no queries or mutations of their own', () => {
    // FinanceOverviewLanding is a pure tile grid; LifecycleJobsLanding only
    // embeds the existing MembershipLifecycleJobsPanel and adds no fetching
    // logic itself.
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const t of ['useQuery(', 'useMutation(', 'useInfiniteQuery(', '.from(', '.rpc(']) {
        expect(src.includes(t), `${f} contains ${t}`).toBe(false);
      }
    }
  });

  it('7. Center landings do not import executive finance services', () => {
    const forbidden = [
      '@/modules/memberships/services',
      '@/modules/credits',
      '@/modules/payments/services',
      'businessService',
      'adminCancelMembership',
      'adminDowngradeMembership',
      'adminUpgradeMembership',
    ];
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} imports ${needle}`).toBe(false);
      }
    }
  });

  it('8. Hub is presentational — no DB/RLS/RPC/edge wiring inside', () => {
    const src = hub();
    expect(src.includes('@/integrations/supabase')).toBe(false);
    expect(src.includes('supabase/migrations')).toBe(false);
    expect(src.includes('.rpc(')).toBe(false);
    expect(src.includes('supabase/functions')).toBe(false);
  });

  it('9-11. Lifecycle / cancel / downgrade / upgrade / credits behavior is untouched by hub & landings', () => {
    const all = [hub(), ...CENTER_FILES.map((f) => center(f))];
    for (const src of all) {
      for (const needle of [
        'cancel_at_period_end',
        'downgrade_membership',
        'upgrade_membership',
        'consume_provider_lead_credit',
        'grant_monthly_provider_credit',
        'admin_adjust_provider_credits',
        'provider_lead_credit_transactions',
      ]) {
        expect(src.includes(needle), `unexpected coupling: ${needle}`).toBe(false);
      }
    }
  });

  it('12. Public route surfaces are untouched by the center', () => {
    for (const src of [hub(), ...CENTER_FILES.map((f) => center(f))]) {
      expect(src.includes('/businesses/')).toBe(false);
      expect(src.includes('/sectors/')).toBe(false);
    }
  });

  it('13. No any/ts-ignore/ts-expect-error/eslint-disable in new files', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(/\bas\s+any\b/.test(src), `${f} as any`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} :any`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f}`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f}`).toBe(false);
      expect(src.includes('eslint-disable'), `${f}`).toBe(false);
    }
    const h = hub();
    expect(/\bas\s+any\b/.test(h)).toBe(false);
    expect(/:\s*any\b/.test(h)).toBe(false);
  });

  it('14. No hardcoded hex colors in new files', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of CENTER_FILES) {
      expect(hex.test(center(f)), `${f} contains hex color`).toBe(false);
    }
    expect(hex.test(hub())).toBe(false);
  });
});