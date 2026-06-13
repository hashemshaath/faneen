/**
 * Phase 7C — Memberships / Finance PageShell + FiltersBar guards.
 *
 * Asserts that the new shared admin memberships layout primitives stay
 * presentational: no Supabase, no queries, no mutations, no `any` /
 * suppressions, no hex colors, and no impact on the membership tier source
 * of truth or legacy redirects.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/memberships/shared');
const PAGES_DIR = path.resolve(__dirname, '../pages/admin');

const NEW_FILES = [
  'MembershipFinancePageShell.tsx',
  'MembershipFiltersBar.tsx',
];

const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), 'utf8');

describe('Phase 7C — admin memberships shell + filters', () => {
  it('both new presentational primitives exist on disk', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
  });

  it('barrel re-exports the new primitives', () => {
    const src = read(SHARED_DIR, 'index.ts');
    expect(src).toMatch(/\bMembershipFinancePageShell\b/);
    expect(src).toMatch(/\bMembershipFiltersBar\b/);
  });

  it('new primitives never import Supabase, modules, or service helpers', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/memberships',
      '@/modules/credits',
      '@tanstack/react-query',
      '@/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = read(SHARED_DIR, f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new primitives never reach into membership-tiers or membership-limits source of truth', () => {
    for (const f of NEW_FILES) {
      const src = read(SHARED_DIR, f);
      expect(/from\s+['"][^'"]*membership-tiers['"]/.test(src)).toBe(false);
      expect(/from\s+['"][^'"]*membership-limits['"]/.test(src)).toBe(false);
    }
  });

  it('new primitives never invoke payment / subscription RPCs or mutations', () => {
    const mutations = [
      'markMembershipPaidManually',
      'markMembershipRefundedManually',
      'reconcileMembershipPaymentStatus',
      'refundMembershipPaymentIntent',
      'cancelSubscription',
      'adminUpgradeSubscription',
      'subscribeToPlan',
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
      'consume_provider_lead_credit',
      'grant_monthly_provider_credit',
      'admin_adjust_provider_credits',
    ];
    for (const f of NEW_FILES) {
      const src = read(SHARED_DIR, f);
      for (const m of mutations) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
    }
  });

  it('new primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      expect(hex.test(read(SHARED_DIR, f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('new primitives contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = read(SHARED_DIR, f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('AdminMembershipRejections uses the new Shell + FiltersBar', () => {
    const src = read(PAGES_DIR, 'AdminMembershipRejections.tsx');
    expect(src).toMatch(/MembershipFinancePageShell/);
    expect(src).toMatch(/MembershipFiltersBar/);
  });

  it('AdminProviderSubscriptions uses the new Shell', () => {
    const src = read(PAGES_DIR, 'AdminProviderSubscriptions.tsx');
    expect(src).toMatch(/MembershipFinancePageShell/);
  });

  it('legacy redirects in App.tsx are still in place', () => {
    const appTsx = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
    expect(appTsx.includes('<Navigate')).toBe(true);
  });

  it('lib/membership-tiers and lib/membership-limits remain intact on disk', () => {
    const libDir = path.resolve(__dirname, '../lib');
    expect(fs.existsSync(path.join(libDir, 'membership-tiers.ts'))).toBe(true);
    expect(fs.existsSync(path.join(libDir, 'membership-limits.ts'))).toBe(true);
  });

  it('payment/subscription RPCs remain reachable in their original modules (not moved)', () => {
    const memberships = path.resolve(__dirname, '../modules/memberships');
    const credits = path.resolve(__dirname, '../modules/credits');
    expect(fs.existsSync(memberships)).toBe(true);
    expect(fs.existsSync(credits)).toBe(true);
  });
});