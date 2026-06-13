/**
 * Phase 7E — AdminMemberships tabs extraction guards.
 *
 * Asserts the 5 new section components exist, contain no Supabase/queries/
 * mutations/RPCs, no hardcoded hex colors and no any/ts-ignore suppressions,
 * and that AdminMemberships.tsx actually adopts them.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SECTIONS_DIR = path.resolve(__dirname, '../components/admin/memberships/sections');
const ADMIN_DIR = path.resolve(__dirname, '../pages/admin');
const APP_TSX = path.resolve(__dirname, '../App.tsx');

const NEW_FILES = [
  'MembershipOverviewSection.tsx',
  'MembershipPlansSection.tsx',
  'MembershipSubscriptionsSection.tsx',
  'MembershipBusinessLinksSection.tsx',
  'MembershipUsageReportSection.tsx',
];

const readSection = (file: string) =>
  fs.readFileSync(path.join(SECTIONS_DIR, file), 'utf8');
const adminMembershipsSrc = () =>
  fs.readFileSync(path.join(ADMIN_DIR, 'AdminMemberships.tsx'), 'utf8');

describe('Phase 7E — admin memberships tabs extraction', () => {
  it('all 5 section files exist', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(SECTIONS_DIR, f)), `${f} missing`).toBe(true);
    }
    expect(fs.existsSync(path.join(SECTIONS_DIR, 'index.ts'))).toBe(true);
  });

  it('barrel re-exports the 5 sections', () => {
    const barrel = fs.readFileSync(path.join(SECTIONS_DIR, 'index.ts'), 'utf8');
    for (const sym of [
      'MembershipOverviewSection',
      'MembershipPlansSection',
      'MembershipSubscriptionsSection',
      'MembershipBusinessLinksSection',
      'MembershipUsageReportSection',
    ]) {
      expect(barrel).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('AdminMemberships.tsx adopts every new section', () => {
    const src = adminMembershipsSrc();
    for (const sym of [
      '<MembershipOverviewSection',
      '<MembershipPlansSection',
      '<MembershipSubscriptionsSection',
      '<MembershipBusinessLinksSection',
      '<MembershipUsageReportSection',
    ]) {
      expect(src.includes(sym), `AdminMemberships.tsx missing ${sym}`).toBe(true);
    }
  });

  it('sections never import Supabase, modules, service helpers or notifications', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/memberships',
      '@/modules/credits',
      '@/modules/notifications',
      '@/services',
      'businessService',
    ];
    for (const f of NEW_FILES) {
      const src = readSection(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('sections contain no queries, mutations or RPC/payment helpers', () => {
    const banned = [
      'useQuery',
      'useMutation',
      'useQueryClient',
      '.rpc(',
      '.from(',
      'cancelSubscription',
      'adminUpgradeSubscription',
      'subscribeToPlan',
      'insertMembershipPlan',
      'updateMembershipPlanById',
      'adminListMembershipUsage',
      'listAdminMembershipPlans',
      'listAdminMembershipSubscriptions',
      'adminAdjustProviderCredits',
      'updateProviderSubscriptionById',
      'markMembershipPaidManually',
      'sendTransactionalEmail',
    ];
    for (const f of NEW_FILES) {
      const src = readSection(f);
      for (const m of banned) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
    }
  });

  it('sections contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      expect(hex.test(readSection(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('sections contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = readSection(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('AdminMemberships.tsx still owns all sensitive mutations & queries', () => {
    const src = adminMembershipsSrc();
    for (const sym of [
      'cancelSubscription',
      'adminUpgradeSubscription',
      'subscribeToPlan',
      'insertMembershipPlan',
      'updateMembershipPlanById',
      'adminListMembershipUsage',
      'listAdminMembershipPlans',
      'listAdminMembershipSubscriptions',
      'useMutation',
      'useQuery',
    ]) {
      expect(src.includes(sym), `AdminMemberships.tsx must still own ${sym}`).toBe(true);
    }
  });

  it('membership-tiers and membership-limits libs are untouched by sections (no edits to them required)', () => {
    // Sections may READ helpers from these libs but must not redefine TIERS/limit fields.
    for (const f of NEW_FILES) {
      const src = readSection(f);
      expect(src.includes("export const TIERS"), `${f} must not redefine TIERS`).toBe(false);
      expect(src.includes("export const LIMIT_FIELDS"), `${f} must not redefine LIMIT_FIELDS`).toBe(false);
    }
  });

  it('legacy redirects still exist in App.tsx', () => {
    const src = fs.readFileSync(APP_TSX, 'utf8');
    expect(src.includes('<Navigate')).toBe(true);
  });

  it('AdminMemberships.tsx is meaningfully smaller (< 700 lines)', () => {
    const src = adminMembershipsSrc();
    const lineCount = src.split('\n').length;
    expect(lineCount, `AdminMemberships.tsx line count = ${lineCount}`).toBeLessThan(700);
  });
});