/**
 * Phase 7D — Membership details drawer + subscription lifecycle card guards.
 *
 * Locks the read-only contract of the new drawer/lifecycle primitives and
 * verifies no payment/subscription logic, mutations, queries, RPCs, or
 * Supabase imports leaked into them.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/memberships/shared');
const PAGES_DIR = path.resolve(__dirname, '../pages/admin');
const APP_TSX = path.resolve(__dirname, '../App.tsx');

const NEW_FILES = [
  'MembershipDetailsDrawer.tsx',
  'SubscriptionLifecycleCard.tsx',
  'buildMembershipDetailsDrawerProps.tsx',
];

const read = (file: string) => fs.readFileSync(path.join(SHARED_DIR, file), 'utf8');
const readPage = (file: string) => fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');

describe('Phase 7D — drawer + lifecycle primitives', () => {
  it('all new files exist on disk', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f)), `${f} missing`).toBe(true);
    }
  });

  it('barrel re-exports the new primitives', () => {
    const src = fs.readFileSync(path.join(SHARED_DIR, 'index.ts'), 'utf8');
    for (const sym of [
      'MembershipDetailsDrawer',
      'SubscriptionLifecycleCard',
      'buildProviderSubscriptionDrawerProps',
      'buildRejectionDrawerProps',
    ]) {
      expect(src).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('new primitives never import Supabase, modules, or service helpers', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/memberships',
      '@/modules/credits',
      '@/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = read(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new primitives never call payment / subscription mutations or RPCs', () => {
    const banned = [
      'markMembershipPaidManually',
      'markMembershipRefundedManually',
      'reconcileMembershipPaymentStatus',
      'refundMembershipPaymentIntent',
      'cancelSubscription',
      'adminUpgradeSubscription',
      'subscribeToPlan',
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
      'useMutation',
      'useQuery',
      '.rpc(',
      '.from(',
    ];
    for (const f of NEW_FILES) {
      const src = read(f);
      for (const m of banned) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
    }
  });

  it('new primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      expect(hex.test(read(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('new primitives contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = read(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('ManageSub in AdminProviderSubscriptions still owns its sensitive mutations', () => {
    const src = readPage('AdminProviderSubscriptions.tsx');
    expect(src.includes('const ManageSub')).toBe(true);
    for (const m of [
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
    ]) {
      expect(src.includes(m), `${m} must remain in AdminProviderSubscriptions`).toBe(true);
    }
    expect(src.includes('MembershipDetailsDrawer')).toBe(true);
  });

  it('CSV export in AdminMembershipRejections is unchanged', () => {
    const src = readPage('AdminMembershipRejections.tsx');
    expect(src.includes('exportCsv')).toBe(true);
    expect(src.includes('membership-rejections-')).toBe(true);
    expect(src.includes('\\ufeff')).toBe(true);
    expect(src.includes('queryMembershipUpgradeRejections')).toBe(true);
    expect(src.includes('MembershipDetailsDrawer')).toBe(true);
  });

  it('legacy redirects still exist in App.tsx', () => {
    const src = fs.readFileSync(APP_TSX, 'utf8');
    expect(src.includes('<Navigate')).toBe(true);
  });
});