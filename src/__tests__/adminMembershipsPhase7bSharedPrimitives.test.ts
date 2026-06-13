/**
 * Phase 7B — Memberships / Finance shared primitives guard.
 *
 * Locks in the presentational contract for the new shared admin memberships
 * primitives and ensures none of them reach into Supabase, payment mutations,
 * or the membership tier source of truth.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/memberships/shared');

const COMPONENT_FILES = [
  'MembershipStatusBadge.tsx',
  'PaymentStatusBadge.tsx',
  'WebhookEventStatusBadge.tsx',
  'RejectionReasonBadge.tsx',
  'TierChip.tsx',
  'MembershipStatsStrip.tsx',
  'index.ts',
];

function read(file: string): string {
  return fs.readFileSync(path.join(SHARED_DIR, file), 'utf8');
}

describe('Phase 7B — shared admin memberships primitives', () => {
  it('all six primitives and the barrel exist on disk', () => {
    for (const f of COMPONENT_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
  });

  it('barrel exports every primitive by name', () => {
    const src = read('index.ts');
    for (const sym of [
      'MembershipStatusBadge',
      'PaymentStatusBadge',
      'WebhookEventStatusBadge',
      'RejectionReasonBadge',
      'TierChip',
      'MembershipStatsStrip',
    ]) {
      expect(src).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('shared primitives never import Supabase, modules, or service helpers', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/memberships',
      '@/modules/credits',
      '@/services',
      'businessService',
    ];
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('shared primitives never reach into membership-tiers or membership-limits source of truth', () => {
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      expect(src.includes('membership-tiers')).toBe(false);
      expect(src.includes('membership-limits')).toBe(false);
    }
  });

  it('shared primitives never invoke payment / subscription mutations', () => {
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
    ];
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const m of mutations) {
        expect(src.includes(m), `${f} must not reference ${m}`).toBe(false);
      }
    }
  });

  it('shared primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of COMPONENT_FILES) {
      expect(hex.test(read(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('shared primitives contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('does not delete legacy redirect routes', () => {
    const appTsx = fs.readFileSync(
      path.resolve(__dirname, '../App.tsx'),
      'utf8',
    );
    expect(appTsx.includes('<Navigate')).toBe(true);
  });

  it('lib/membership-tiers and lib/membership-limits remain intact on disk', () => {
    const libDir = path.resolve(__dirname, '../lib');
    expect(fs.existsSync(path.join(libDir, 'membership-tiers.ts'))).toBe(true);
    expect(fs.existsSync(path.join(libDir, 'membership-limits.ts'))).toBe(true);
  });
});